const Station = require('../models/Station');
const mongoose = require('mongoose');
const { createUserlog } = require('../helpers/createUserlog');

// @desc    Get all pumping stations
// @route   GET /api/stations
// @access  Public
exports.getStations = async (req, res) => {
    try {
        const stations = await Station.find({});
        res.status(200).json(stations);
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ message: 'Server error while fetching stations.' });
    }
};

// @desc    Batch update stations (add, update, delete) with audit trailing
// @route   POST /api/stations/batch-update
// @access  Private
exports.batchUpdateStations = async (req, res) => {
    // The userID is now expected in the request body for logging purposes.
    const { stationsFromClient, userID } = req.body;

    if (!userID) {
        return res.status(400).json({ message: 'A User ID is required to perform this action.' });
    }

    try {
        // 1. Fetch the current state of stations from the DB for comparison
        const stationsInDb = await Station.find({});
        const dbStationIds = new Set(stationsInDb.map(s => s._id.toString()));
        const clientStationIds = new Set(
            stationsFromClient
                .map(s => s._id)
                .filter(id => mongoose.Types.ObjectId.isValid(id))
        );

        // 2. Log and Handle Deletions
        const stationsToDelete = stationsInDb.filter(s => !clientStationIds.has(s._id.toString()));
        if (stationsToDelete.length > 0) {
            const deleteIds = stationsToDelete.map(s => s._id);
            await Station.deleteMany({ _id: { $in: deleteIds } });
            // Log each deletion
            for (const station of stationsToDelete) {
                await createUserlog(userID, `Deleted station: '${station.label}'`, 'Deletion');
            }
        }

        // 3. Log and Handle Additions and Updates
        for (const station of stationsFromClient) {
            // It's an update if it has a valid ID that we know exists in the DB
            if (mongoose.Types.ObjectId.isValid(station._id) && dbStationIds.has(station._id)) {
                const originalStation = stationsInDb.find(s => s._id.toString() === station._id);

                // LOGIC: Check for status change to "Maintenance"
                if (originalStation && originalStation.operation !== 'Maintenance' && station.operation === 'Maintenance') {
                    await createUserlog(
                        userID,
                        `Set station '${station.label}' to Maintenance`,
                        'Maintenance',
                        station.maintenanceInfo
                    );
                }
                // Perform the update
                await Station.findByIdAndUpdate(station._id, station);
            }
            // It's an addition if it has no valid ID
            else {
                const newStation = new Station({
                    label: station.label,
                    location: station.location,
                    operation: station.operation,
                    maintenanceInfo: station.maintenanceInfo || null,
                });
                const savedStation = await newStation.save();
                // Log the addition
                await createUserlog(userID, `Added new station: '${savedStation.label}'`, 'Station');
            }
        }

        // Return the fresh, complete list from the DB
        const updatedStations = await Station.find({});
        res.status(200).json(updatedStations);

    } catch (error) {
        console.error('Error in batch update:', error);
        res.status(500).json({ message: 'Server error during batch update.' });
    }
};
