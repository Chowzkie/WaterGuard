const mongoose = require('mongoose');

// This schema is a direct translation of the JSON structure you provided.
const deviceSchema = new mongoose.Schema({
  // We explicitly set _id to be a String to match your "PS01-DEV" format.
  _id: {
    type: String,
    required: true,
  },
  // Use to get the UserID
  userID: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true,
  },
  label: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  position: {
    type: [Number], // [Longitude, Latitude]
    required: true,
  },
  currentState: {
    status: { type: String, enum: ['Online', 'Offline', 'Error'], default: 'Offline' },
    pump: { type: String, enum: ['IDLE', 'FILLING', 'DRAINING', 'DELAY', 'OFF'], default: 'IDLE' },
    valve: { type: String, enum: ['OPEN', 'CLOSED'], default: 'CLOSED' },
    lastContact: { type: Date, default: () => new Date() }, // Sets current time on creation
    pumpCycle: {
      pausedPhase: { 
        type: String, 
        enum: ['FILLING', 'DRAINING', 'DELAY_AFTER_FILL', 'DELAY_AFTER_DRAIN', 'NONE'], 
        default: 'NONE' 
      },
      remainingTime_sec: { type: Number, default: 0 }
    },
    sensorStatus: {
      PH: {
        status: { type: String, default: 'Offline' },
        lastReadingTimestamp: { type: Date, default: () => new Date() }
      },
      TDS: {
        status: { type: String, default: 'Offline' },
        lastReadingTimestamp: { type: Date, default: () => new Date() }
      },
      TEMP: {
        status: { type: String, default: 'Offline' },
        lastReadingTimestamp: { type: Date, default: () => new Date() }
      },
      TURBIDITY: {
        status: { type: String, default: 'Offline' },
        lastReadingTimestamp: { type: Date, default: () => new Date() }
      }
    }
  },
  latestReading: {
    timestamp: { type: Date, default: () => new Date() },
    PH: { type: Number, default:0},
    TDS: { type: Number, default: 0 },
    TEMP: { type: Number, default: 0 },
    TURBIDITY: { type: Number, default: 0 },
  },
  commands: {
    setValve: { type: String, enum: ['OPEN', 'CLOSED', 'NONE'], default: 'NONE' },
    setPump: { type: String, enum: ['IDLE', 'FILL', 'DRAIN', 'NONE', 'OFF'], default: 'NONE' }
  },
  // Default configuration values are set
  configurations: {
    thresholds: {
      ph: {
        normalLow: { type: Number, default: 6.5 },
        normalHigh: { type: Number, default: 8.5 },
        warnLow: { type: Number, default: 6.4 },
        critLow: { type: Number, default: 6.0 },
        warnHigh: { type: Number, default: 8.6 },
        critHigh: { type: Number, default: 9.0 },
      },
      turbidity: {
        normalLow: { type: Number, default: 0 },
        normalHigh: { type: Number, default: 5 },
        warn: { type: Number, default: 5 },
        crit: { type: Number, default: 10 },
      },
      tds: {
        normalLow: { type: Number, default: 0 },
        normalHigh: { type: Number, default: 500 },
        warn: { type: Number, default: 500 },
        crit: { type: Number, default: 1000 },
      },
      temp: {
        normalLow: { type: Number, default: 10 },
        normalHigh: { type: Number, default: 30 },
        warnLow: { type: Number, default: 5 },
        critLow: { type: Number, default: 0 },
        warnHigh: { type: Number, default: 31 },
        critHigh: { type: Number, default: 35 },
      },
    },
    controls: {
      valveShutOff: {
        enabled: { type: Boolean, default: true },
        phLow: { type: Number, default: 5.9 },
        phHigh: { type: Number, default: 9.1 },
        turbidityCrit: { type: Number, default: 13 },
        tdsCrit: { type: Number, default: 1200 },
      },
      pumpCycleIntervals: {
        drain: { type: Number, default: 3 },
        delay: { type: Number, default: 1 },
        fill: { type: Number, default: 3 },
      },
      valveOpenOnNormal: {
        enabled: { type: Boolean, default: true },
      },
    },
    logging: {
      alertIntervals: {
        activeToRecent: { type: Number, default: 30 },
        recentToHistory: { type: Number, default: 5 },
      },
    },
  },
}, {
  // Add timestamps for createdAt and updatedAt fields
  timestamps: true,
  // Disable Mongoose's default _id generation
  _id: false,
});

// Create the model from the schema
const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
