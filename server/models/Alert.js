// server/models/Alert.js

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    // ----- Core Alert Information -----
    originator: { type: String, required: true, index: true }, // The Device ID. Indexed for fast queries.
    parameter: { type: String, required: true, index: true }, // 'pH', 'turbidity', etc. Indexed for fast filtering.
    type: { type: String, required: true }, // The human-readable alert message, e.g., "Critical Low pH level detected (5.8)"
    value: { type: Number }, // The actual sensor value that triggered the alert.
    severity: {
        type: String,
        required: true,
        enum: ['Normal', 'Warning', 'Critical'] // Ensures only these values are allowed.
    },
    note: { type: String }, // Optional extra info, e.g., 'Valve shut off'

    // ----- Lifecycle and State Management -----
    // This is the key field that replaces the three separate arrays from your frontend state.
    lifecycle: {
        type: String,
        required: true,
        enum: ['Active', 'Recent', 'History'], // Tracks where the alert is in the overall flow.
        default: 'Active',
        index: true // Indexed for quickly fetching all 'Active' alerts, etc.
    },
    status: {
        type: String,
        required: true,
        // The state of the alert itself (e.g., a 'History' alert can be 'Resolved' or 'Escalated').
        enum: ['Active', 'Resolved', 'Escalated', 'Cleared']
    },
    isBackToNormal: { type: Boolean, default: false }, // Special flag for "back to normal" notifications.

    // ----- Acknowledgment Tracking -----
    acknowledged: { type: Boolean, default: false },

    // ----- Timestamps -----
    dateTime: { type: Date, default: Date.now, index: true }, // When the alert was created. Indexed for sorting by date.

    // ----- Soft Deletion -----
    // We use a flag instead of truly deleting so we can restore it later.
    isDeleted: { type: Boolean, default: false, index: true }
});

module.exports = mongoose.model('Alert', alertSchema);