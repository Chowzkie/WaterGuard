// server/seed.js

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Alert = require('./models/Alert');

// --- Configuration ---
const NUM_ALERTS_TO_CREATE = 150;
const DEVICE_IDS = ['pump-01', 'valve-station-A', 'reservoir-3', 'filter-unit-B2'];
const PARAMETERS = ['pH', 'turbidity', 'tds', 'temp'];
const USERNAMES = ['j.doe', 'a.smith', 'm.jones', 's.lee'];
const SEVERITIES = ['Normal', 'Warning', 'Critical'];
const LIFECYCLES = ['Active', 'Recent', 'History'];
const STATUSES = {
    Active: ['Active'],
    Recent: ['Resolved', 'Escalated', 'Cleared'],
    History: ['Resolved', 'Escalated', 'Cleared']
};
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log('🔥 Clearing existing alerts...');
        await Alert.deleteMany({});
        console.log('🌱 Generating new alerts...');
        const alerts = [];

        // =================================================================
        // THIS IS THE LOGIC THAT WAS MISSING IN THE PREVIOUS SNIPPET
        // =================================================================
        for (let i = 0; i < NUM_ALERTS_TO_CREATE; i++) {
            const lifecycle = getRandom(LIFECYCLES);
            const severity = lifecycle === 'Active' ? getRandom(['Warning', 'Critical']) : getRandom(SEVERITIES);
            const isAcknowledged = Math.random() > 0.3; // 70% chance
            const randomTimestamp = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

            const newAlert = {
                originator: getRandom(DEVICE_IDS),
                parameter: getRandom(PARAMETERS),
                type: `Mock ${getRandom(PARAMETERS)} Alert - ${i + 1}`,
                value: parseFloat((Math.random() * 100).toFixed(2)),
                severity: severity,
                lifecycle: lifecycle,
                status: getRandom(STATUSES[lifecycle]),
                dateTime: randomTimestamp,
                acknowledged: isAcknowledged,
                acknowledgedBy: isAcknowledged ? {
                    username: getRandom(USERNAMES),
                    timestamp: new Date(randomTimestamp.getTime() + 60000) // Acknowledged 1 min after alert
                } : undefined,
                isBackToNormal: severity === 'Normal' && Math.random() > 0.5,
            };
            alerts.push(newAlert);
        }
        // =================================================================
        // END OF MISSING LOGIC
        // =================================================================

        await Alert.insertMany(alerts);
        console.log(`🚀 Successfully inserted ${alerts.length} alerts.`);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 MongoDB disconnected.');
    }
};

seedDatabase();