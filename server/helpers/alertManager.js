// helpers/alertManager.js

const cron = require('node-cron');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

// --- Configuration for the retry mechanism ---
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * @function initializeAlertCronJobs
 * @desc Sets up and starts all the scheduled tasks for automated alert management.
 */
const initializeAlertCronJobs = () => {
  console.log('⏰ Initializing dynamic, per-device alert management jobs...');

  // --- Job 1: Auto-clear "Back to Normal" alerts ---
  cron.schedule('*/30 * * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const devices = await Device.find({});
        for (const device of devices) {
          const activeToRecentSeconds =
            device.configurations?.logging?.alertIntervals?.activeToRecent || 30;
          const cutoff = new Date(Date.now() - activeToRecentSeconds * 1000);

          const result = await Alert.updateMany(
            {
              originator: device.label,
              lifecycle: 'Active',
              isBackToNormal: true,
              dateTime: { $lte: cutoff },
            },
            { $set: { lifecycle: 'Recent', status: 'Cleared' } }
          );

          if (result.modifiedCount > 0) {
            console.log(
              `🔄 Cleared ${result.modifiedCount} 'Back to Normal' alerts for device ${device.label}`
            );
          }
        }
        return; // Success
      } catch (error) {
        console.error(
          `Cron Job Error (Clear Normals) - Attempt ${attempt}/${MAX_RETRIES}:`,
          error.message
        );
        if (attempt === MAX_RETRIES) {
          console.error('Cron job (Clear Normals) failed after all retries.', error);
        } else {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }
    }
  });

  // --- Job 2: Archive "Recent" alerts to "History" ---
  cron.schedule('* * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const devices = await Device.find({});
        for (const device of devices) {
          const recentToHistoryMinutes =
            device.configurations?.logging?.alertIntervals?.recentToHistory || 5;
          const cutoff = new Date(Date.now() - recentToHistoryMinutes * 60 * 1000);

          const result = await Alert.updateMany(
            {
              originator: device.label,
              lifecycle: 'Recent',
              dateTime: { $lte: cutoff },
            },
            { $set: { lifecycle: 'History' } }
          );

          if (result.modifiedCount > 0) {
            console.log(
              `📦 Archived ${result.modifiedCount} 'Recent' alerts to 'History' for device ${device.label}`
            );
          }
        }
        return; // Success
      } catch (error) {
        console.error(
          `Cron Job Error (Archive Recents) - Attempt ${attempt}/${MAX_RETRIES}:`,
          error.message
        );
        if (attempt === MAX_RETRIES) {
          console.error('Cron job (Archive Recents) failed after all retries.', error);
        } else {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }
    }
  });

  // --- Job 3: Permanently purge soft-deleted alerts ---
  cron.schedule('* * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000); // A 5 minute grace period for solf-deleted alerts
        const result = await Alert.deleteMany({
          isDeleted: true,
          deletedAt: { $lte: cutoff },
        });

        if (result.deletedCount > 0) {
          console.log(
            `🗑️ Purged ${result.deletedCount} soft-deleted alerts permanently.`
          );
        }
        return; // Success
      } catch (error) {
        console.error(
          `Cron Job Error (Purge) - Attempt ${attempt}/${MAX_RETRIES}:`,
          error.message
        );
        if (attempt === MAX_RETRIES) {
          console.error('Cron job (Purge) failed after all retries.', error);
        } else {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }
    }
  });

  // --- 🧹 Job 4: Auto-clear stuck or stale "Active" alerts ---
  cron.schedule('*/60 * * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const devices = await Device.find({});
        for (const device of devices) {
          const staleActiveMinutes =
            device.configurations?.logging?.alertIntervals?.staleActiveToRecent || 10;
          const cutoff = new Date(Date.now() - staleActiveMinutes * 60 * 1000);

          const result = await Alert.updateMany(
            {
              originator: device.label,
              lifecycle: 'Active',
              isBackToNormal: false,
              dateTime: { $lte: cutoff },
            },
            {
              $set: {
                lifecycle: 'Recent',
                status: 'Expired',
                isBackToNormal: true,
              },
            }
          );

          if (result.modifiedCount > 0) {
            console.log(
              `🧹 Auto-cleared ${result.modifiedCount} stale 'Active' alerts for ${device.label} that never resolved.`
            );
          }
        }
        return; // Success
      } catch (error) {
        console.error(
          `Cron Job Error (Clear Stale Actives) - Attempt ${attempt}/${MAX_RETRIES}:`,
          error.message
        );
        if (attempt === MAX_RETRIES) {
          console.error('Cron job (Clear Stale Actives) failed after all retries.', error);
        } else {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }
    }
  });
};

module.exports = { initializeAlertCronJobs };