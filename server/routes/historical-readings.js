    // server/routes/readings.js
    const express = require('express');
    const router = express.Router();
    const { getReadingsByDevice } = require('../controllers/historicalReadingController');

    // This route will respond to requests like: GET http://localhost:8080/api/readings/ps01-dev
    router.get('/:deviceId', getReadingsByDevice);

    module.exports = router;
    
