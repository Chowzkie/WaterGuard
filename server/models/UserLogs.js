const mongoose = require('mongoose')

const userLogsSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateTime: { type: Date, default: Date.now},
    action: String,
    type: String,
    details: { type: mongoose.Schema.Types.Mixed, default: null } // Added to store maintenance info
}, { timestamps: true })

module.exports = mongoose.model("UserLog", userLogsSchema);
