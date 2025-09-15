// server/server.js
const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db"); // Assuming this is the path to your file
const createDefaultUser = require("./utils/createDefaultUser");
const cron = require('node-cron');
const Alert = require('./models/Alert');

const app = express();
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // Await the database connection before proceeding
    await connectDB();

    // Call createDefaultUser AFTER the connection is established
    createDefaultUser();

    // Load middleware and routes
    require("./middleware")(app);
    require("./routes")(app);

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// --- AUTOMATED ALERT MANAGEMENT ---
console.log('⏰ Scheduling automated alert management jobs...');

// Job 1: Auto-clear "Back to Normal" alerts after 1 minutes
// Runs every 30 seconds to check for alerts to clear.
cron.schedule('*/30 * * * * *', async () => {
    const cutoff = new Date(Date.now() - 1 * 60 * 1000); // 1 minutes ago
    try {
        await Alert.updateMany(
            // Find active, "back to normal" alerts older than 2 minutes
            { lifecycle: 'Active', isBackToNormal: true, dateTime: { $lte: cutoff } },
            // Move them to Recent and mark as Cleared
            { $set: { lifecycle: 'Recent', status: 'Cleared' } }
        );
    } catch (error) {
        console.error('Cron Job Error (Clear Normals):', error);
    }
});

// Job 2: Archive "Recent" alerts to "History" after 5 minutes
// Runs every minute to check for alerts to archive.
cron.schedule('* * * * *', async () => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    try {
        await Alert.updateMany(
            { lifecycle: 'Recent', dateTime: { $lte: cutoff } },
            { $set: { lifecycle: 'History' } }
        );
    } catch (error) {
        console.error('Cron Job Error (Archive Recents):', error);
    }
});

// This job permanently purges soft-deleted alerts after a grace period.
// It runs every 5 minutes to check for old records.
cron.schedule('*/10 * * * *', async () => {
    // 5 minutes ago is a safe buffer after the 10-second undo window.
    const cutoff = new Date(Date.now() - 15 * 1000); 
    
    try {
        const result = await Alert.deleteMany({
            isDeleted: true,
            deletedAt: { $lte: cutoff } // Find alerts deleted before the cutoff time
        });

        if (result.deletedCount > 0) {
            console.log(`✅ Cron Job (Purge): Successfully purged ${result.deletedCount} soft-deleted alerts.`);
        }
    } catch (error) {
        console.error('❌ Cron Job Error (Purge):', error);
    }
});

startServer();