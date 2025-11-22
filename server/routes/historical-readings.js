const express = require('express');
const router = express.Router();
const { getReadingsByDevice } = require('../controllers/historicalReadingController');

router.get('/:deviceId', getReadingsByDevice);

module.exports = router;
    
