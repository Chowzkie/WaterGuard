const mongoose = require('mongoose')

const SystemLogsSchema = new mongoose.Schema({
    readingsID: {type: mongoose.Schema.Types.ObjectId, ref: "Readings", required: true},
    deviceID: {type: mongoose.Schema.Types.String, ref: "Devices", required: true},
    details: String,
    stats: String,
}, {timestamps: true});

module.exports = mongoose.model("SystemLog", SystemLogsSchema);