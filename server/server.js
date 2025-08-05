const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();

const FAKE_API_DATA = require('./mockData/devices');
const FAKE_STATIONS_DATA = require('./mockData/stations');
const MOCK_SENSOR_READINGS = require('./mockData/sensorReading');
// Import MOCK_USERS as a mutable array
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
app.get("/api/users", (req,res) => {
    res.json(MOCK_USERS)
})

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

app.post("/api/evaluate-reading", (req, res) => {
    const reading = req.body;
    if (!reading) {
        return res.status(400).json({ message: "No sensor reading provided." });
    }
    const evaluatedAlerts = evaluateSensorReading(reading);
    res.status(200).json({ evaluatedAlerts });
});

// --- NEW USER MANAGEMENT ENDPOINTS ---

// GET user profile by username
app.get("/api/users/:username", (req, res) => {
    const username = req.params.username;
    const user = MOCK_USERS.find(u => u.username === username);

    if (user) {
        // In a real app, you'd send a DTO (Data Transfer Object) without the password
        const { password, ...userProfile } = user; 
        res.status(200).json(userProfile);
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// PUT update user profile (e.g., contact number)
app.put("/api/users/:username/profile", (req, res) => {
    const username = req.params.username;
    const { contact } = req.body; // Only expecting contact for now

    const userIndex = MOCK_USERS.findIndex(u => u.username === username);

    if (userIndex !== -1) {
        // Server-side validation for phone number
        const contactStr = String(contact); // Ensure it's a string for validation
        const startsWith09 = /^09\d{9}$/; // 09 followed by 9 digits (total 11)
        const startsWithPlus63 = /^\+639\d{9}$/; // +639 followed by 9 digits (total 13)

        if (!startsWith09.test(contactStr) && !startsWithPlus63.test(contactStr)) {
            return res.status(400).json({ message: "Invalid phone number format. Must be 11 digits (e.g., 09xxxxxxxxx) or 13 digits (e.g., +639xxxxxxxxx)." });
        }

        const oldContact = MOCK_USERS[userIndex].contact;
        MOCK_USERS[userIndex].contact = contact;
        
        console.log(`User ${username} updated contact from ${oldContact} to ${contact}`);
        // In a real app, you'd return the updated user object (without password) from the DB
        const { password, ...updatedUserProfile } = MOCK_USERS[userIndex];
        res.status(200).json({ message: "Profile updated successfully", updatedUserProfile });
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// PUT change user password
app.put("/api/users/:username/password", (req, res) => {
    const username = req.params.username;
    const { currentPassword, newPassword } = req.body;

    const userIndex = MOCK_USERS.findIndex(u => u.username === username);

    if (userIndex !== -1) {
        const user = MOCK_USERS[userIndex];

        // --- IMPORTANT: In a real application, you would HASH passwords (e.g., using bcrypt)
        // and compare the hash of the currentPassword input with the stored hash.
        // For this mock, we are directly comparing plain text passwords. ---
        if (user.password !== currentPassword) {
            return res.status(401).json({ message: "Current password does not match." });
        }

        // Basic password strength check (optional, but good practice)
        // This regex requires at least 8 characters, one uppercase, one lowercase, one digit, one special character.
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: "New password does not meet strength requirements (min 8 chars, incl. uppercase, lowercase, number, special char)." });
        }

        user.password = newPassword; // Update the password
        console.log(`User ${username} changed password.`);
        res.status(200).json({ message: "Password changed successfully!" });
    } else {
        res.status(404).json({ message: "User not found" });
    }
});


// Login endpoint - Modified to return the user object (excluding password)
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    const user = MOCK_USERS.find(
        (u) => u.username === username && u.password === password
    );

    if (user) {
        const { password, ...userToSend } = user; // Exclude password from response
        res.status(200).json({ message: "Login successful", user: userToSend });
    } else {
        res.status(401).json({ message: "Invalid Username or Password!" });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});