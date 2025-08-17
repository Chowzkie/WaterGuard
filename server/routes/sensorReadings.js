const express = require("express");
const router = express.Router();

const MOCK_SENSOR_READINGS = require("../mockData/sensorReading");
const { evaluateSensorReading } = require("../utils/SensorLogic");

router.get("/", (req, res) => {
  res.json(MOCK_SENSOR_READINGS);
});

router.post("/evaluate", (req, res) => {
  const reading = req.body;
  if (!reading) {
    return res.status(400).json({ message: "No sensor reading provided." });
  }
  const evaluatedAlerts = evaluateSensorReading(reading);
  res.status(200).json({ evaluatedAlerts });
});

module.exports = router;
