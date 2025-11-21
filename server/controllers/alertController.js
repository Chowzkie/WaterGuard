// controllers/alertController.js

const Alert = require('../models/Alert'); 
const User = require('../models/User');
const {createUserlog} = require('../helpers/createUserlog');

/**
 * @desc    Get Alerts with filtering
 * @route   GET /api/alerts
 * @access  Private
 * Function to retrieve a list of alerts based on dynamic query parameters.
 * Allows the frontend to filter by status, severity, or device.
 */
exports.getAlerts = async (req, res) => {
    try {
        // --- Filter Construction ---
        // Initialize an empty filter object to build the MongoDB query
        const filter = {};

        // Check for specific query parameters and add them to the filter if present
        if (req.query.lifecycle) {
            filter.lifecycle = req.query.lifecycle; // e.g., 'Active' or 'Recent'
        }
        if (req.query.severity) {
            filter.severity = req.query.severity; // e.g., 'Critical' or 'Warning'
        }
        if (req.query.originator) {
            filter.originator = req.query.originator; // Filter by specific device name
        }

        // --- Soft Delete Handling ---
        // By default, only show non-deleted alerts (isDeleted: false).
        // Only include deleted alerts if the client explicitly requests them (isDeleted=true).
        filter.isDeleted = req.query.isDeleted === 'true' ? true : false;

        // --- Database Query ---
        // Execute the find operation using the constructed filter
        // Sort by 'dateTime' in descending order (-1) to show the newest alerts first
        const alerts = await Alert.find(filter).sort({ dateTime: -1 });

        // Return the list of alerts with a 200 OK status
        res.status(200).json(alerts);

    } catch (error) {
        // Log error details for server-side debugging
        console.error("Error fetching alerts:", error);
        res.status(500).json({ message: "Server error while fetching alerts" });
    }
};

/**
 * @desc    Acknowledge an Alert
 * @route   PUT /api/alerts/:id/acknowledge
 * @access  Private
 * Function to mark an active alert as "seen" by an operator.
 * This updates the alert metadata but does not remove it from the Active list.
 */
exports.acknowledgeAlert = async (req, res) => {
    try {
        // Extract the User ID of the person acknowledging the alert
        const { userID } = req.body
        
        // --- Validation ---
        // Verify the user exists in the database to ensure accountability
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "Acknowledging user not found." });
        }

        // Verify the specific alert exists
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found." });
        }

        // --- State Update ---
        // Mark the alert as acknowledged and record who did it and when.
        // Note: The 'lifecycle' status is NOT changed here, so the alert remains 'Active'.
        alert.acknowledged = true;
        alert.acknowledgedBy = {
            username: user.username, 
            timestamp: new Date()
        };
        
        // --- Database Storage ---
        // Save the modified alert document back to the database
        await alert.save();
        
        // Send the updated alert object back to the client immediately
        res.status(200).json(alert);

        // Log this interaction in the user activity log
        createUserlog(userID, `Acknowledged alert: '${alert.type}' for device '${alert.originator}'.`, 'Acknowledgement');

    } catch (error) {
        console.error("Error acknowledging alert:", error);
        res.status(500).json({ message: "Server error while acknowledging alert." });
    }
};

/**
 * @desc    Delete History Alerts (Soft Delete)
 * @route   PUT /api/alerts/delete-history
 * @access  Private
 * Function to perform a "Soft Delete" on multiple alerts at once.
 * The data remains in the database but is hidden from standard views.
 */
exports.deleteHistoryAlerts = async (req, res) => {
    try {
        // Expect an array of Alert IDs to delete
        const { idsToDelete, userID } = req.body; 
        
        // Validate input is a proper array
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToDelete' array." });
        }

        // --- Pre-calculation for Logging ---
        // Fetch the alerts first to retrieve their 'originator' names.
        // This is necessary because the updateMany() result doesn't return the document details needed for the log.
        const alertsToDelete = await Alert.find({ _id: { $in: idsToDelete } }).select('originator');
        
        // Extract unique originator names to create a readable summary string (e.g., "Pump A, Sensor B")
        const originatorIDs = [...new Set(alertsToDelete.map(alert => alert.originator))];
        const originatorString = originatorIDs.join(', ');

        // --- Bulk Soft Delete ---
        // Update all matching documents in a single database operation.
        // Sets 'isDeleted' to true and records the exact time of deletion.
        await Alert.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { isDeleted: true, deletedAt: new Date() } }
        );

        // --- Audit Logging ---
        // Log the bulk action with details on how many records were affected
        const deletedCount = idsToDelete.length;
        const plural = deletedCount > 1 ? 's' : "";
        await createUserlog(userID, `Deleted ${deletedCount} alert record${plural} from history. Originator(s) ${originatorString}`, "Deletion")

        res.status(200).json({ message: "Alerts marked as deleted." });

    } catch (error) {
        console.error("Error deleting alerts:", error);
        res.status(500).json({ message: "Server error while deleting alerts." });
    }
};

/**
 * @desc    Restore History Alerts
 * @route   PUT /api/alerts/restore-history
 * @access  Private
 * Function to recover previously soft-deleted alerts.
 * Makes them visible again in the history views.
 */
exports.restoreHistoryAlerts = async (req, res) => {
    try {
        // Expect an array of Alert IDs to restore
        const { idsToRestore, userID } = req.body; 
        
        // Validate input
        if (!idsToRestore || !Array.isArray(idsToRestore)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToRestore' array." });
        }

        // --- Pre-calculation for Logging ---
        // Fetch alerts to get originator names for the audit log
        const alertsToRestore = await Alert.find({ _id: { $in: idsToRestore } }).select('originator');
        const originatorIDs = [...new Set(alertsToRestore.map(alert => alert.originator))];
        const originatorString = originatorIDs.join(', ');

        // --- Bulk Restoration ---
        // Update all matching documents in a single database operation.
        // 1. Set 'isDeleted' back to false.
        // 2. Use '$unset' to completely remove the 'deletedAt' field from the document.
        await Alert.updateMany(
            { _id: { $in: idsToRestore } },
            { $set: { isDeleted: false }, $unset: { deletedAt: "" } }
        );

        // --- Audit Logging ---
        const restoredCount = idsToRestore.length;
        const plural = restoredCount > 1 ? "s" : "";

        await createUserlog(userID, `Restored ${restoredCount} alert record${plural} from history. Originator(s) ${originatorString}`, "Restoration")

        res.status(200).json({ message: "Alerts restored." });

    } catch (error) {
        console.error("Error restoring alerts:", error);
        res.status(500).json({ message: "Server error while restoring alerts." });
    }
};