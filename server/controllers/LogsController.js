// controllers/LogsController.js

const UserLogModel = require('../models/UserLogs');
const SystemLogModel = require('../models/SystemLogs');

/**
 * @desc    Get User Logs
 * @route   GET /api/logs/user
 * @access  Private
 * Function to retrieve the complete history of user activities.
 * Fetches all documents without filtering.
 */
exports.getUserLogs = async (req, res) => {
    try{
        // Query the database for all user log entries
        const Userlogs = await UserLogModel.find({}); 
        res.json(Userlogs);
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Server Error"});
    }
}

/**
 * @desc    Delete User Logs
 * @route   DELETE /api/logs/user
 * @access  Private
 * Function to permanently remove specific user logs from the database.
 * Accepts an array of IDs to allow for batch deletion.
 */
exports.deleteUserLogs = async (req, res) => {
    try{
        // Extract the array of IDs from the request body
        const { ids } = req.body 

        // --- Validation ---
        // Ensure the input is a non-empty array
        if(!ids || !Array.isArray(ids) || ids.length === 0){
            res.status(400).json({message: "no IDS provided"});
        };

        // --- Batch Deletion ---
        // Use the $in operator to match any document whose _id is contained in the provided array
        const result = await UserLogModel.deleteMany({_id: {$in: ids}}); 

        // Return the count of deleted documents
        res.status(200).json({
            message: `${result.deletedCount} log(s) sucessfully deleted`,
            deletedCount: result.deletedCount
        })
    }catch (error){
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

/**
 * @desc    Restore User Logs
 * @route   POST /api/logs/user/restore
 * @access  Private
 * Function to restore previously archived or deleted logs.
 * Handles re-mapping of ID fields to ensure MongoDB compatibility.
 */
exports.restoreUserLogs = async (req, res) => {
    try {
        // The frontend sends an array of full log objects that were stored in a history/archive state
        const { logs } = req.body;

        // Validate input array
        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: "No log data provided for restoration." });
        }

        // --- Bulk Insertion with Remapping ---
        // Iterate through the logs to restructure the ID field.
        // Frontend objects typically use 'id', but MongoDB requires '_id'.
        const result = await UserLogModel.insertMany(logs.map(log => {
            const { id, ...rest } = log;
            // Spread the rest of the data and manually assign the _id
            return { ...rest, _id: id };
        }));

        res.status(201).json({ 
            message: `${result.length} log(s) successfully restored.`,
            restoredCount: result.length,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

// =================================================================================
// SYSTEM LOGS
// =================================================================================

/**
 * @desc    Get System Logs
 * @route   GET /api/logs/system
 * @access  Private
 * Function to retrieve system logs with dynamic filtering capabilities.
 * Supports filtering by date and read status, and limits results for performance.
 */
exports.getSystemLogs = async (req, res) => {
    try {
        // Extract query parameters
        const { since, read } = req.query;
        let filter = {};

        // --- Date Filtering ---
        // If a 'since' date is provided, filter logs created after that timestamp
        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate)) {
                filter.createdAt = { $gte: sinceDate };
            } else {
                return res.status(400).json({ message: "Invalid 'since' date format." });
            }
        }
        
        // --- Status Filtering ---
        // Filter logs based on whether they have been read or not
        if (read === 'true' || read === 'false') {
            filter.read = read === 'true';
        }
        
        // --- Execution ---
        // 1. Apply the constructed filter
        // 2. Sort by 'createdAt' in descending order (-1) to show newest logs first
        // 3. Limit the result set to 50 documents to optimize network payload
        const SystemLogs = await SystemLogModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(50); 
            
        res.json(SystemLogs);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * @desc    Delete System Logs
 * @route   DELETE /api/logs/system
 * @access  Private
 * Function to permanently remove specific system logs from the database.
 */
exports.deleteSystemLogs = async (req,res) => {
    try{
        const { ids } = req.body; // Expects an array of IDs

        // Validate input
        if(!ids || !Array.isArray(ids) || ids.length === 0){
            res.status(400).json({message: "no IDS provided"});
        };

        // Perform batch deletion using the ID list
        const result = await SystemLogModel.deleteMany({_id: {$in: ids}});

        res.status(200).json({
            message: `${result.deletedCount} log(s) sucessfully deleted`,
            deletedCount: result.deletedCount
        });

    }catch(error){
        console.error(error);
        res.status(500).json({message: "Server Error"})
    }
}

/**
 * @desc    Restore System Logs
 * @route   POST /api/logs/system/restore
 * @access  Private
 * Function to restore system logs from an archive state.
 */
exports.restoreSystemLogs = async (req, res) => {
    try {
        // Extract logs array from body
        const { logs } = req.body;

        // Validate input
        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: "No log data provided for restoration." });
        }

        // --- Bulk Insertion ---
        // Remap 'id' to '_id' before inserting into MongoDB
        const result = await SystemLogModel.insertMany(logs.map(log => {
            const { id, ...rest } = log;
            return { ...rest, _id: id };
        }));

        res.status(201).json({ 
            message: `${result.length} log(s) successfully restored.`,
            restoredCount: result.length,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

/**
 * @desc    Mark Single Log as Read
 * @route   PUT /api/logs/system/:id/read
 * @access  Private
 * Function to update the status of a specific log entry to 'read'.
 */
exports.markLogAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find the log by ID and update the 'read' field to true
        // { new: true } ensures the response contains the updated document
        const updatedLog = await SystemLogModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true } 
        );

        if (!updatedLog) {
            return res.status(404).json({ message: "Log not found." });
        }
        res.json(updatedLog);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * @desc    Mark Multiple Logs as Read
 * @route   PUT /api/logs/system/read-all
 * @access  Private
 * Function to batch update multiple logs to 'read' status.
 * Useful for "Mark all as read" functionality.
 */
exports.markAllLogsAsRead = async (req, res) => {
    try {
        const { ids } = req.body; // Expect an array of log IDs

        // Validate input
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No log IDs provided." });
        }

        // Update all documents matching the IDs in the provided array
        const result = await SystemLogModel.updateMany(
            { _id: { $in: ids } }, 
            { read: true }
        );

        res.status(200).json({ 
            message: `Successfully marked ${result.modifiedCount} logs as read.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};