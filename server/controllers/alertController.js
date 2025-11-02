const Alert = require('../models/Alert'); 
const User = require('../models/User');
const {createUserlog} = require('../helpers/createUserlog');
//  Get Alerts with filtering
exports.getAlerts = async (req, res) => {
    try {
        // Build a filter object from the query parameters in the URL
        const filter = {};
        if (req.query.lifecycle) {
            filter.lifecycle = req.query.lifecycle;
        }
        if (req.query.severity) {
            filter.severity = req.query.severity;
        }
        if (req.query.originator) {
            filter.originator = req.query.originator;
        }
        // Always exclude soft-deleted alerts unless explicitly requested
        filter.isDeleted = req.query.isDeleted === 'true' ? true : false;


        // Query the database using the filter object and sort by most recent
        const alerts = await Alert.find(filter).sort({ dateTime: -1 });

        res.status(200).json(alerts);
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ message: "Server error while fetching alerts" });
    }
};

// 2. Acknowledge an Alert
exports.acknowledgeAlert = async (req, res) => {
    try {
        
        const { userID } = req.body
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ message: "Acknowledging user not found." });
        }

        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found." });
        }
        // only update the acknowledged status. did not change the lifecycle or status, so the alert remains in the Active panel.
        alert.acknowledged = true;
        alert.acknowledgedBy = {
            username: user.username, 
            timestamp: new Date()
        };
        
        await alert.save();
        res.status(200).json(alert);

        createUserlog(userID, `Acknowledged alert: '${alert.type}' for device '${alert.originator}'.`, 'Acknowledgement');

    } catch (error) {
        console.error("Error acknowledging alert:", error);
        res.status(500).json({ message: "Server error while acknowledging alert." });
    }
};

// Delete History Alerts (Soft Delete)
exports.deleteHistoryAlerts = async (req, res) => {
    try {
        const { idsToDelete, userID } = req.body; // Expect an array of IDs
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToDelete' array." });
        }

        // Find the alerts to get their originator information
        const alertsToDelete = await Alert.find({ _id: { $in: idsToDelete } }).select('originator');
        
        // Extract unique originator IDs from the fetched alerts
        const originatorIDs = [...new Set(alertsToDelete.map(alert => alert.originator))];
        const originatorString = originatorIDs.join(', ');

        await Alert.updateMany(
            { _id: { $in: idsToDelete } },
            // Set isDeleted AND the new deletedAt timestamp
            { $set: { isDeleted: true, deletedAt: new Date() } }
        );

        //Logs the delete
        const deletedCount = idsToDelete.length;
        const plural = deletedCount > 1 ? 's' : "";
        await createUserlog(userID, `Deleted ${deletedCount} alert record${plural} from history. Originator(s) ${originatorString}`, "Deletion")

        res.status(200).json({ message: "Alerts marked as deleted." });
    } catch (error) {
        console.error("Error deleting alerts:", error);
        res.status(500).json({ message: "Server error while deleting alerts." });
    }
};

// Restore History Alerts
exports.restoreHistoryAlerts = async (req, res) => {
    try {
        const { idsToRestore, userID } = req.body; // Expect an array of IDs
        if (!idsToRestore || !Array.isArray(idsToRestore)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToRestore' array." });
        }

        const alertsToRestore = await Alert.find({ _id: { $in: idsToRestore } }).select('originator');
        const originatorIDs = [...new Set(alertsToRestore.map(alert => alert.originator))];
        const originatorString = originatorIDs.join(', ');

        await Alert.updateMany(
            { _id: { $in: idsToRestore } },
            // Set isDeleted to false and UNSET the deletedAt field
            { $set: { isDeleted: false }, $unset: { deletedAt: "" } }
        );

        const restoredCount = idsToRestore.length;
        const plural = restoredCount > 1 ? "s" : "";

        await createUserlog(userID, `Restored ${restoredCount} alert record${plural} from history. Originator(s) ${originatorString}`, "Restoration")

        res.status(200).json({ message: "Alerts restored." });
    } catch (error) {
        console.error("Error restoring alerts:", error);
        res.status(500).json({ message: "Server error while restoring alerts." });
    }
};
