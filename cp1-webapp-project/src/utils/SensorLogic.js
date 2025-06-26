// src/utils/sensorLogic.js

/**
 * @fileoverview Sensor Evaluation Logic
 * This file contains the core logic for evaluating sensor readings against predefined thresholds.
 * It's designed to be a pure function, easily movable to a backend service.
 */

// --- THRESHOLD DEFINITIONS ---

const THRESHOLDS = {
  pH: {
    CRITICAL_LOW: 6.0,
    WARNING_LOW: 6.4,
    NORMAL_MIN: 6.5,
    NORMAL_MAX: 8.5,
    WARNING_HIGH: 8.6,
    CRITICAL_HIGH: 9.0,
  },
  turbidity: { // Unit: NTU
    NORMAL_MAX: 5,
    WARNING_MAX: 10,
    CRITICAL_MIN: 10.01,
  },
  temp: { // Unit: °C
    NORMAL_MAX: 35,
    WARNING_MIN: 35.01,
  },
  tds: { // Unit: ppm
    NORMAL_MAX: 999,
    WARNING_MAX: 1200,
    CRITICAL_MIN: 1200.01,
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
      if (value < rules.CRITICAL_LOW || value > rules.CRITICAL_HIGH) {
        result = { severity: 'Critical', message: `Critical pH level detected (${value})` };
        note = 'Value shut off';
      } else if ((value >= rules.CRITICAL_LOW && value <= rules.WARNING_LOW) || (value >= rules.WARNING_HIGH && value <= rules.CRITICAL_HIGH)) {
        result = { severity: 'Warning', message: `pH level is nearing critical levels (${value})` };
      }
      break;

    case 'turbidity':
      if (value >= rules.CRITICAL_MIN) {
        result = { severity: 'Critical', message: `Critical turbidity level detected (${value} NTU)` };
        note = 'Value shut off';
      } else if (value > rules.NORMAL_MAX && value < rules.CRITICAL_MIN) {
        result = { severity: 'Warning', message: `High turbidity detected (${value} NTU)` };
      }
      break;

    case 'temp':
      if (value >= rules.WARNING_MIN) {
        result = { severity: 'Warning', message: `High temperature detected (${value}°C)` };
      }
      break;

    case 'tds':
      if (value >= rules.CRITICAL_MIN) {
        result = { severity: 'Critical', message: `Critical TDS level detected (${value} ppm)` };
      } else if (value > rules.NORMAL_MAX && value <= rules.WARNING_MAX) {
        result = { severity: 'Warning', message: `High TDS detected (${value} ppm)` };
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
export const evaluateSensorReading = (reading) => {
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