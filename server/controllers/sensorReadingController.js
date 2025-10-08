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

    // Evaluate alerts (your existing logic)
    const allEvaluatedAlerts = evaluateSensorReading(reading, device.configurations);
    const actionsTaken = [];

    // --- Handle abnormal alerts (Warnings & Criticals) ---
    const abnormalAlerts = allEvaluatedAlerts.filter(a => a.severity !== 'Normal');
    for (const newAlertData of abnormalAlerts) {
      const finalAlertData = { ...newAlertData, originator: device.label };
      const { originator, parameter, severity } = finalAlertData;

      const existingAlert = await Alert.findOne({
        originator,
        parameter,
        lifecycle: 'Active'
      });

      if (existingAlert) {
        if (severity !== existingAlert.severity) {
          existingAlert.status = 'Escalated';
          existingAlert.lifecycle = 'Recent';
          await existingAlert.save();
          actionsTaken.push(`Escalated existing '${parameter}' alert.`);

          await Alert.create({ ...finalAlertData, status: 'Active', lifecycle: 'Active' });
          actionsTaken.push(`Created new escalated '${parameter}' alert.`);
        }
      } else {
        await Alert.create({ ...finalAlertData, status: 'Active', lifecycle: 'Active' });
        actionsTaken.push(`Created new '${parameter}' alert.`);
      }
    }

    // --- Handle "Back to Normal" alerts ---
    const normalAlerts = allEvaluatedAlerts.filter(a => a.severity === 'Normal');
    for (const normalReading of normalAlerts) {
      const activeAlertToResolve = await Alert.findOne({
        originator: device.label,
        parameter: normalReading.parameter,
        lifecycle: 'Active'
      });

      if (activeAlertToResolve) {
        activeAlertToResolve.status = 'Resolved';
        activeAlertToResolve.lifecycle = 'Recent';
        await activeAlertToResolve.save();
        actionsTaken.push(`Resolved existing '${normalReading.parameter}' alert.`);

        await Alert.create({
          ...normalReading,
          originator: device.label,
          type: `${normalReading.parameter} is back to normal`,
          status: 'Active',
          lifecycle: 'Active',
          isBackToNormal: true,
        });
        actionsTaken.push(`Created 'Back to Normal' notification.`);
      }
    }

    // 1) Update device latestReading & lastContact & sensorStatus timestamps
    device.latestReading = {
      timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
      PH: reading.pH !== undefined ? reading.pH : device.latestReading.PH,
      TDS: reading.tds !== undefined ? reading.tds : device.latestReading.TDS,
      TEMP: reading.temp !== undefined ? reading.temp : device.latestReading.TEMP,
      TURBIDITY: reading.turbidity !== undefined ? reading.turbidity : device.latestReading.TURBIDITY,
    };

    device.currentState = device.currentState || {};
    device.currentState.lastContact = new Date();

    // Update per-sensor lastReadingTimestamp and keep status Online
    device.currentState.sensorStatus = device.currentState.sensorStatus || {};
    const now = new Date();
    if (reading.pH !== undefined) {
      device.currentState.sensorStatus.PH = device.currentState.sensorStatus.PH || {};
      device.currentState.sensorStatus.PH.lastReadingTimestamp = now;
      device.currentState.sensorStatus.PH.status = 'Online';
    }
    if (reading.tds !== undefined) {
      device.currentState.sensorStatus.TDS = device.currentState.sensorStatus.TDS || {};
      device.currentState.sensorStatus.TDS.lastReadingTimestamp = now;
      device.currentState.sensorStatus.TDS.status = 'Online';
    }
    if (reading.temp !== undefined) {
      device.currentState.sensorStatus.TEMP = device.currentState.sensorStatus.TEMP || {};
      device.currentState.sensorStatus.TEMP.lastReadingTimestamp = now;
      device.currentState.sensorStatus.TEMP.status = 'Online';
    }
    if (reading.turbidity !== undefined) {
      device.currentState.sensorStatus.TURBIDITY = device.currentState.sensorStatus.TURBIDITY || {};
      device.currentState.sensorStatus.TURBIDITY.lastReadingTimestamp = now;
      device.currentState.sensorStatus.TURBIDITY.status = 'Online';
    }

    await device.save();

    // 2) Emit socket events
    const io = req.app.get('io');
    if (io) {
      // lightweight event for quick UI updates
      io.emit('newReading', {
        deviceId: device._id,
        label: device.label,
        latestReading: device.latestReading,
      });

      // full device state when UI needs to update devices list / status
      io.emit('deviceUpdated', device); // emits full device object
    }

    return res.status(200).json({ message: "Sensor reading processed successfully.", reading: device.latestReading });
  } catch (error) {
    console.error("Error processing sensor reading:", error);
    return res.status(500).json({ message: "Server error while processing reading." });
  }
};
