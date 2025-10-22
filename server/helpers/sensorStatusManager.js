// helpers/sensorStatusManager.js
const cron = require("node-cron");
const Device = require("../models/Device");
const { createSystemLogs } = require("./createSystemLogs");

// Define how long a sensor can be silent before being marked offline
const SENSOR_OFFLINE_THRESHOLD_MS = 10 * 1000;

const initializeSensorStatusCheck = (io) => {
  console.log("✅ Initializing sensor status (offline) check...");

  // Run this check every minute
  cron.schedule("* * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - SENSOR_OFFLINE_THRESHOLD_MS);
      
      // We only care about devices that are themselves Online
      const devices = await Device.find({ "currentState.status": "Online" });
      
      for (const device of devices) {
        let sensorStatusChanged = false;
        const deviceId = device._id.toString();

        // Get the sensor status object
        const sensors = device.currentState.sensorStatus;
        
        // Loop over each sensor defined in the model
        for (const sensorKey of ['PH', 'TEMP', 'TDS', 'TURBIDITY']) {
          const sensor = sensors[sensorKey];

          // If sensor is 'Online' but its last reading is older than the cutoff...
          if (sensor.status === 'Online' && sensor.lastReadingTimestamp < cutoff) {
            
            // Mark it 'Offline'
            sensor.status = 'Offline';
            sensorStatusChanged = true;
            
            console.warn(`[SensorCheck] Marking ${sensorKey} sensor for device ${deviceId} as Offline.`);
            
            // Log this specific event
            createSystemLogs(
              null,
              deviceId,
              "Sensor",
              `Sensor ${sensorKey} went offline (heartbeat missed)`,
              "error"
            );
          }
        }

        // If any sensor status changed, save the device and notify the frontend
        if (sensorStatusChanged) {
          await device.save();
          io.emit("deviceUpdate", device);
        }
      }
    } catch (err) {
      console.error("❌ Error during sensor status check:", err);
    }
  });
};

module.exports = { initializeSensorStatusCheck };