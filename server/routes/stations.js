const express = require('express');
const router = express.Router();
const { getStations, batchUpdateStations } = require('../controllers/stationController');

// Define the routes
router.get('/', getStations);
router.post('/batch-update', batchUpdateStations);

module.exports = router;