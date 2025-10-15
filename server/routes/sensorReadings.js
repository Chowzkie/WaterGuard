// server/routes/sensorReadings.js

const express = require("express");
const router = express.Router();
// We will create the controller file and logic in the next steps
const sensorReadingController = require('../controllers/sensorReadingController');

// GET route (if you have one)
// router.get("/", sensorReadingController.getReadings); 

// POST /api/sensor-readings/process
// This is the new endpoint that will act as the "brain"
router.post("/process", sensorReadingController.processReading);

module.exports = router;