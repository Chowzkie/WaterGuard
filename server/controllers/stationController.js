const Station = require('../models/Station');
const mongoose = require('mongoose');

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

// @desc    Batch update stations (add, update, delete)
// @route   POST /api/stations/batch-update
// @access  Private (assuming you'll add auth middleware later)
exports.batchUpdateStations = async (req, res) => {
    const stationsFromClient = req.body;

    try {
        const clientStationIds = stationsFromClient
            .map(s => s._id)
            .filter(id => mongoose.Types.ObjectId.isValid(id));

        // 1. Delete stations that are in the DB but not in the client's list
        await Station.deleteMany({ _id: { $nin: clientStationIds } });

        const updatePromises = stationsFromClient.map(station => {
            // 2. If station has a valid _id, it's an update
            if (mongoose.Types.ObjectId.isValid(station._id)) {
                return Station.findByIdAndUpdate(station._id, station, { new: true, upsert: false });
            } 
            // 3. If no _id, it's a new station
            else {
                const newStation = new Station({
                    label: station.label,
                    location: station.location,
                    operation: station.operation,
                    maintenanceInfo: station.maintenanceInfo || null,
                });
                return newStation.save();
            }
        });

        await Promise.all(updatePromises);

        // Return the fresh, complete list from the DB
        const updatedStations = await Station.find({});
        res.status(200).json(updatedStations);

    } catch (error) {
        console.error('Error in batch update:', error);
        res.status(500).json({ message: 'Server error during batch update.' });
    }
};