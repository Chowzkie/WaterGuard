// server/controllers/sensorReadingController.js

const Alert = require('../models/Alert');
const allDevices = require('../mockData/devices.js');
const { evaluateSensorReading } = require('../utils/SensorLogic');

exports.processReading = async (req, res) => {
    const reading = req.body;

    if (!reading || !reading.deviceId) {
        return res.status(400).json({ message: "Invalid sensor reading payload." });
    }

    try {
        // --- FIX: Reverted to call evaluateSensorReading without device-specific configs ---
        const allEvaluatedAlerts = evaluateSensorReading(reading);
        const actionsTaken = [];

        // This map is still useful for getting the device label for alerts.
        const deviceMap = new Map(allDevices.map(d => [d.id, d.label]));

        // --- Part 1: Process Abnormal Readings (Warnings and Criticals) ---
        const abnormalAlerts = allEvaluatedAlerts.filter(a => a.severity !== 'Normal');

        for (const newAlertData of abnormalAlerts) {
            const originatorLabel = deviceMap.get(newAlertData.originator) || newAlertData.originator;
            const finalAlertData = { ...newAlertData, originator: originatorLabel };
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
            const originatorLabel = deviceMap.get(normalReading.originator) || normalReading.originator;
            const activeAlertToResolve = await Alert.findOne({
                originator: originatorLabel,
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
                    originator: originatorLabel,
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