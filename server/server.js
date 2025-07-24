// server.js
const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config(); // Load environment variables from .env file

// Import your mock data from the new files
const FAKE_API_DATA = require('./mockData/devices');
const FAKE_STATIONS_DATA = require('./mockData/stations');
const MOCK_SENSOR_READINGS = require('./mockData/sensorReading');

const PORT = process.env.PORT || 8080;

const corsOption = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
};

app.use(cors(corsOption));
app.use(express.json());

// Endpoint for FAKE_API_DATA (Devices)
app.get("/api/devices", (req, res) => {
    res.json(FAKE_API_DATA);
});

// Endpoint for FAKE_STATIONS_DATA
app.get("/api/stations", (req, res) => {
    res.json(FAKE_STATIONS_DATA);
});

// Endpoint for MOCK_SENSOR_READINGS
app.get("/api/sensor-readings", (req, res) => {
    res.json(MOCK_SENSOR_READINGS);
});

// Endpoint to handle saving device configurations (simulated PUT request)
app.put("/api/devices/:deviceId/configurations", (req, res) => {
    const deviceId = req.params.deviceId;
    const newConfigs = req.body;

    // IMPORTANT: When data is in a separate file, you need to import it
    // and modify the imported array/object directly IF you intend for the
    // "changes" to persist for subsequent requests on the *same server run*.
    // In a real application, this would interact with a database.
    const deviceIndex = FAKE_API_DATA.findIndex(device => device.id === deviceId);

    if (deviceIndex !== -1) {
        FAKE_API_DATA[deviceIndex].configurations = newConfigs;
        console.log(`Configurations updated for ${deviceId}:`, newConfigs);
        res.status(200).json({ message: "Configuration updated successfully", updatedDevice: FAKE_API_DATA[deviceIndex] });
    } else {
        res.status(404).json({ message: "Device not found" });
    }
});


app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});