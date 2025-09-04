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
