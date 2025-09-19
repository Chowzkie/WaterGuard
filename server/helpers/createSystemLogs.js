const SystemLogModel = require("../models/SystemLogs");

const createSystemLogs = async (readingsID, deviceID, details, stats) => {
    await SystemLogModel.create({
        readingsID,
        deviceID,
        details,
        stats,
    });
};

module.exports = {createSystemLogs};