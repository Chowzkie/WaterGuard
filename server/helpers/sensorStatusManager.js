// helpers/sensorStatusManager.js
const cron = require("node-cron");
const Device = require("../models/Device");
const { createSystemLogs } = require("./createSystemLogs");

// ✅ FIX #2: Changed threshold to 5 minutes (300,000 ms)
// This job now only catches individual sensor failures, not whole-device disconnects.
const SENSOR_OFFLINE_THRESHOLD_MS = 1 * 60 * 1000;

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

        const sensors = device.currentState.sensorStatus;

        
        // ✅ FIX #1: Add safety check for old device documents
        if (!sensors) {
          console.warn(`[SensorCheck] Device ${deviceId} is missing 'currentState.sensorStatus' object. Skipping.`);
          continue; // Go to the next device
        }

        for (const sensorKey of ['PH', 'TEMP', 'TDS', 'TURBIDITY']) {
          const sensor = sensors[sensorKey];
    

          // ✅ FIX #1: Add safety check for 'sensor' object
          // If sensor is 'Online' but its last reading is older than the cutoff...
          if (sensor && sensor.status === 'Online' && sensor.lastReadingTimestamp < cutoff) {
            
            // Mark it 'Offline'
            sensor.status = 'Offline';
            sensorStatusChanged = true;
            device.latestReading[sensorKey] = 0;
     
            
            console.warn(`[SensorCheck] Marking ${sensorKey} sensor for device ${deviceId} as Offline.`);

            // Determine the correct component label
            let componentLabel = "Sensor"; // Default
            switch (sensorKey) {
              case 'PH':
                componentLabel = "Ph Sensor";
                break;
              case 'TEMP':
                componentLabel = "Temp Sensor";
                break;
              case 'TDS':
                componentLabel = "TDS Sensor";
                break;
              case 'TURBIDITY':
                componentLabel = "Turbidity Sensor";
                break;
            }

            // Use the new componentLabel
            createSystemLogs(
              null,
              deviceId,
              componentLabel,
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