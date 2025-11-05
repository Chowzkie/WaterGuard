const express = require('express');
const router = express.Router();

// get the alert controller
const alertController = require('../controllers/alertController');

// **GET /api/alerts/**
// fetch all alerts based on query parameters.
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