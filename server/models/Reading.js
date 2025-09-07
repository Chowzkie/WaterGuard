    // server/models/Reading.js
    const mongoose = require('mongoose');

    const ReadingSchema = new mongoose.Schema({
        // The ID of the device that produced this reading (e.g., 'ps01-dev')
        deviceId: {
            type: String,
            required: true,
            index: true // Index this field for faster queries
        },
        // The exact time this reading was recorded
        timestamp: {
            type: Date,
            required: true,
            index: true // Also index by time for fast time-based lookups
        },
        // An object containing the actual sensor values
        reading: {
            PH: { type: Number },
            TDS: { type: Number },
            TEMP: { type: Number },
            TURBIDITY: { type: Number }
        }
    });

    module.exports = mongoose.model('Reading', ReadingSchema);
    
