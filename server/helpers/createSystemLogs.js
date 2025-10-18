const SystemLogModel = require("../models/SystemLogs");

const createSystemLogs = async (readingsID, deviceId, component ,details, stats) => {
    await SystemLogModel.create({
        readingsID,
        deviceId: deviceId ? deviceId.toUpperCase() : null,
        component,
        details,
        stats,
    });
};

module.exports = {createSystemLogs};