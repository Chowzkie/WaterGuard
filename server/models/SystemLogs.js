const mongoose = require('mongoose')

const SystemLogsSchema = new mongoose.Schema({
    dateTime: { type: Date, default: Date.now},
    readingsID: {type: mongoose.Schema.Types.ObjectId, ref: "Readings", required: false},
    deviceId: {type: mongoose.Schema.Types.String, ref: "Devices", required: false},
    component: String,
    details: String,
    stats: String,
}, {timestamps: true});

module.exports = mongoose.model("SystemLog", SystemLogsSchema);