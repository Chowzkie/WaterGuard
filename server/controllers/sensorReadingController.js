// server/controllers/sensorReadingController.js
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { evaluateSensorReading } = require('../utils/SensorLogic'); // Assumed helper function
const { createSystemLogs } = require('../helpers/createSystemLogs'); //

/**
 * processReading
 * This is the main controller function for handling all incoming sensor data.
 * It is triggered by the 'esp32_data' socket event in server.js.
 *
 * Responsibilities:
 * 1. Validate the payload and find the corresponding device.
 * 2. Evaluate sensor readings against alert thresholds.
 * 3. Trigger valve automation (auto-shutoff or auto-open) based on rules.
 * 4. Create or update Alert documents in the database.
 * 5. Update the device's 'latestReading' object.
 * 6. Update the device's main 'lastContact' heartbeat.
 * 7. Update the individual sensor 'status' and 'lastReadingTimestamp' fields.
 * 8. Save the updated device document.
 * 9. Emit socket events to notify the frontend of the new data.
 */
exports.processReading = async (req, res) => {
  // Extract the full reading payload and the deviceId from the request body
  const reading = req.body;
  const deviceId = reading.deviceId;

  // Basic payload validation
  if (!reading || !deviceId) {
    return res.status(400).json({ message: "Invalid sensor reading payload." });
  }

  try {
    // --- 1. Find the Device ---
    const device = await Device.findById(deviceId); //
    if (!device) {
      // If no device is found, we can't process the reading.
      return res.status(404).json({ message: `Device with ID ${deviceId} not found.` });
    }

    // Get the socket.io instance, which was attached to the 'app' in server.js
    const io = req.app.get("io");
    
    // --- 2. Evaluate Readings for Alerts ---
    // This helper function (from /utils) compares readings to the device's
    // configured thresholds and returns an array of alert objects.
    const evaluatedAlerts = evaluateSensorReading(reading, device.configurations);
    const actionsTaken = []; // An array to log what actions this function performs
    
    // =================================================================
    // --- 3. AUTOMATION LOGIC BLOCK (SHUT-OFF & OPEN) ---
    // =================================================================

    // Get automation rules and current state from the device model
    const shutOffRules = device.configurations.controls.valveShutOff;
    const openOnNormalEnabled = device.configurations.controls.valveOpenOnNormal.enabled;
    const currentValveState = device.currentState.valve;
    
    let triggeringParameters = []; // To store which sensor(s) caused a shutoff

    // Check reading against the *shut-off thresholds*
    if (reading.pH && (reading.pH < shutOffRules.phLow || reading.pH > shutOffRules.phHigh)) {
      triggeringParameters.push("pH");
    }
    if (reading.turbidity && reading.turbidity > shutOffRules.turbidityCrit) {
      triggeringParameters.push("Turbidity");
    }
    if (reading.tds && reading.tds > shutOffRules.tdsCrit) {
      triggeringParameters.push("TDS");
    }

    // --- LOGIC 1: AUTO SHUT-OFF ---
    // If any parameter is critical AND the valve is currently OPEN, send a CLOSE command.
    if (triggeringParameters.length > 0 && currentValveState === 'OPEN') {
      
      // Set the pending command on the device model
      device.commands.setValve = 'CLOSED'; //
      device.currentState.valve = 'CLOSED';

      // Create the command payload to send to the ESP32
      const commandPayload = { type: "setValve", value: "CLOSED" }; //

      // Emit the 'command' event *only* to the room for this specific deviceId
      if (io) {
        io.to(deviceId).emit("command", commandPayload);
      }

      const logMessage = `Auto-shutoff: Valve command sent due to critical ${triggeringParameters.join(" & ")} reading(s).`;
      actionsTaken.push(logMessage);

      // Create a system log for this critical automation event
      await createSystemLogs(
        null,
        deviceId,
        "Valve Actuator",
        logMessage,
        "error" // 'error' status for critical shutdowns
      );
    } 
    
    // --- LOGIC 2: AUTO OPEN-ON-NORMAL ---
    // ELSE IF the feature is enabled, AND no parameters are critical, AND the valve is CLOSED, send OPEN.
    else if (openOnNormalEnabled && triggeringParameters.length === 0 && currentValveState === 'CLOSED') {
      
      // Set the pending command on the device model
      device.commands.setValve = 'OPEN'; //
      device.currentState.valve = 'OPEN'

      const commandPayload = { type: "setValve", value: "OPEN" }; //

      // Emit the 'command' event *only* to this device
      if (io) {
        io.to(deviceId).emit("command", commandPayload);
      }

      const logMessage = "Auto-open: Valve command sent as readings returned to normal.";
      actionsTaken.push(logMessage);

      // Create a system log for this "return to normal" event
      await createSystemLogs(
        null,
        deviceId,
        "Valve Actuator",
        logMessage,
        "success" // 'success' status for returning to a good state
      );
    }
    
    // =================================================================
    // --- 4. ALERT DOCUMENT CREATION LOGIC ---
    // =================================================================

    // This loop handles creating/updating Alert *documents* in the 'alerts' collection
    for (const alertData of evaluatedAlerts) {
      const { parameter, severity } = alertData;
      const originator = device.label; // Use the device's human-readable label

      // Find the most recent 'Active' alert for this specific sensor
      const existingAlert = await Alert.findOne({
        originator,
        parameter,
        lifecycle: 'Active',
      }).sort({ createdAt: -1 });

      // --- CASE 1: No active alert, and the new reading is abnormal (Warning/Critical) -> Create a new alert.
      if (!existingAlert && severity !== 'Normal') {
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Created new '${parameter}' ${severity} alert.`);
      }

      // --- CASE 2: An active alert exists, and the severity has changed (e.g., Warning -> Critical) -> Escalate.
      else if (existingAlert && severity !== 'Normal' && severity !== existingAlert.severity) {
        // 1. Move the old alert to 'Recent' history
        existingAlert.status = 'Escalated';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // 2. Create a new 'Active' alert with the new severity
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Escalated '${parameter}' alert to ${severity}.`);
      }

      // --- CASE 3: An active alert exists, and the reading is now 'Normal' -> Resolve.
      else if (existingAlert && existingAlert.severity !== 'Normal' && severity === 'Normal') {
        // 1. Mark the old alert as 'Resolved' and move to 'Recent'
        existingAlert.status = 'Resolved';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // 2. Create a "Back to Normal" notification, but only one.
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

      // --- CASE 4: No change (still Normal, or same Warning/Critical) -> Do nothing.
      else {
        // This case is implicitly handled (no action taken)
      }
    }

    // =================================================================
    // --- 5. 6. 7. UPDATE DEVICE STATE & HEARTBEATS ---
    // =================================================================

   const currentTimestamp = reading.timestamp ? new Date(reading.timestamp) : new Date();

    device.latestReading = { //
      timestamp: currentTimestamp,
      PH: reading.pH ?? device.latestReading.PH,
      TDS: reading.tds ?? device.latestReading.TDS,
      TEMP: reading.temp ?? device.latestReading.TEMP,
      TURBIDITY: reading.turbidity ?? device.latestReading.TURBIDITY,
    };
    
    device.currentState.lastContact = currentTimestamp; //

    // ✅ UPDATE: Individual sensor statuses, timestamps, and "Online" logging
    
    // --- PH Sensor ---
    if (reading.pH !== null && reading.pH !== undefined) {
      if (device.currentState.sensorStatus.PH.status === 'Offline') { //
        // ✅ Changed component label
        createSystemLogs(null, deviceId, "pH Sensor", "Sensor PH is online", "success"); //
      }
      device.currentState.sensorStatus.PH.status = 'Online'; //
      device.currentState.sensorStatus.PH.lastReadingTimestamp = currentTimestamp; //
    }
    
    // --- TEMP Sensor ---
    if (reading.temp !== null && reading.temp !== undefined) {
      if (device.currentState.sensorStatus.TEMP.status === 'Offline') { //
        // ✅ Changed component label
        createSystemLogs(null, deviceId, "Temp Sensor", "Sensor TEMP is online", "success"); //
      }
      device.currentState.sensorStatus.TEMP.status = 'Online'; //
      device.currentState.sensorStatus.TEMP.lastReadingTimestamp = currentTimestamp; //
    }

    // --- TDS Sensor ---
    if (reading.tds !== null && reading.tds !== undefined) {
      if (device.currentState.sensorStatus.TDS.status === 'Offline') { //
        // ✅ Changed component label
        createSystemLogs(null, deviceId, "TDS Sensor", "Sensor TDS is online", "success"); //
      }
      device.currentState.sensorStatus.TDS.status = 'Online'; //
      device.currentState.sensorStatus.TDS.lastReadingTimestamp = currentTimestamp; //
    }

    // --- TURBIDITY Sensor ---
    if (reading.turbidity !== null && reading.turbidity !== undefined) {
      if (device.currentState.sensorStatus.TURBIDITY.status === 'Offline') { //
        // ✅ Changed component label
        createSystemLogs(null, deviceId, "Turbidity Sensor", "Sensor TURBIDITY is online", "success"); //
      }
      device.currentState.sensorStatus.TURBIDITY.status = 'Online'; //
      device.currentState.sensorStatus.TURBIDITY.lastReadingTimestamp = currentTimestamp; //
    }
    
    await device.save(); //

    // 9. Emit updates to all connected frontend clients
    if (io) {
      // 'newReading' is a specific event for charts or lists
      io.emit("newReading", {
        deviceId: device._id,
        label: device.label,
        latestReading: device.latestReading,
      });
      // 'deviceUpdate' sends the *entire* updated device object
      // This is used by server.js and is good practice for a full state update.
      io.emit("deviceUpdate", device);
    }

    // Send a 200 OK response back to the 'esp32_data' handler in server.js
    return res.status(200).json({
      message: "Sensor reading processed successfully.",
      actionsTaken,
      reading: device.latestReading,
    });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error("❌ Error processing sensor reading:", error);
    // Send a 500 Internal Server Error response
    return res.status(500).json({ message: "Server error while processing reading." });
  }
};