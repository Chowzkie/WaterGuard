const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();

const FAKE_API_DATA = require('./mockData/devices');
const FAKE_STATIONS_DATA = require('./mockData/stations');
const MOCK_SENSOR_READINGS = require('./mockData/sensorReading');
const MOCK_USERS = require('./mockData/users');
const { evaluateSensorReading } = require('./utils/SensorLogic');

const PORT = process.env.PORT || 8080;

const corsOption = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
};

app.use(cors(corsOption));
app.use(express.json());

// --- MODIFIED: More realistic device status simulation ---
// This set keeps track of devices that are currently forced offline.
const devicesForcedOffline = new Set();

setInterval(() => {
    // 20% chance to try and change a device's status
    if (Math.random() < 0.2) {
        const deviceIndex = Math.floor(Math.random() * FAKE_API_DATA.length);
        const device = FAKE_API_DATA[deviceIndex];

        // If the device is currently online and not in our forced offline set, take it offline.
        if (device.status === 'Online' && !devicesForcedOffline.has(device.id)) {
            device.status = 'Offline';
            devicesForcedOffline.add(device.id);
            console.log(`Simulated Event: Device '${device.id}' taken OFFLINE.`);

            // Set a timer to bring it back online after 30-60 seconds.
            const onlineTimeout = 30000 + (Math.random() * 30000);
            setTimeout(() => {
                device.status = 'Online';
                devicesForcedOffline.delete(device.id);
                console.log(`Simulated Event: Device '${device.id}' brought back ONLINE.`);
            }, onlineTimeout);
        }
    }
}, 15000); // Check to change a status every 15 seconds.


// --- API Endpoints (Unchanged) ---

app.get("/api/devices", (req, res) => {
    res.json(FAKE_API_DATA);
});

app.get("/api/stations", (req, res) => {
    res.json(FAKE_STATIONS_DATA);
});

app.get("/api/sensor-readings", (req, res) => {
    res.json(MOCK_SENSOR_READINGS);
});

app.put("/api/devices/:deviceId/configurations", (req, res) => {
    const deviceId = req.params.deviceId;
    const newConfigs = req.body;
    const deviceIndex = FAKE_API_DATA.findIndex(device => device.id === deviceId);

    if (deviceIndex !== -1) {
        FAKE_API_DATA[deviceIndex].configurations = newConfigs;
        res.status(200).json({ message: "Configuration updated successfully", updatedDevice: FAKE_API_DATA[deviceIndex] });
    } else {
        res.status(404).json({ message: "Device not found" });
    }
});

app.post("/api/evaluate-reading", (req, res) => {
    const reading = req.body;
    if (!reading) {
        return res.status(400).json({ message: "No sensor reading provided." });
    }
    const evaluatedAlerts = evaluateSensorReading(reading);
    res.status(200).json({ evaluatedAlerts });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        res.status(200).json({ message: "Login successful", username: user.username });
    } else {
        res.status(401).json({ message: "Invalid Username or Password!" });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});