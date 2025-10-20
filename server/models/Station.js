const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema for maintenance details
const MaintenanceInfoSchema = new Schema({
    cause: { type: String, required: true },
    date: { type: String, required: true }, // Storing as string as in frontend
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
}, { _id: false }); // No separate _id for sub-documents

const StationSchema = new Schema({
    label: {
        type: String,
        required: [true, 'Station label is required.'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Station location is required.'],
        trim: true
    },
    deviceId: {
        type: String,
        ref: 'Device',  // Links to the 'Device' model
        unique: true,   // Ensures one device cannot be assigned to two stations
        sparse: true,   // Allows multiple stations to have a 'null' deviceId
        default: null
    },
    operation: {
        type: String,
        required: true,
        enum: ['On-going', 'Offline', 'Maintenance'],
        default: 'On-going'
    },
    maintenanceInfo: {
        type: MaintenanceInfoSchema,
        default: null
    }
});

module.exports = mongoose.model('Station', StationSchema);