// data/devices.js
const FAKE_API_DATA = [
    {
        id: 'ps01-dev',
        label: 'PS01-DEV',
        position: [15.6033, 120.6010],
        location: 'Brgy. Abagon, Gerona, Tarlac',
        status: 'Online',
        configurations: {
            ph: { warnLow: 6.4, critLow: 6.0, warnHigh: 8.6, critHigh: 9.0, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 5, crit: 10, normalLow: 0, normalHigh: 5 },
            tds: { warn: 500, crit: 1000, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 5, critLow: 0, warnHigh: 31, critHigh: 35, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 5.9, phHigh: 9.1, turbidityCrit: 13, tdsCrit: 1200 },
            alertLoggingIntervals: { activeToRecent: 30, recentToHistory: 5 },
            testingIntervals: { drain: 3, delay: 1, fill: 3 }
        },
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [7.5, 7.6, 7.4, 7.7, 7.5],
                turbidity: [3.0, 3.2, 3.1, 3.0, 3.3],
                tds: [250, 255, 248, 252, 260],
                temp: [25.0, 25.1, 24.9, 25.2, 25.0]
            }
        },
        alerts: [
            { type: "pH Warning", status: "Active", time: "10:40", value: 8, unit: 'pH' },
            { type: "Temperature High", status: "Critical", time: "10:55", value: 40, unit: '°C' },
            { type: "TDS Critical", status: "Critical", time: "11:05", value: 750, unit: 'ppm' },
        ],
        readings: {
            ph: 7.5,
            turbidity: 3.1,
            tds: 250,
            temp: 25.0
        }
    },
    {
        id: 'ps02-dev',
        label: 'PS02-DEV',
        position: [15.6115, 120.5935],
        location: 'Brgy. Apsayan, Gerona, Tarlac',
        status: 'Online',
        configurations: {
            ph: { warnLow: 6.5, critLow: 6.1, warnHigh: 8.5, critHigh: 8.9, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 6, crit: 12, normalLow: 0, normalHigh: 5 },
            tds: { warn: 600, crit: 1100, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 6, critLow: 1, warnHigh: 32, critHigh: 36, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 6.0, phHigh: 9.0, turbidityCrit: 15, tdsCrit: 1300 },
            alertLoggingIntervals: { activeToRecent: 40, recentToHistory: 5 },
            testingIntervals: { drain: 4, delay: 2, fill: 4 }
        },
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [7.0, 7.1, 7.2, 7.0, 7.1],
                turbidity: [4.0, 4.1, 4.0, 4.2, 4.0],
                tds: [300, 305, 302, 308, 300],
                temp: [26.0, 26.1, 26.0, 26.2, 26.0]
            }
        },
        alerts: [
            { type: "TDS Critical", status: "Resolved", time: "10:20", value: 900, unit: 'ppm' }
        ],
        readings: {
            ph: 7.1,
            turbidity: 4.1,
            tds: 305,
            temp: 26.1
        }
    },
    {
        id: 'ps03-dev',
        label: 'PS03-DEV',
        position: [15.6250, 120.6050],
        location: 'Brgy. Buenlag, Gerona, Tarlac',
        status: 'Offline',
        configurations: {
            ph: { warnLow: 6.3, critLow: 5.9, warnHigh: 8.7, critHigh: 9.1, normalLow: 6.5, normalHigh: 8.5 },
            turbidity: { warn: 4, crit: 8, normalLow: 0, normalHigh: 5 },
            tds: { warn: 450, crit: 950, normalLow: 0, normalHigh: 500 },
            temp: { warnLow: 4, critLow: -1, warnHigh: 30, critHigh: 34, normalLow: 10, normalHigh: 30 },
            valveShutOff: { phLow: 5.8, phHigh: 9.2, turbidityCrit: 10, tdsCrit: 1150 },
            alertLoggingIntervals: { activeToRecent: 50, recentToHistory: 5 },
            testingIntervals: { drain: 2, delay: 1, fill: 2 }
        },
        history: {
            time: ["10:00", "10:15", "10:30", "10:45", "11:00"],
            readings: {
                pH: [6.8, 6.7, 6.9, 6.8, 6.7],
                turbidity: [5.0, 5.1, 5.0, 5.2, 5.0],
                tds: [350, 355, 352, 358, 350],
                temp: [24.0, 24.1, 24.0, 24.2, 24.0]
            }
        },
        alerts: [
            { type: "Device Offline", status: "Active", time: "10:00", value: 0, unit: '' }
        ],
        readings: {
            ph: 6.7,
            turbidity: 5.1,
            tds: 355,
            temp: 24.1
        }
    },
];

module.exports = FAKE_API_DATA;