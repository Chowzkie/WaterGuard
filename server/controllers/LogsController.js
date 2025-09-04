const UserLogModel = require('../models/UserLogs');

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