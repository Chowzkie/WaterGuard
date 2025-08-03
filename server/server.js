const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config(); // Load environment variables from .env file

// Import your mock data from the new files
const FAKE_API_DATA = require('./mockData/devices');
const FAKE_STATIONS_DATA = require('./mockData/stations');
const MOCK_SENSOR_READINGS = require('./mockData/sensorReading');
const MOCK_USERS = require('./mockData/users');

// NEW: Import the evaluateSensorReading function from its new server-side location
const { evaluateSensorReading } = require('./utils/SensorLogic'); 

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

// NEW: Endpoint to evaluate sensor readings
app.post("/api/evaluate-reading", (req, res) => {
    const reading = req.body; // The sensor reading sent from the client
    if (!reading) {
        return res.status(400).json({ message: "No sensor reading provided." });
    }
    
    // Use the evaluateSensorReading function to process the reading
    const evaluatedAlerts = evaluateSensorReading(reading);
    
    // Send the evaluated alerts back to the client
    res.status(200).json({ evaluatedAlerts });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body; // Get username and password from the request body

    // Find if a user with the provided credentials exists in our mock data
    const user = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        // If user found, send a success response
        res.status(200).json({ message: "Login successful", username: user.username });
    } else {
        // If no user found, send an unauthorized response
        res.status(401).json({ message: "Invalid Username or Password!" });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});