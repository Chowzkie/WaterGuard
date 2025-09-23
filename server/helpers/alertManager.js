// helpers/alertManager.js

const cron = require('node-cron');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

/**
 * @function initializeAlertCronJobs
 * @desc Sets up and starts all the scheduled tasks for automated alert management.
 * This should be called once when the server starts.
 */
const initializeAlertCronJobs = () => {
  console.log('⏰ Initializing dynamic, per-device alert management jobs...');

  // --- Job 1: Auto-clear "Back to Normal" alerts based on per-device settings ---
  // Runs every 30 seconds to check for alerts to clear.
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const devices = await Device.find({});
      
      for (const device of devices) {
        // Get the device-specific setting in seconds. Fallback to a default if not set.
        const activeToRecentSeconds = device.configurations?.logging?.alertIntervals?.activeToRecent || 30;
        const cutoff = new Date(Date.now() - activeToRecentSeconds * 1000);

        await Alert.updateMany(
          {
            originator: device._id, // CORRECTED: Use 'originator' to match the Alert schema
            lifecycle: 'Active',
            isBackToNormal: true,
            dateTime: { $lte: cutoff }
          },
          { $set: { lifecycle: 'Recent', status: 'Cleared' } }
        );
      }
    } catch (error) {
      console.error('Cron Job Error (Clear Normals):', error);
    }
  });

  // --- Job 2: Archive "Recent" alerts to "History" based on per-device settings ---
  // Runs every minute to check for alerts to archive.
  cron.schedule('* * * * *', async () => {
    try {
      const devices = await Device.find({});

      for (const device of devices) {
        // Get the device-specific setting in minutes. Fallback to a default if not set.
        const recentToHistoryMinutes = device.configurations?.logging?.alertIntervals?.recentToHistory || 5;
        const cutoff = new Date(Date.now() - recentToHistoryMinutes * 60 * 1000);

        await Alert.updateMany(
          {
            originator: device._id, // CORRECTED: Use 'originator' to match the Alert schema
            lifecycle: 'Recent',
            dateTime: { $lte: cutoff }
          },
          { $set: { lifecycle: 'History' } }
        );
      }
    } catch (error) {
      console.error('Cron Job Error (Archive Recents):', error);
    }
  });

  // --- Job 3: Permanently purge soft-deleted alerts (Global) ---
  // This job remains global as it's a general cleanup task.
  // Runs every 5 minutes.
  cron.schedule('*/5 * * * *', async () => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5-minute grace period
    
    try {
      const result = await Alert.deleteMany({
        isDeleted: true,
        deletedAt: { $lte: cutoff }
      });

      if (result.deletedCount > 0) {
        console.log(`✅ Cron Job (Purge): Successfully purged ${result.deletedCount} soft-deleted alerts.`);
      }
    } catch (error) {
      console.error('❌ Cron Job Error (Purge):', error);
    }
  });
};

module.exports = { initializeAlertCronJobs };