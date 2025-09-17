/**
 * @fileoverview Sensor Evaluation Logic
 * This file contains the core logic for evaluating sensor readings against predefined thresholds.
 * It's designed to be a pure function that uses configurations passed to it.
 */


// --- HELPER FUNCTIONS ---

/**
 * Evaluates a single parameter against its thresholds.
 * @param {string} parameter - The name of the parameter (e.g., 'pH').
 * @param {number} value - The sensor reading value.
 * @param {object} thresholds - The device-specific thresholds object (e.g., device.configurations.thresholds).
 * @returns {{severity: string, message: string, note?: string}} The evaluation result.
 */
const evaluateParameter = (parameter, value, thresholds) => {
  // Get the specific rules for the parameter from the passed-in thresholds
  const rules = thresholds[parameter.toLowerCase()]; // Use toLowerCase() to match schema keys (pH -> ph)
  if (!rules) {
      // If no configuration exists for this parameter, return Normal.
      return { severity: 'Normal', message: `No configuration for ${parameter}.` };
  }

  let result = { severity: 'Normal', message: `${parameter} is within the normal range.` };
  let note;

  switch (parameter) {
    case 'pH':
      if (value < rules.critLow) {
        result = { severity: 'Critical', message: `Critical Low pH level detected (${value})` };
        note = 'Valve shut off';
      } else if (value > rules.critHigh) {
        result = { severity: 'Critical', message: `Critical High pH level detected (${value})` };
        note = 'Valve shut off';
      } else if ((value >= rules.critLow && value <= rules.warnLow) || (value >= rules.warnHigh && value <= rules.critHigh)) {
        result = { severity: 'Warning', message: `pH level is nearing critical levels (${value})` };
      }
      break;

    case 'turbidity':
      if (value > rules.crit) {
        result = { severity: 'Critical', message: `Critical turbidity level detected (${value} NTU)` };
        note = 'Valve shut off';
      } else if (value > rules.warn && value <= rules.crit) {
        result = { severity: 'Warning', message: `High turbidity detected (${value} NTU)` };
      }
      break;

    case 'tds':
      if (value > rules.crit) {
        result = { severity: 'Critical', message: `Critical TDS level detected (${value} mg/L)` };
        note = 'Valve shut off';
      } else if (value > rules.warn && value <= rules.crit) {
        result = { severity: 'Warning', message: `High TDS detected (${value} mg/L)` };
      }
      break;

    case 'temp':
      if (value < rules.critLow) {
        result = { severity: 'Critical', message: `Critical Low Temperature detected (${value}°C)` };
      } else if (value > rules.critHigh) {
        result = { severity: 'Critical', message: `Critical High Temperature detected (${value}°C)` };
      } else if ((value >= rules.critLow && value <= rules.warnLow) || (value >= rules.warnHigh && value <= rules.critHigh)) {
        result = { severity: 'Warning', message: `Temperature is nearing critical levels (${value}°C)` };
      }
      break;

    default:
      break;
  }

  if (note) {
    result.note = note;
  }

  return result;
};

// --- MAIN EXPORTED FUNCTION ---

/**
 * Processes a raw sensor reading and generates alerts based on threshold rules.
 * @param {object} reading - The sensor data object (e.g., { deviceId, timestamp, pH, ... }).
 * @param {object} deviceConfigs - The full configuration object for the specific device.
 * @returns {Array} An array of alert objects for any parameter that is not 'Normal'.
 */
const evaluateSensorReading = (reading, deviceConfigs) => {
  const alerts = [];
  // Ensure we have thresholds to work with
  if (!deviceConfigs || !deviceConfigs.thresholds) {
      console.error("Device configuration or thresholds are missing.");
      return [];
  }
  const deviceThresholds = deviceConfigs.thresholds;
  const parameters = ['pH', 'turbidity', 'temp', 'tds'];

  parameters.forEach(param => {
    if (reading[param] !== undefined) {
      const value = reading[param];
      // Pass the device-specific thresholds to the evaluation function
      const result = evaluateParameter(param, value, deviceThresholds);

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