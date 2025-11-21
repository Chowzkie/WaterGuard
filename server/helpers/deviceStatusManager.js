const cron = require("node-cron");
const Device = require("../models/Device");
const { createSystemLogs } = require("./createSystemLogs");

// Timeout threshold (60s) before marking a device as offline
// Allows for some network latency before triggering a disconnect event
const OFFLINE_THRESHOLD_MS = 60 * 1000;

const initializeDeviceStatusCheck = (io) => {
  console.log(" Initializing device status (offline) check...");
  
  // Schedule job to run every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      // Calculate the cutoff timestamp based on the current time
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

      // Find devices marked 'Online' that have not sent a heartbeat since the cutoff
      const offlineDevices = await Device.find({
        "currentState.status": "Online",
        "currentState.lastContact": { $lt: cutoff },
      });

      if (offlineDevices.length > 0) {
        console.log(`[StatusCheck] Found ${offlineDevices.length} device(s) that went offline.`);
      }

      // Process each disconnected device
      for (const device of offlineDevices) {
        const deviceId = device._id.toString();
        console.warn(`[StatusCheck] Marking device ${deviceId} as Offline.`);
        
       // 1. Mark the main controller status as Offline
        device.currentState.status = "Offline"; 

        // 2. Cascade offline status to all attached sensors
        // If the main board is down, sensors are implicitly unreachable
        device.currentState.sensorStatus.PH.status = "Offline";
        device.currentState.sensorStatus.TEMP.status = "Offline";
        device.currentState.sensorStatus.TDS.status = "Offline";
        device.currentState.sensorStatus.TURBIDITY.status = "Offline";

        // Reset current readings to 0 to indicate no data
        device.latestReading.PH = 0;
        device.latestReading.TDS = 0;
        device.latestReading.TEMP = 0;
        device.latestReading.TURBIDITY = 0;

        // 3. Persist changes to the database
        await device.save();

        // 4. Log the disconnection event
        createSystemLogs(
          null,
          deviceId,
          "Microcontroller",
          "Device went offline (heartbeat missed)",
          "error"
        );

        // 5. Broadcast the status update to the frontend
        io.emit("deviceUpdate", device);
      }
    } catch (err) {
      console.error("❌ Error during device status check:", err);
    }
  });
};

module.exports = { initializeDeviceStatusCheck };