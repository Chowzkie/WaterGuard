// server/controllers/sensorReadingController.js

const Device = require('../models/Device'); // 1. Import the Mongoose Device model
const Alert = require('../models/Alert');
const { evaluateSensorReading } = require('../utils/SensorLogic'); // Assumes SensorLogic.js is in utils

exports.processReading = async (req, res) => {
    const reading = req.body;
    const deviceId = reading.deviceId;

    if (!reading || !deviceId) {
        return res.status(400).json({ message: "Invalid sensor reading payload." });
    }

    try {
        // 3. Find the device in the database to get its configurations
        const device = await Device.findById(deviceId);
        if (!device) {
            return res.status(404).json({ message: `Device with ID ${deviceId} not found.` });
        }

        // 4. Call evaluateSensorReading with the device-specific configs
        const allEvaluatedAlerts = evaluateSensorReading(reading, device.configurations);
        const actionsTaken = [];
        
        // --- Part 1: Process Abnormal Readings (Warnings and Criticals) ---
        const abnormalAlerts = allEvaluatedAlerts.filter(a => a.severity !== 'Normal');

        for (const newAlertData of abnormalAlerts) {
            // 5. Use the device label directly from the database object
            const finalAlertData = { ...newAlertData, originator: device.label }; 
            const { originator, parameter, severity } = finalAlertData;

            const existingAlert = await Alert.findOne({
                originator: originator,
                parameter: parameter,
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

        // --- Part 2: Process "Back to Normal" Readings ---
        const normalAlerts = allEvaluatedAlerts.filter(a => a.severity === 'Normal');

        for (const normalReading of normalAlerts) {
            const activeAlertToResolve = await Alert.findOne({
                originator: device.label, // Use device label
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
                    originator: device.label, // Use device label
                    type: `${normalReading.parameter} is back to normal`,
                    status: 'Active',
                    lifecycle: 'Active',
                    isBackToNormal: true,
                });
                actionsTaken.push(`Created 'Back to Normal' notification.`);
            }
        }

        res.status(200).json({ message: "Sensor reading processed successfully.", actions: actionsTaken });

    } catch (error) {
        console.error("Error processing sensor reading:", error);
        res.status(500).json({ message: "Server error while processing reading." });
    }
};