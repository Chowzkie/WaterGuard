const cron = require("node-cron");
const Device = require("../models/Device");
const { createSystemLogs } = require("./createSystemLogs");

// Timeout threshold (1 min) for individual sensors to be considered offline
const SENSOR_OFFLINE_THRESHOLD_MS = 1 * 60 * 1000;

const initializeSensorStatusCheck = (io) => {
  console.log("✅ Initializing sensor status (offline) check...");

  // Schedule job to run every minute
  cron.schedule("* * * * *", async () => {
    try {
      // Calculate the cutoff timestamp
      const cutoff = new Date(Date.now() - SENSOR_OFFLINE_THRESHOLD_MS);
      
      // Retrieve only currently 'Online' devices to check their sub-components
      const devices = await Device.find({ "currentState.status": "Online" });
      
      for (const device of devices) {
        let sensorStatusChanged = false; // Flag to track if updates are needed
        const deviceId = device._id.toString();

        const sensors = device.currentState.sensorStatus;

        // Validate sensor object existence to prevent crashes on old data
        if (!sensors) {
          console.warn(`[SensorCheck] Device ${deviceId} is missing 'currentState.sensorStatus' object. Skipping.`);
          continue; 
        }

        // Iterate through each supported sensor type
        for (const sensorKey of ['PH', 'TEMP', 'TDS', 'TURBIDITY']) {
          const sensor = sensors[sensorKey];

          // Check if sensor is marked 'Online' but has stopped sending data
          if (sensor && sensor.status === 'Online' && sensor.lastReadingTimestamp < cutoff) {
            
            // Mark specific sensor as Offline
            sensor.status = 'Offline';
            sensorStatusChanged = true;
            device.latestReading[sensorKey] = 0; // Reset reading value
     
            console.warn(`[SensorCheck] Marking ${sensorKey} sensor for device ${deviceId} as Offline.`);

            // Map internal key to human-readable label for logging
            let componentLabel = "Sensor"; 
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

            // Log the specific sensor failure
            createSystemLogs(
              null,
              deviceId,
              componentLabel,
              `Sensor ${sensorKey} went offline (heartbeat missed)`,
              "error"
            );
          }
        }

        // Persist changes and notify frontend only if a status change occurred
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