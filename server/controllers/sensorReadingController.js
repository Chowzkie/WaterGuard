// server/controllers/sensorReadingController.js
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { evaluateSensorReading } = require('../utils/SensorLogic');

exports.processReading = async (req, res) => {
  const reading = req.body;
  const deviceId = reading.deviceId;

  if (!reading || !deviceId) {
    return res.status(400).json({ message: "Invalid sensor reading payload." });
  }

  try {
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: `Device with ID ${deviceId} not found.` });
    }

    // Evaluate all parameters based on thresholds
    const evaluatedAlerts = evaluateSensorReading(reading, device.configurations);
    const actionsTaken = [];

    for (const alertData of evaluatedAlerts) {
      const { parameter, severity } = alertData;
      const originator = device.label;

      // Get the latest active alert for this parameter
      const existingAlert = await Alert.findOne({
        originator,
        parameter,
        lifecycle: 'Active',
      }).sort({ createdAt: -1 });

      // --- CASE 1: No existing alert, and severity is abnormal → create new alert ---
      if (!existingAlert && severity !== 'Normal') {
        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Created new '${parameter}' ${severity} alert.`);
      }

      // --- CASE 2: Existing abnormal alert changes severity (e.g. Warning → Critical) ---
      else if (existingAlert && severity !== 'Normal' && severity !== existingAlert.severity) {
        existingAlert.status = 'Escalated';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        await Alert.create({
          ...alertData,
          originator,
          lifecycle: 'Active',
        });
        actionsTaken.push(`Escalated '${parameter}' alert to ${severity}.`);
      }

      // --- CASE 3: Alert resolves (Critical/Warning → Normal) ---
      else if (existingAlert && existingAlert.severity !== 'Normal' && severity === 'Normal') {
        // Close the old one
        existingAlert.status = 'Resolved';
        existingAlert.lifecycle = 'Recent';
        await existingAlert.save();

        // Create only ONE "back to normal"
        const recentNormal = await Alert.findOne({
          originator,
          parameter,
          severity: 'Normal',
          lifecycle: 'Active',
        }).sort({ createdAt: -1 });

        if (!recentNormal) {
          await Alert.create({
            ...alertData,
            originator,
            type: `${parameter} is back to normal`,
            lifecycle: 'Active',
            isBackToNormal: true,
          });
          actionsTaken.push(`Created single 'Back to Normal' alert for ${parameter}.`);
        }
      }

      // --- CASE 4: No severity change (still Normal, or same as last) → skip ---
      else {
        actionsTaken.push(`No new alert for ${parameter}, same state.`);
      }
    }

    // Update device latest readings and status
    device.latestReading = {
      timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
      PH: reading.pH ?? device.latestReading.PH,
      TDS: reading.tds ?? device.latestReading.TDS,
      TEMP: reading.temp ?? device.latestReading.TEMP,
      TURBIDITY: reading.turbidity ?? device.latestReading.TURBIDITY,
    };
    device.currentState.lastContact = new Date();

    await device.save();

    // Emit updates to UI
    const io = req.app.get("io");
    if (io) {
      io.emit("newReading", {
        deviceId: device._id,
        label: device.label,
        latestReading: device.latestReading,
      });
      io.emit("deviceUpdated", device);
    }

    return res.status(200).json({
      message: "Sensor reading processed successfully.",
      actionsTaken,
      reading: device.latestReading,
    });
  } catch (error) {
    console.error("❌ Error processing sensor reading:", error);
    return res.status(500).json({ message: "Server error while processing reading." });
  }
};
