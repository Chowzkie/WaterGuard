const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { evaluateSensorReading } = require('../utils/SensorLogic'); 
const { createSystemLogs } = require('../helpers/createSystemLogs'); 

/**
 * processReading
 * * Main controller function for handling incoming sensor data.
 * * CONNECTION TO SERVER.JS:
 * This function is invoked directly by the 'esp32_data' event handler in server.js.
 * *  *
 * Responsibilities:
 * 1. Receive sanitized data from the Socket.IO event.
 * 2. Evaluate sensor readings against specific device configurations.
 * 3. Trigger bi-directional communication: sending 'commands' back to the ESP32 via Socket.IO.
 * 4. Update the database (Alerts, Device State, Logs).
 */
exports.processReading = async (req, res) => {
  // Extract the payload constructed in server.js (req.body contains the socket data)
  const reading = req.body;
  const deviceId = reading.deviceId;

  // Basic payload validation to ensure upstream data integrity
  if (!reading || !deviceId) {
    return res.status(400).json({ message: "Invalid sensor reading payload." });
  }

  try {
    // Verify device existence in the database before processing logic
    const device = await Device.findById(deviceId); 
    if (!device) {
      return res.status(404).json({ message: `Device with ID ${deviceId} not found.` });
    }

    // Retrieve the Socket.IO instance initialized in server.js (app.set("io", io))
    // This allows this controller to emit events back to the hardware and frontend
    const io = req.app.get("io");
    
    // Evaluate Readings for Alerts 
    // Uses external logic to compare current readings against user-defined thresholds
    const evaluatedAlerts = evaluateSensorReading(reading, device.configurations);
    const actionsTaken = []; // Accumulator for operation logs
    
    // =================================================================
    // AUTOMATION LOGIC BLOCK (SHUT-OFF & OPEN)
    // =================================================================

    // Extract automation settings from the device document
    const shutOffConfig = device.configurations.controls.valveShutOff;
    const openConfig = device.configurations.controls.valveOpenOnNormal;
    const currentValveState = device.currentState.valve;
    
    // Get general thresholds to determine if water quality has returned to "Normal"
    const thresholds = device.configurations.thresholds;

    // --- 1. CHECK FOR SHUT-OFF TRIGGERS ---
    // Triggers if:
    // A. Master Shut-off is ENABLED
    // B. Specific parameter trigger is ENABLED
    // C. Reading violates the critical cut-off threshold
    
    let shutOffCauses = [];

    if (shutOffConfig.enabled) {
        // Analyze pH against critical cut-off limits
        if (shutOffConfig.triggerPH && reading.pH !== undefined && 
           (reading.pH < shutOffConfig.phLow || reading.pH > shutOffConfig.phHigh)) {
            shutOffCauses.push("pH");
        }
        
        // Analyze Turbidity against critical upper limit
        if (shutOffConfig.triggerTurbidity && reading.turbidity !== undefined && 
           (reading.turbidity > shutOffConfig.turbidityCrit)) {
            shutOffCauses.push("Turbidity");
        }

        // Analyze TDS against critical upper limit
        if (shutOffConfig.triggerTDS && reading.tds !== undefined && 
           (reading.tds > shutOffConfig.tdsCrit)) {
            shutOffCauses.push("TDS");
        }
    }

    // --- 2. CHECK FOR RE-OPEN CONDITIONS ---
    // Logic determines if it is safe to auto-open the valve.
    // Requires Master Re-open enabled AND all checked parameters within "Normal" range.

    let isSafeToOpen = false;

    if (openConfig.enabled) {
        // Assume safe initially; disqualify if any enabled check fails
        isSafeToOpen = true;

        // pH Check: Must be strictly within normal operating range
        if (openConfig.triggerPH && reading.pH !== undefined) {
            const isPhNormal = (reading.pH >= thresholds.ph.normalLow && reading.pH <= thresholds.ph.normalHigh);
            if (!isPhNormal) {
                isSafeToOpen = false;
            }
        }

        // Turbidity Check: Must be within normal range (usually close to 0)
        if (openConfig.triggerTurbidity && reading.turbidity !== undefined) {
            const isTurbidityNormal = (reading.turbidity >= thresholds.turbidity.normalLow && reading.turbidity <= thresholds.turbidity.normalHigh);
            if (!isTurbidityNormal) {
                isSafeToOpen = false;
            }
        }

        // TDS Check: Must be within normal range
        if (openConfig.triggerTDS && reading.tds !== undefined) {
            const isTdsNormal = (reading.tds >= thresholds.tds.normalLow && reading.tds <= thresholds.tds.normalHigh);
            if (!isTdsNormal) {
                isSafeToOpen = false;
            }
        }
    }

    // --- 3. EXECUTE ACTIONS ---

    // ACTION: AUTO SHUT-OFF
    // If critical triggers exist and valve is currently OPEN
    if (shutOffCauses.length > 0 && currentValveState === 'OPEN') {
      
      // Update database state immediately to reflect intended state
      device.commands.setValve = 'CLOSED';
      device.currentState.valve = 'CLOSED';

      const commandPayload = { type: "setValve", value: "CLOSED" };

      // Emit command specifically to the device's room (managed in server.js 'joinRoom')
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
    // If environment is safe, valve is CLOSED, and there are no active critical triggers
    else if (isSafeToOpen && shutOffCauses.length === 0 && currentValveState === 'CLOSED') {
      
      device.commands.setValve = 'OPEN';
      device.currentState.valve = 'OPEN';

      const commandPayload = { type: "setValve", value: "OPEN" };

      // Emit open command to the hardware
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

    // Iterate through evaluated alerts to create, escalate, or resolve records in MongoDB
    for (const alertData of evaluatedAlerts) {
      const { parameter, severity } = alertData;
      const originator = device.label; 

      // Check for existing active alerts to avoid duplicates
      const existingAlert = await Alert.findOne({
        originator,
        parameter,
        lifecycle: 'Active',
      }).sort({ createdAt: -1 });

      // Scenario 1: New Issue. No active alert exists, and severity is not Normal.
      if (!existingAlert && severity !== 'Normal') {
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Created new '${parameter}' ${severity} alert.`);
      }

      // Scenario 2: Escalation. Active alert exists, but severity has worsened (e.g., Warning -> Critical).
      else if (existingAlert && severity !== 'Normal' && severity !== existingAlert.severity) {
        // Archive the old alert state
        existingAlert.status = 'Escalated';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // Create new alert with higher severity
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Escalated '${parameter}' alert to ${severity}.`);
      }

      // Scenario 3: Resolution. Active alert exists, but reading has returned to Normal.
      else if (existingAlert && existingAlert.severity !== 'Normal' && severity === 'Normal') {
        // Resolve the existing alert
        existingAlert.status = 'Resolved';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // Ensure we don't spam "Back to Normal" alerts if one was just created
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
    }

    // =================================================================
    //  UPDATE DEVICE STATE & HEARTBEATS 
    // =================================================================

   const currentTimestamp = reading.timestamp ? new Date(reading.timestamp) : new Date();

    // Update the 'latestReading' snapshot on the device document
    device.latestReading = { 
      timestamp: currentTimestamp,
      PH: reading.pH ?? device.latestReading.PH,
      TDS: reading.tds ?? device.latestReading.TDS,
      TEMP: reading.temp ?? device.latestReading.TEMP,
      TURBIDITY: reading.turbidity ?? device.latestReading.TURBIDITY,
    };
    
    // Update the main device heartbeat
    device.currentState.lastContact = currentTimestamp; 

    // --- Individual Sensor Status Checks ---
    // Check which sensors provided data in this payload.
    // If a sensor was previously "Offline" and sends data, log its recovery.
    
    // PH Sensor
    if (reading.pH !== null && reading.pH !== undefined) {
      if (device.currentState.sensorStatus.PH.status === 'Offline') { 
        createSystemLogs(null, deviceId, "pH Sensor", "Sensor PH is online", "success"); 
      }
      device.currentState.sensorStatus.PH.status = 'Online'; 
      device.currentState.sensorStatus.PH.lastReadingTimestamp = currentTimestamp; 
    }
    
    // TEMP Sensor
    if (reading.temp !== null && reading.temp !== undefined) {
      if (device.currentState.sensorStatus.TEMP.status === 'Offline') { 
        createSystemLogs(null, deviceId, "Temp Sensor", "Sensor TEMP is online", "success"); 
      }
      device.currentState.sensorStatus.TEMP.status = 'Online'; 
      device.currentState.sensorStatus.TEMP.lastReadingTimestamp = currentTimestamp; 
    }

    // TDS Sensor
    if (reading.tds !== null && reading.tds !== undefined) {
      if (device.currentState.sensorStatus.TDS.status === 'Offline') { 
        createSystemLogs(null, deviceId, "TDS Sensor", "Sensor TDS is online", "success"); 
      }
      device.currentState.sensorStatus.TDS.status = 'Online'; 
      device.currentState.sensorStatus.TDS.lastReadingTimestamp = currentTimestamp; 
    }

    // TURBIDITY Sensor
    if (reading.turbidity !== null && reading.turbidity !== undefined) {
      if (device.currentState.sensorStatus.TURBIDITY.status === 'Offline') { 
        createSystemLogs(null, deviceId, "Turbidity Sensor", "Sensor TURBIDITY is online", "success"); 
      }
      device.currentState.sensorStatus.TURBIDITY.status = 'Online'; 
      device.currentState.sensorStatus.TURBIDITY.lastReadingTimestamp = currentTimestamp; 
    }
    
    // Save all changes (State, Readings, Commands) to MongoDB
    await device.save(); 

    // Broadcast updates to the Frontend via Socket.IO
    // This ensures web clients see the new data in real-time without refreshing
    if (io) {
      // 'newReading': Lightweight event for updating charts/tables
      io.emit("newReading", {
        deviceId: device._id,
        label: device.label,
        latestReading: device.latestReading,
      });
      // 'deviceUpdate': Heavy event for syncing the entire device object state
      io.emit("deviceUpdate", device);
    }

    // Return response.
    // In the context of server.js socket handling, this JSON response 
    // is caught by the mock 'res' object and logged to the server console.
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