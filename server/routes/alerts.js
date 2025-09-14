// server/routes/alerts.js

const express = require('express');
const router = express.Router();

// We will create this controller file in the next step
const alertController = require('../controllers/alertController');

// **GET /api/alerts/**
// This single, powerful route will fetch all alerts based on query parameters.
// Examples:
// GET /api/alerts?lifecycle=Active  -> Gets all active alerts
// GET /api/alerts?lifecycle=History&severity=Critical -> Gets critical history alerts
router.get('/', alertController.getAlerts);

// **POST /api/alerts/acknowledge/:id**
// Acknowledges a single alert by its unique ID.
router.post('/acknowledge/:id', alertController.acknowledgeAlert);

// **PUT /api/alerts/delete**
// Soft-deletes a batch of historical alerts. We use PUT because we are updating their 'isDeleted' status.
router.put('/delete', alertController.deleteHistoryAlerts);

// **PUT /api/alerts/restore**
// Restores a batch of soft-deleted historical alerts.
router.put('/restore', alertController.restoreHistoryAlerts);

module.exports = router;