const evaluateParameter = (parameter, value, configs) => {
  // 1. Configuration Retrieval
  // Extract the specific threshold limits (Warning/Critical) for this parameter.
  const thresholds = configs.thresholds[parameter.toLowerCase()]; 
  
  if (!thresholds) {
      // Fallback: If no configuration exists, assume the reading is Normal to prevent errors.
      return { severity: 'Normal', message: `No configuration for ${parameter}.` };
  }

  let result = { severity: 'Normal', message: `${parameter} is within the normal range (${value}).` };
  let note = null;

  // 2. Severity Determination
  // Compares the current value against the defined 'Warning' and 'Critical' brackets.
  // Logic varies by parameter type (e.g., pH checks both High and Low, while Turbidity checks only High).
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
      // Turbidity is a "ceiling" metric; higher values are worse.
      if (value > thresholds.crit) {
        result = { severity: 'Critical', message: `Critical turbidity level detected (${value} NTU)` };
      } else if (value > thresholds.warn && value <= thresholds.crit) {
        result = { severity: 'Warning', message: `High turbidity detected (${value} NTU)` };
      }
      break;

    case 'tds':
      // TDS is a "ceiling" metric; higher values indicate more dissolved solids.
      if (value > thresholds.crit) {
        result = { severity: 'Critical', message: `Critical TDS level detected (${value} mg/L)` };
      } else if (value > thresholds.warn && value <= thresholds.crit) {
        result = { severity: 'Warning', message: `High TDS detected (${value} mg/L)` };
      }
      break;

    case 'temp':
      // Temperature follows a range logic (Low/High) similar to pH.
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

  // 3. Automation Trigger Evaluation
  // Determines if this specific reading qualifies as a trigger for the automatic valve shut-off.
  // This logic is distinct from Severity; a 'Critical' severity does not always imply a shut-off 
  // unless explicitly enabled in the 'controls' configuration.
  if (configs.controls && configs.controls.valveShutOff) {
    const shutOff = configs.controls.valveShutOff;
    
    // Proceed only if the Master Shutoff feature is globally enabled for the device
    if (shutOff.enabled) {
      
      // Check pH Automation Triggers
      if (parameter === 'pH' && shutOff.triggerPH) {
        // Compare against the specific shutoff limits, not the general thresholds
        if (value < shutOff.phLow || value > shutOff.phHigh) {
          note = 'Valve shut off';
        }
      }

      // Check Turbidity Automation Triggers
      if (parameter === 'turbidity' && shutOff.triggerTurbidity) {
        if (value > shutOff.turbidityCrit) {
          note = 'Valve shut off';
        }
      }

      // Check TDS Automation Triggers
      if (parameter === 'tds' && shutOff.triggerTDS) {
        if (value > shutOff.tdsCrit) {
          note = 'Valve shut off';
        }
      }
    }
  }

  // Append the automation note to the result object if a trigger was identified
  if (note) {
    result.note = note;
  }

  return result;
};

// --- MAIN EXPORTED FUNCTION ---

/**
 * Processes a raw sensor reading and generates alerts based on threshold rules.
 * Iterates through all supported parameters in the reading object.
 * * @param {object} reading - The sensor data object (e.g., { deviceId, timestamp, pH, ... }).
 * @param {object} deviceConfigs - The full configuration object for the specific device.
 * @returns {Array} An array of alert objects for any parameter that is not 'Normal'.
 */
const evaluateSensorReading = (reading, deviceConfigs) => {
  const alerts = [];
  
  // Validation: Ensure configurations exist before processing
  if (!deviceConfigs || !deviceConfigs.thresholds) {
      console.error("Device configuration or thresholds are missing.");
      return [];
  }

  // Define the list of supported parameters to check
  const parameters = ['pH', 'turbidity', 'temp', 'tds'];

  parameters.forEach(param => {
    // Only evaluate parameters present in the current payload
    if (reading[param] !== undefined) {
      const value = reading[param];
      
      // Evaluate the individual parameter
      const result = evaluateParameter(param, value, deviceConfigs);

      // Construct the Alert object
      // This object structure aligns with the Mongoose Alert Schema
      const alert = {
        parameter: param,
        value: value,
        severity: result.severity,
        type: result.message,
        originator: reading.deviceId,
        dateTime: new Date(reading.timestamp).toLocaleString(),
        status: 'Active', // Default status for new alerts
        ...(result.note && { note: result.note }), // Conditionally add the note
      };
      
      alerts.push(alert);
    }
  });

  return alerts;
};

module.exports = {
  evaluateSensorReading
};