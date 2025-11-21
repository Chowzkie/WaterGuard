const userLogModel = require('../models/UserLogs')

const createUserlog = async (userID, action, type ="Account", details = null) => {
    await userLogModel.create({
        userID,
        action,
        type,
        details 
    })
};

module.exports = {createUserlog};
