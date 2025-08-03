/**
 * @fileoverview Sensor Evaluation Logic
 * This file contains the core logic for evaluating sensor readings against predefined thresholds.
 * It's designed to be a pure function, easily movable to a backend service.
 */

// --- THRESHOLD DEFINITIONS ---

const THRESHOLDS = {
  pH: {
    critical: { low: 6.0, high: 9.0 }, // Critical if < 6.0 or > 9.0
    warning: { low: [6.0, 6.4], high: [8.6, 9.0] },
    normal: [6.5, 8.5],
  },
  turbidity: { // Unit: NTU
    critical: 10, // Critical if > 10
    warning: [5, 10], // Warning if > 5 and <= 10
    normal: [0, 5],
  },
  tds: { // Unit: mg/L
    critical: 1000, // Critical if > 1000
    warning: [500, 1000], // Warning if > 500 and <= 1000
    normal: [0, 500],
  },
  temp: { // Unit: °C
    critical: { low: 5, high: 35 }, // Critical if < 5 or > 35
    warning: { low: [5, 9], high: [31, 35] },
    normal: [10, 30],
  },
};

// --- HELPER FUNCTIONS ---

/**
 * Evaluates a single parameter against its thresholds.
 * @param {string} parameter - The name of the parameter (e.g., 'pH').
 * @param {number} value - The sensor reading value.
 * @returns {{severity: string, message: string, note?: string}} The evaluation result.
 */
const evaluateParameter = (parameter, value) => {
  const rules = THRESHOLDS[parameter];
  let result = { severity: 'Normal', message: `${parameter} is within the normal range.` };
  let note;

  switch (parameter) {
    case 'pH':
      if (value < rules.critical.low) {
        result = { severity: 'Critical', message: `Critical Low pH level detected (${value})` };
        note = 'Valve shut off';
      } else if (value > rules.critical.high) {
        result = { severity: 'Critical', message: `Critical High pH level detected (${value})` };
        note = 'Valve shut off';
      } else if ((value >= rules.warning.low[0] && value <= rules.warning.low[1]) || (value >= rules.warning.high[0] && value <= rules.warning.high[1])) {
        result = { severity: 'Warning', message: `pH level is nearing critical levels (${value})` };
      }
      break;

    case 'turbidity':
      if (value > rules.critical) {
        result = { severity: 'Critical', message: `Critical turbidity level detected (${value} NTU)` };
        note = 'Valve shut off';
      } else if (value > rules.normal[1] && value <= rules.warning[1]) {
        result = { severity: 'Warning', message: `High turbidity detected (${value} NTU)` };
      }
      break;

    case 'tds':
      if (value > rules.critical) {
        result = { severity: 'Critical', message: `Critical TDS level detected (${value} mg/L)` };
        note = 'Valve shut off';
      } else if (value > rules.normal[1] && value <= rules.warning[1]) {
        result = { severity: 'Warning', message: `High TDS detected (${value} mg/L)` };
      }
      break;

    case 'temp':
      if (value < rules.critical.low) {
        result = { severity: 'Critical', message: `Critical Low Temperature detected (${value}°C)` };
      } else if (value > rules.critical.high) {
        result = { severity: 'Critical', message: `Critical High Temperature detected (${value}°C)` };
      } else if (value >= rules.warning.low[0] && value <= rules.warning.low[1]) {
        result = { severity: 'Warning', message: `Low Temperature detected (${value}°C)` };
      } else if (value >= rules.warning.high[0] && value <= rules.warning.high[1]) {
        result = { severity: 'Warning', message: `High Temperature detected (${value}°C)` };
      }
      break;

    default:
      break;
  }

  // Add the shut-off note if applicable
  if (note) {
    result.note = note;
  }

  return result;
};

// --- MAIN EXPORTED FUNCTION ---

/**
 * Processes a raw sensor reading and generates alerts based on threshold rules.
 * @param {object} reading - The sensor data object (e.g., { deviceId, timestamp, pH, ... }).
 * @returns {Array} An array of alert objects for any parameter that is not 'Normal'.
 */
const evaluateSensorReading = (reading) => { // Changed from 'export const' to 'const'
  const alerts = [];
  const parameters = ['pH', 'turbidity', 'temp', 'tds'];

  parameters.forEach(param => {
    if (reading[param] !== undefined) {
      const value = reading[param];
      const result = evaluateParameter(param, value);

      const alert = {
        parameter: param,
        value: value,
        severity: result.severity,
        type: result.message,
        originator: reading.deviceId,
        dateTime: new Date(reading.timestamp).toLocaleString(),
        status: 'Active',
        ...(result.note && { note: result.note }),
      };
      
      alerts.push(alert);
    }
  });

  return alerts;
};

module.exports = {
  evaluateSensorReading
};