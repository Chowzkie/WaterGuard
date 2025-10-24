// helpers/deviceStatusManager.js
const cron = require("node-cron");
const Device = require("../models/Device");
const { createSystemLogs } = require("./createSystemLogs");

// Define how long a device can be silent before being marked offline
// 60 seconds = 12x the 5-second ESP heartbeat
const OFFLINE_THRESHOLD_MS = 60 * 1000;

const initializeDeviceStatusCheck = (io) => {
  console.log("✅ Initializing device status (offline) check...");
  
  // Run this check every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

      // Find all devices that are currently "Online" but
      // haven't been in contact since the cutoff time
      const offlineDevices = await Device.find({
        "currentState.status": "Online",
        "currentState.lastContact": { $lt: cutoff },
      });

      if (offlineDevices.length > 0) {
        console.log(`[StatusCheck] Found ${offlineDevices.length} device(s) that went offline.`);
      }

      // Loop and update each one
      for (const device of offlineDevices) {
        const deviceId = device._id.toString();
        console.warn(`[StatusCheck] Marking device ${deviceId} as Offline.`);
        
       // 1. Mark the device itself Offline
        device.currentState.status = "Offline"; //

        // 2. ✅ NEW: Mark all its sensors Offline at the same time
        device.currentState.sensorStatus.PH.status = "Offline";
        device.currentState.sensorStatus.TEMP.status = "Offline";
        device.currentState.sensorStatus.TDS.status = "Offline";
        device.currentState.sensorStatus.TURBIDITY.status = "Offline";

        // 3. Save the changes
        await device.save();

        // 4. Create the system log
        createSystemLogs(
          null,
          deviceId,
          "Microcontroller",
          "Device went offline (heartbeat missed)",
          "error"
        );

        // 5. Notify the frontend
        io.emit("deviceUpdate", device);
      }
    } catch (err) {
      console.error("❌ Error during device status check:", err);
    }
  });
};

module.exports = { initializeDeviceStatusCheck };