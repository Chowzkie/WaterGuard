// data/sensorReadings.js
const MOCK_SENSOR_READINGS = [
    // --- SCENARIO 1: Establish a normal baseline ---
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:00:00Z", pH: 7.6, turbidity: 4.1 },
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:01:00Z", temp: 28.5, tds: 450 },

    // --- SCENARIO 2: Test the full TDS lifecycle ---
    // A TDS warning is triggered
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:05:00Z", tds: 850 }, // Warning (>500)
    // TDS escalates to critical
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:06:00Z", tds: 1250 },// Critical (>1000)
    // TDS returns to normal
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:07:00Z", tds: 480 }, // Normal (<=500)

    // --- SCENARIO 3: Test the High Temperature alerts ---
    // Temperature enters the high warning range
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:10:00Z", temp: 34.5 }, // Warning: High (31-35)
    // Temperature becomes critical
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:11:00Z", temp: 36.2 }, // Critical: High (>35)

    // --- SCENARIO 4: Test the Low Temperature alerts ---
    // Temperature enters the low warning range
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:15:00Z", temp: 8.5 }, // Warning: Low (5-9)
    // Temperature becomes critical
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:16:00Z", temp: 4.1 },  // Critical: Low (<5)
    // Temperature returns to normal
    { deviceId: "ps01-dev", timestamp: "2025-07-03T10:17:00Z", temp: 25.0 }, // Normal (10-30)

    // --- SCENARIO 5: Test the full pH lifecycle (High and Low) ---
    //Normal starting point
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:19:00Z", pH: 6.5 }, // Normal (6.5-8.5)
    // A high pH warning is triggered
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:20:00Z", pH: 8.8 }, // Warning: High (8.6-9.0)
    // pH escalates to critical high
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:21:00Z", pH: 9.3 }, // Critical: High (>9.0)
    // pH returns to normal from high
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:22:00Z", pH: 8.1 }, // Normal (6.5-8.5)
    // A low pH warning is triggered
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:25:00Z", pH: 6.3 }, // Warning: Low (6.0-6.4)
    // pH escalates to critical low
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:26:00Z", pH: 5.8 }, // Critical: Low (<6.0)
    { deviceId: "ps02-dev", timestamp: "2025-07-03T10:27:00Z", pH: 6.6 }, // Normal (6.5-8.5)

    // --- SCENARIO 6: Test the full Turbidity lifecycle ---
    // A device that was offline sends a critical turbidity reading
    { deviceId: "ps03-dev", timestamp: "2025-07-03T10:30:00Z", turbidity: 15.5 },// Critical (>10)
    // Turbidity improves but is still at a warning level
    { deviceId: "ps03-dev", timestamp: "2025-07-03T10:31:00Z", turbidity: 9.8 }, // Warning (>5)
    // Turbidity finally returns to normal
    { deviceId: "ps03-dev", timestamp: "2025-07-03T10:32:00Z", turbidity: 4.8 }, // Normal (<=5)
];

module.exports = MOCK_SENSOR_READINGS;