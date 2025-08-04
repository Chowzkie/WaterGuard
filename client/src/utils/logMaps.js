/**
 * A map to convert parameter keys to human-readable component names for system logs.
 */
export const PARAMETER_TO_COMPONENT_MAP = {
    ph: "pH Sensor",
    turbidity: "Turbidity Sensor",
    tds: "TDS Sensor",
    temp: "Temp Sensor",
    valve: "Valve Actuator",
    device: "Device"
};

/**
 * A helper map to convert technical field names into human-readable labels for user logs.
 */
export const FIELD_NAME_MAP = {
    ph: "pH Level",
    turbidity: "Turbidity",
    tds: "TDS",
    temp: "Temperature",
    valveShutOff: "Valve Shut-off",
    alertLoggingIntervals: "Alert Logging Intervals",
    testingIntervals: "Testing Intervals",
    warnLow: "Warning Low",
    critLow: "Critical Low",
    warnHigh: "Warning High",
    critHigh: "Critical High",
    normalLow: "Back to Normal (Low)",
    normalHigh: "Back to Normal (High)",
    warn: "Warning Threshold",
    crit: "Critical Threshold",
    phLow: "pH Critical Low",
    phHigh: "pH Critical High",
    turbidityCrit: "Turbidity Critical Threshold",
    tdsCrit: "TDS Critical Threshold",
    activeToRecent: "Active to Recent",
    recentToHistory: "Recent to History",
    drain: "Draining Time",
    delay: "Delay before Filling",
    fill: "Filling Duration",
    autoReopenGlobal: "Auto Re-open Valve on Normal?"
};

/**
 * A map to associate fields and categories with their units for user logs.
 */
export const FIELD_UNIT_MAP = {
    ph: 'pH',
    turbidity: 'NTU',
    tds: 'mg/L',
    temp: '°C',
    activeToRecent: 'seconds',
    recentToHistory: 'minutes',
    drain: 'minutes',
    delay: 'minutes',
    fill: 'minutes',
};

/**
 * A helper map for more readable user administration log messages.
 */
export const USER_FIELD_MAP = {
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    username: 'Username',
    phone: 'Phone Number',
};