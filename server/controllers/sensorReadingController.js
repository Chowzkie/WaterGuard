const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { evaluateSensorReading } = require('../utils/SensorLogic'); 
const { createSystemLogs } = require('../helpers/createSystemLogs'); 

/**
 * processReading
 * Main controller function for handling incoming sensor data.
 * Triggered by 'esp32_data' socket event.
 *
 * Responsibilities:
 * 1. Validate payload and identify device.
 * 2. Evaluate sensor readings against alert thresholds.
 * 3. Trigger valve automation (auto-shutoff or auto-open).
 * 4. Create/Update Alert documents.
 * 5. Update device 'latestReading', 'lastContact', and sensor statuses.
 * 6. Save updated device document.
 * 7. Emit socket events for frontend updates.
 */
exports.processReading = async (req, res) => {
  // Extract full reading payload and deviceId from request body
  const reading = req.body;
  const deviceId = reading.deviceId;

  // Basic payload validation
  if (!reading || !deviceId) {
    return res.status(400).json({ message: "Invalid sensor reading payload." });
  }

  try {
    // Find the Device 
    const device = await Device.findById(deviceId); 
    if (!device) {
      // Device not found; stop processing
      return res.status(404).json({ message: `Device with ID ${deviceId} not found.` });
    }

    // Get socket.io instance
    const io = req.app.get("io");
    
    // Evaluate Readings for Alerts 
    // Compares readings to configured thresholds; returns array of alert objects
    const evaluatedAlerts = evaluateSensorReading(reading, device.configurations);
    const actionsTaken = []; // Log of actions performed
    
    // =================================================================
    // AUTOMATION LOGIC BLOCK (SHUT-OFF & OPEN)
    // =================================================================

    // Get automation configurations
    const shutOffConfig = device.configurations.controls.valveShutOff;
    const openConfig = device.configurations.controls.valveOpenOnNormal;
    const currentValveState = device.currentState.valve;
    
    // Get general thresholds for "Back to Normal" checks
    const thresholds = device.configurations.thresholds;

    // --- 1. CHECK FOR SHUT-OFF TRIGGERS ---
    // Triggers if:
    // A. Master Shut-off is ENABLED
    // B. Specific parameter trigger is ENABLED
    // C. Reading violates the critical cut-off threshold
    
    let shutOffCauses = [];

    if (shutOffConfig.enabled) {
        // Check pH (if triggerPH is enabled)
        if (shutOffConfig.triggerPH && reading.pH !== undefined && 
           (reading.pH < shutOffConfig.phLow || reading.pH > shutOffConfig.phHigh)) {
            shutOffCauses.push("pH");
        }
        
        // Check Turbidity (if triggerTurbidity is enabled)
        if (shutOffConfig.triggerTurbidity && reading.turbidity !== undefined && 
           (reading.turbidity > shutOffConfig.turbidityCrit)) {
            shutOffCauses.push("Turbidity");
        }

        // Check TDS (if triggerTDS is enabled)
        if (shutOffConfig.triggerTDS && reading.tds !== undefined && 
           (reading.tds > shutOffConfig.tdsCrit)) {
            shutOffCauses.push("TDS");
        }
    }

    // --- 2. CHECK FOR RE-OPEN CONDITIONS ---
    // Auto-open allowed only if:
    // A. Master Re-open is ENABLED
    // B. All CHECKED parameters are within their configured "Normal" range
    //    (Normal range is defined in device.configurations.thresholds)

    let isSafeToOpen = false;

    if (openConfig.enabled) {
        // Assume safe initially; prove unsafe based on CHECKED triggers and Normal ranges
        isSafeToOpen = true;

        // pH Check: Must be between normalLow and normalHigh
        if (openConfig.triggerPH && reading.pH !== undefined) {
            const isPhNormal = (reading.pH >= thresholds.ph.normalLow && reading.pH <= thresholds.ph.normalHigh);
            if (!isPhNormal) {
                isSafeToOpen = false;
            }
        }

        // Turbidity Check: Must be <= normalHigh (and >= normalLow if required)
        if (openConfig.triggerTurbidity && reading.turbidity !== undefined) {
             // Usually turbidity normalLow is 0, so primarily checking upper bound
            const isTurbidityNormal = (reading.turbidity >= thresholds.turbidity.normalLow && reading.turbidity <= thresholds.turbidity.normalHigh);
            if (!isTurbidityNormal) {
                isSafeToOpen = false;
            }
        }

        // TDS Check: Must be <= normalHigh
        if (openConfig.triggerTDS && reading.tds !== undefined) {
            const isTdsNormal = (reading.tds >= thresholds.tds.normalLow && reading.tds <= thresholds.tds.normalHigh);
            if (!isTdsNormal) {
                isSafeToOpen = false;
            }
        }
    }

    // --- 3. EXECUTE ACTIONS ---

    // ACTION: AUTO SHUT-OFF
    if (shutOffCauses.length > 0 && currentValveState === 'OPEN') {
      
      // Set pending command on device model
      device.commands.setValve = 'CLOSED';
      device.currentState.valve = 'CLOSED';

      const commandPayload = { type: "setValve", value: "CLOSED" };

      if (io) {
        io.to(deviceId).emit("command", commandPayload);
      }

      const logMessage = `Auto-shutoff: Valve command sent due to critical ${shutOffCauses.join(" & ")} reading(s).`;
      actionsTaken.push(logMessage);

      await createSystemLogs(
        null,
        deviceId,
        "Valve Actuator",
        logMessage,
        "error"
      );
    } 
    
    // ACTION: AUTO OPEN-ON-NORMAL
    // Proceed only if explicitly safe, valve is closed, and no active shut-off triggers exist
    else if (isSafeToOpen && shutOffCauses.length === 0 && currentValveState === 'CLOSED') {
      
      device.commands.setValve = 'OPEN';
      device.currentState.valve = 'OPEN';

      const commandPayload = { type: "setValve", value: "OPEN" };

      if (io) {
        io.to(deviceId).emit("command", commandPayload);
      }

      const logMessage = "Auto-open: Valve command sent as monitored readings returned to normal range.";
      actionsTaken.push(logMessage);

      await createSystemLogs(
        null,
        deviceId,
        "Valve Actuator",
        logMessage,
        "success"
      );
    }
    
    // =================================================================
    //  ALERT DOCUMENT CREATION LOGIC 
    // =================================================================

    // Handle creating/updating Alert *documents* in 'alerts' collection
    for (const alertData of evaluatedAlerts) {
      const { parameter, severity } = alertData;
      const originator = device.label; // Use device human-readable label

      // Find most recent 'Active' alert for this sensor
      const existingAlert = await Alert.findOne({
        originator,
        parameter,
        lifecycle: 'Active',
      }).sort({ createdAt: -1 });

      // Case: No active alert + abnormal reading -> Create new alert
      if (!existingAlert && severity !== 'Normal') {
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Created new '${parameter}' ${severity} alert.`);
      }

      // Case: Active alert exists + severity changed -> Escalate
      else if (existingAlert && severity !== 'Normal' && severity !== existingAlert.severity) {
        // 1. Move old alert to 'Recent' history
        existingAlert.status = 'Escalated';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // 2. Create new 'Active' alert with new severity
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Escalated '${parameter}' alert to ${severity}.`);
      }

      // Case: Active alert exists + reading is 'Normal' -> Resolve
      else if (existingAlert && existingAlert.severity !== 'Normal' && severity === 'Normal') {
        // 1. Mark old alert as 'Resolved' and move to 'Recent'
        existingAlert.status = 'Resolved';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // 2. Create a single "Back to Normal" notification
        const recentNormal = await Alert.findOne({
          originator,
          parameter,
          severity: 'Normal',
          lifecycle: 'Active',
        }).sort({ createdAt: -1 });

        if (!recentNormal) {
          await Alert.create({
            ...alertData,
            originator,
            type: `${parameter} is back to normal`,
            lifecycle: 'Active',
            isBackToNormal: true,
          });
          actionsTaken.push(`Created single 'Back to Normal' alert for ${parameter}.`);
        }
      }

      // Case: No change (still Normal, or same Warning/Critical) -> No action required
    }

    // =================================================================
    //  UPDATE DEVICE STATE & HEARTBEATS 
    // =================================================================

   const currentTimestamp = reading.timestamp ? new Date(reading.timestamp) : new Date();

    device.latestReading = { 
      timestamp: currentTimestamp,
      PH: reading.pH ?? device.latestReading.PH,
      TDS: reading.tds ?? device.latestReading.TDS,
      TEMP: reading.temp ?? device.latestReading.TEMP,
      TURBIDITY: reading.turbidity ?? device.latestReading.TURBIDITY,
    };
    
    device.currentState.lastContact = currentTimestamp; 

    // Update individual sensor statuses, timestamps, and log "Online" events
    
    // --- PH Sensor ---
    if (reading.pH !== null && reading.pH !== undefined) {
      if (device.currentState.sensorStatus.PH.status === 'Offline') { 
        createSystemLogs(null, deviceId, "pH Sensor", "Sensor PH is online", "success"); 
      }
      device.currentState.sensorStatus.PH.status = 'Online'; 
      device.currentState.sensorStatus.PH.lastReadingTimestamp = currentTimestamp; 
    }
    
    // --- TEMP Sensor ---
    if (reading.temp !== null && reading.temp !== undefined) {
      if (device.currentState.sensorStatus.TEMP.status === 'Offline') { 
        createSystemLogs(null, deviceId, "Temp Sensor", "Sensor TEMP is online", "success"); 
      }
      device.currentState.sensorStatus.TEMP.status = 'Online'; 
      device.currentState.sensorStatus.TEMP.lastReadingTimestamp = currentTimestamp; 
    }

    // --- TDS Sensor ---
    if (reading.tds !== null && reading.tds !== undefined) {
      if (device.currentState.sensorStatus.TDS.status === 'Offline') { 
        createSystemLogs(null, deviceId, "TDS Sensor", "Sensor TDS is online", "success"); 
      }
      device.currentState.sensorStatus.TDS.status = 'Online'; 
      device.currentState.sensorStatus.TDS.lastReadingTimestamp = currentTimestamp; 
    }

    // --- TURBIDITY Sensor ---
    if (reading.turbidity !== null && reading.turbidity !== undefined) {
      if (device.currentState.sensorStatus.TURBIDITY.status === 'Offline') { 
        createSystemLogs(null, deviceId, "Turbidity Sensor", "Sensor TURBIDITY is online", "success"); 
      }
      device.currentState.sensorStatus.TURBIDITY.status = 'Online'; 
      device.currentState.sensorStatus.TURBIDITY.lastReadingTimestamp = currentTimestamp; 
    }
    
    await device.save(); 

    // Emit updates to connected frontend clients
    if (io) {
      // 'newReading': Specific event for charts/lists
      io.emit("newReading", {
        deviceId: device._id,
        label: device.label,
        latestReading: device.latestReading,
      });
      // 'deviceUpdate': Sends full updated device object (server syncing)
      io.emit("deviceUpdate", device);
    }

    // Return 200 OK to 'esp32_data' handler
    return res.status(200).json({
      message: "Sensor reading processed successfully.",
      actionsTaken,
      reading: device.latestReading,
    });

  } catch (error) {
    console.error("❌ Error processing sensor reading:", error);
    return res.status(500).json({ message: "Server error while processing reading." });
  }
};