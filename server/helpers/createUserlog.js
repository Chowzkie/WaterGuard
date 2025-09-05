const userLogModel = require('../models/UserLogs')

const createUserlog = async (userID, action, type ="Account") => {
    await userLogModel.create({
        userID,
        action,
        type
    })
};

module.exports = {createUserlog};