const UserLogModel = require('../models/UserLogs');
const SystemLogModel = require('../models/SystemLogs');

exports.getUserLogs = async (req, res) => {
    try{
        const Userlogs = await UserLogModel.find({}); //Fetch all document in database
        res.json(Userlogs);
    }catch(error){
        console.error(error);
        res.status(500).json({message: "Server Error"});
    }
}

exports.deleteUserLogs = async (req, res) => {
    try{
        const { ids } = req.body //use to recieve the array of IDS in the frontend

        if(!ids || !Array.isArray(ids) || ids.length === 0){
            res.status(400).json({message: "no IDS provided"});
        };

        const result = await UserLogModel.deleteMany({_id: {$in: ids}}); //use to delete logs base on id

        res.status(200).json({
            message: `${result.deletedCount} log(s) sucessfully deleted`,
            deletedCount: result.deletedCount
        })
    }catch (error){
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
}

exports.restoreUserLogs = async (req, res) => {
    try {
        // The frontend will send an array of full log objects
        const { logs } = req.body;

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: "No log data provided for restoration." });
        }

        // Use insertMany to add the logs back to the database
        const result = await UserLogModel.insertMany(logs.map(log => {
            // Remove the temporary 'id' field added on the frontend
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

// =================================================================================
// SYSTEM LOGS (MODIFIED & NEW)
// =================================================================================

exports.getSystemLogs = async (req, res) => {
    try {
        // --- MODIFIED: Add filter logic ---
        const { since, read } = req.query;
        let filter = {};

        // Filter by date (e.g., all logs since 24 hours ago)
        if (since) {
            const sinceDate = new Date(since);
            if (!isNaN(sinceDate)) {
                filter.createdAt = { $gte: sinceDate };
            } else {
                return res.status(400).json({ message: "Invalid 'since' date format." });
            }
        }
        
        // Filter by read status (e.g., ?read=false)
        if (read === 'true' || read === 'false') {
            filter.read = read === 'true';
        }
        
        // Fetch logs with the applied filter, sort by newest first, limit to 50
        const SystemLogs = await SystemLogModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(50); 
            
        res.json(SystemLogs);
    } catch (error) {
        console.error(error); // Corrected typo from 'errpr'
        res.status(500).json({ message: "Server Error" });
    }
};

exports.deleteSystemLogs = async (req,res) => {
    try{
        const { ids } = req.body;

        if(!ids || !Array.isArray(ids) || ids.length === 0){
            res.status(400).json({message: "no IDS provided"});
        };

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

exports.restoreSystemLogs = async (req, res) => {
    try {
        // The frontend will send an array of full log objects
        const { logs } = req.body;

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(400).json({ message: "No log data provided for restoration." });
        }

        // Use insertMany to add the logs back to the database
        const result = await SystemLogModel.insertMany(logs.map(log => {
            // Remove the temporary 'id' field added on the frontend
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

// --- NEW CONTROLLER: Mark a single log as read ---
exports.markLogAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedLog = await SystemLogModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true } // Return the updated document
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

// --- NEW CONTROLLER: Mark multiple logs as read ---
exports.markAllLogsAsRead = async (req, res) => {
    try {
        const { ids } = req.body; // Expect an array of log IDs

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No log IDs provided." });
        }

        const result = await SystemLogModel.updateMany(
            { _id: { $in: ids } }, // Find all logs with an ID in the provided array
            { read: true }
        );

        // --- FIX: Changed result.nModified to result.modifiedCount ---
        res.status(200).json({ 
            message: `Successfully marked ${result.modifiedCount} logs as read.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};