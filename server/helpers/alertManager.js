const cron = require('node-cron');
const Device = require('../models/Device');
const Alert = require('../models/Alert');

// --- Configuration for the retry mechanism ---
// Defines robustness settings for database operations within cron jobs.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * @function initializeAlertCronJobs
 * @desc Sets up and starts all the scheduled tasks for automated alert management.
 * Handles the lifecycle transitions of alerts (Active -> Recent -> History) 
 * and performs cleanup of stale or deleted data.
 */
const initializeAlertCronJobs = () => {
  console.log('⏰ Initializing dynamic, per-device alert management jobs...');

  // --- Job 1: Auto-clear "Back to Normal" alerts ---
  // Schedule: Runs every 30 seconds.
  // Purpose: Moves alerts that have been resolved (marked "Back to Normal") 
  // from the 'Active' view to the 'Recent' view after a configured duration.
  cron.schedule('*/30 * * * * *', async () => {
    // Retry loop to handle transient database connectivity issues
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Fetch all devices to access their specific configuration settings
        const devices = await Device.find({});
        
        for (const device of devices) {
          // Determine the specific timeout for this device (default: 30 seconds)
          const activeToRecentSeconds =
            device.configurations?.logging?.alertIntervals?.activeToRecent || 30;
          
          // Calculate the timestamp cutoff
          const cutoff = new Date(Date.now() - activeToRecentSeconds * 1000);

          // Batch update alerts that match criteria:
          // 1. Belongs to this device
          // 2. Is currently 'Active'
          // 3. Has been flagged as resolved (isBackToNormal: true)
          // 4. Passed the time threshold
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
        return; // Exit function on success
      } catch (error) {
        // Log warning on failure and prepare to retry
        console.error(
          `Cron Job Error (Clear Normals) - Attempt ${attempt}/${MAX_RETRIES}:`,
          error.message
        );
        if (attempt === MAX_RETRIES) {
          console.error('Cron job (Clear Normals) failed after all retries.', error);
        } else {
          // Wait before retrying
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        }
      }
    }
  });

  // --- Job 2: Archive "Recent" alerts to "History" ---
  // Schedule: Runs every minute.
  // Purpose: Moves alerts from the 'Recent' list (short-term visibility) 
  // to 'History' (long-term storage) after they age out.
  cron.schedule('* * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const devices = await Device.find({});
        for (const device of devices) {
          // Determine device-specific archival timing (default: 5 minutes)
          const recentToHistoryMinutes =
            device.configurations?.logging?.alertIntervals?.recentToHistory || 5;
            
          const cutoff = new Date(Date.now() - recentToHistoryMinutes * 60 * 1000);

          // Update matching 'Recent' alerts to 'History'
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
  // Schedule: Runs every minute.
  // Purpose: Performs a "Hard Delete" on items that were "Soft Deleted" (marked isDeleted=true).
  // Provides a grace period (5 minutes) where data could potentially be recovered before permanent removal.
  cron.schedule('* * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Calculate cutoff for the 5-minute grace period
        const cutoff = new Date(Date.now() - 5 * 60 * 1000); 
        
        // Permanently remove documents from MongoDB
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

  // --- Job 4: Auto-clear stuck or stale "Active" alerts ---
  // Schedule: Runs every 60 seconds.
  // Purpose: Failsafe mechanism. If an alert stays 'Active' for too long (e.g., sensor dies),
  // it is forced to 'Recent' with status 'Expired' so it doesn't clutter the dashboard indefinitely.
  cron.schedule('*/60 * * * * *', async () => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const devices = await Device.find({});
        for (const device of devices) {
          // Get device-specific stale threshold (default: 10 minutes)
          const staleActiveMinutes =
            device.configurations?.logging?.alertIntervals?.staleActiveToRecent || 10;
            
          const cutoff = new Date(Date.now() - staleActiveMinutes * 60 * 1000);

          // Find 'Active' alerts that are NOT back to normal yet, but are too old
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
                status: 'Expired', // Mark as Expired rather than Cleared
                isBackToNormal: true, // Force resolution
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