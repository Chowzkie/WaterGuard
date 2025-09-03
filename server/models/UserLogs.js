const mongoose = require('mongoose')

const userLogsSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateTime: { type: Date, default: Date.now},
    action: String,
    type: String,
}, { timestamps: true })

module.exports = mongoose.model("UserLog", userLogsSchema);