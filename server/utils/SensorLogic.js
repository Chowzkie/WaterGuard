/**
 * @fileoverview Sensor Evaluation Logic
 * This file contains the core logic for evaluating sensor readings against predefined thresholds.
 * It's designed to be a pure function that uses configurations passed to it.
 */

// --- HELPER FUNCTIONS ---

/**
 * Evaluates a single parameter against its thresholds and automation controls.
 * @param {string} parameter - The name of the parameter (pH, turbidity, etc.)
 * @param {number} value - The sensor reading value.
 * @param {object} configs - The full device configuration object (thresholds + controls).
 * @returns {{severity: string, message: string, note?: string}} The evaluation result.
 */
const evaluateParameter = (parameter, value, configs) => {
  // 1. Extract Thresholds for Severity Evaluation
  const thresholds = configs.thresholds[parameter.toLowerCase()]; 
  
  if (!thresholds) {
      // No configuration exists for this parameter; return Normal.
      return { severity: 'Normal', message: `No configuration for ${parameter}.` };
  }

  let result = { severity: 'Normal', message: `${parameter} is within the normal range (${value}).` };
  let note = null;

  // 2. Determine Severity (Critical vs Warning vs Normal) based on 'thresholds'
  switch (parameter) {
    case 'pH':
      if (value < thresholds.critLow) {
        result = { severity: 'Critical', message: `Critical Low pH level detected (${value})` };
      } else if (value > thresholds.critHigh) {
        result = { severity: 'Critical', message: `Critical High pH level detected (${value})` };
      } else if ((value >= thresholds.critLow && value <= thresholds.warnLow) || (value >= thresholds.warnHigh && value <= thresholds.critHigh)) {
        result = { severity: 'Warning', message: `pH level is nearing critical levels (${value})` };
      }
      break;

    case 'turbidity':
      if (value > thresholds.crit) {
        result = { severity: 'Critical', message: `Critical turbidity level detected (${value} NTU)` };
      } else if (value > thresholds.warn && value <= thresholds.crit) {
        result = { severity: 'Warning', message: `High turbidity detected (${value} NTU)` };
      }
      break;

    case 'tds':
      if (value > thresholds.crit) {
        result = { severity: 'Critical', message: `Critical TDS level detected (${value} mg/L)` };
      } else if (value > thresholds.warn && value <= thresholds.crit) {
        result = { severity: 'Warning', message: `High TDS detected (${value} mg/L)` };
      }
      break;

    case 'temp':
      // Temp usually doesn't trigger valves, but follows standard logic
      if (value < thresholds.critLow) {
        result = { severity: 'Critical', message: `Critical Low Temperature detected (${value}°C)` };
      } else if (value > thresholds.critHigh) {
        result = { severity: 'Critical', message: `Critical High Temperature detected (${value}°C)` };
      } else if ((value >= thresholds.critLow && value <= thresholds.warnLow) || (value >= thresholds.warnHigh && value <= thresholds.critHigh)) {
        result = { severity: 'Warning', message: `Temperature is nearing critical levels (${value}°C)` };
      }
      break;

    default:
      break;
  }

  // 3. Determine "Valve shut off" Note based on 'controls'
  // The note is added ONLY if the automation system is actually configured to act on this reading.
  if (configs.controls && configs.controls.valveShutOff) {
    const shutOff = configs.controls.valveShutOff;
    
    // Proceed only if Master Shutoff is ENABLED
    if (shutOff.enabled) {
      
      // Check pH Logic
      if (parameter === 'pH' && shutOff.triggerPH) {
        // Compare against the specific shutoff limits, not the general thresholds
        if (value < shutOff.phLow || value > shutOff.phHigh) {
          note = 'Valve shut off';
        }
      }

      // Check Turbidity Logic
      if (parameter === 'turbidity' && shutOff.triggerTurbidity) {
        if (value > shutOff.turbidityCrit) {
          note = 'Valve shut off';
        }
      }

      // Check TDS Logic
      if (parameter === 'tds' && shutOff.triggerTDS) {
        if (value > shutOff.tdsCrit) {
          note = 'Valve shut off';
        }
      }
    }
  }

  // Attach the note if one was generated
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
  
  // Ensure configs exist
  if (!deviceConfigs || !deviceConfigs.thresholds) {
      console.error("Device configuration or thresholds are missing.");
      return [];
  }

  const parameters = ['pH', 'turbidity', 'temp', 'tds'];

  parameters.forEach(param => {
    if (reading[param] !== undefined) {
      const value = reading[param];
      
      // Pass the FULL configuration object (thresholds + controls)
      const result = evaluateParameter(param, value, deviceConfigs);

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