// server/controllers/alertController.js

const Alert = require('../models/Alert'); // Import the Alert model

// 1. Get Alerts (with filtering)
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
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found." });
        }
        
        // --- THIS IS THE FIX ---
        // We ONLY update the acknowledged status. We do NOT change the
        // lifecycle or status, so the alert remains in the Active panel.
        alert.acknowledged = true;
        alert.acknowledgedBy = {
            username: req.body.username || 'system.user',
            timestamp: new Date()
        };
        
        await alert.save();
        res.status(200).json(alert);

    } catch (error) {
        console.error("Error acknowledging alert:", error);
        res.status(500).json({ message: "Server error while acknowledging alert." });
    }
};

// 3. Delete History Alerts (Soft Delete)
exports.deleteHistoryAlerts = async (req, res) => {
    try {
        const { idsToDelete } = req.body; // Expect an array of IDs
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToDelete' array." });
        }
        await Alert.updateMany(
            { _id: { $in: idsToDelete } },
            { $set: { isDeleted: true } }
        );
        res.status(200).json({ message: "Alerts marked as deleted." });
    } catch (error) {
        console.error("Error deleting alerts:", error);
        res.status(500).json({ message: "Server error while deleting alerts." });
    }
};

// 4. Restore History Alerts
exports.restoreHistoryAlerts = async (req, res) => {
    try {
        const { idsToRestore } = req.body; // Expect an array of IDs
        if (!idsToRestore || !Array.isArray(idsToRestore)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToRestore' array." });
        }
        await Alert.updateMany(
            { _id: { $in: idsToRestore } },
            { $set: { isDeleted: false } }
        );
        res.status(200).json({ message: "Alerts restored." });
    } catch (error) {
        console.error("Error restoring alerts:", error);
        res.status(500).json({ message: "Server error while restoring alerts." });
    }
};

// 5. Permanently deletes alerts from the database.
exports.permanentlyDeleteAlerts = async (req, res) => {
    try {
        const { idsToDelete } = req.body;
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return res.status(400).json({ message: "Invalid request body. Expected 'idsToDelete' array." });
        }
        
        // Use Mongoose's deleteMany to permanently remove the documents.
        const result = await Alert.deleteMany({ _id: { $in: idsToDelete } });

        res.status(200).json({ message: "Alerts permanently deleted.", deletedCount: result.deletedCount });
    } catch (error) {
        console.error("Error permanently deleting alerts:", error);
        res.status(500).json({ message: "Server error while permanently deleting alerts." });
    }
};