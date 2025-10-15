const SystemLogModel = require("../models/SystemLogs");

const createSystemLogs = async (readingsID, deviceID, component ,details, stats) => {
    await SystemLogModel.create({
        readingsID,
        deviceID,
        component,
        details,
        stats,
    });
};

module.exports = {createSystemLogs};