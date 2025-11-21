// controllers/stationController.js

const Station = require('../models/Station');
const mongoose = require('mongoose');
const { createUserlog } = require('../helpers/createUserlog');

/**
 * @desc    Get all pumping stations
 * @route   GET /api/stations
 * @access  Public
 * Function to retrieve all configured pumping stations.
 * Uses 'populate' to replace the 'deviceId' reference with actual device details (label, _id).
 */
exports.getStations = async (req, res) => {
    try {
        // Fetch all stations and join with the Device collection
        const stations = await Station.find({}).populate('deviceId', '_id label');
        res.status(200).json(stations);
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ message: 'Server error while fetching stations.' });
    }
};

/**
 * @desc    Batch update stations (add, update, delete) with audit trailing
 * @route   POST /api/stations/batch-update
 * @access  Private
 * complex synchronization function. 
 * Accepts the client's full list of stations and reconciles it with the database:
 * 1. Deletes stations missing from the payload.
 * 2. Updates existing stations.
 * 3. Creates new stations for entries without IDs.
 */
exports.batchUpdateStations = async (req, res) => {
    // Extract payload and the ID of the user performing the action
    const { stationsFromClient, userID } = req.body;

    // --- Validation ---
    // Ensure strict accountability for sensitive infrastructure changes
    if (!userID) {
        return res.status(400).json({ message: 'A User ID is required to perform this action.' });
    }

    try {
        // --- 1. Snapshot & Comparison ---
        // Fetch the current state of the database to calculate differences (diffing)
        const stationsInDb = await Station.find({});
        
        // Create Sets for O(1) lookup performance when comparing IDs
        const dbStationIds = new Set(stationsInDb.map(s => s._id.toString()));
        const clientStationIds = new Set(
            stationsFromClient
                .map(s => s._id)
                .filter(id => mongoose.Types.ObjectId.isValid(id))
        );

        // --- 2. Deletion Logic ---
        // Identify stations present in the DB but missing from the client payload.
        // Absence implies the user deleted them on the frontend.
        const stationsToDelete = stationsInDb.filter(s => !clientStationIds.has(s._id.toString()));
        
        if (stationsToDelete.length > 0) {
            const deleteIds = stationsToDelete.map(s => s._id);
            
            // Execute bulk deletion
            await Station.deleteMany({ _id: { $in: deleteIds } });
            
            // Log each deletion event individually for the audit trail
            for (const station of stationsToDelete) {
                await createUserlog(userID, `Deleted station: '${station.label}'`, 'Deletion');
            }
        }

        // --- 3. Creation & Update Logic ---
        // Iterate through the incoming payload to handle modifications
        for (const station of stationsFromClient) {
            
            // CASE: UPDATE
            // Check if the station has a valid ID that exists in the database snapshot
            if (mongoose.Types.ObjectId.isValid(station._id) && dbStationIds.has(station._id)) {
                
                const originalStation = stationsInDb.find(s => s._id.toString() === station._id);

                // Audit Logic: Status Change Detection
                // Specifically check if the status is transitioning TO 'Maintenance'
                if (originalStation && originalStation.operation !== 'Maintenance' && station.operation === 'Maintenance') {
                    await createUserlog(
                        userID,
                        `Set station '${station.label}' to Maintenance`,
                        'Maintenance',
                        station.maintenanceInfo // Include maintenance details in log
                    );
                }
                
                // Persist the update to MongoDB
                await Station.findByIdAndUpdate(station._id, station);
            }
            // CASE: CREATION
            // If the entry has no ID or an invalid ID, treat it as a new record
            else {
                const newStation = new Station({
                    label: station.label,
                    location: station.location,
                    operation: station.operation,
                    maintenanceInfo: station.maintenanceInfo || null,
                    deviceId: station.deviceId || null // Link to physical device
                });
                
                const savedStation = await newStation.save();
                
                // Log the creation event
                await createUserlog(userID, `Added new station: '${savedStation.label}'`, 'Station');
            }
        }

        // --- 4. Response ---
        // Return the fresh, fully populated list from the DB.
        // This ensures the frontend state is perfectly synchronized with the backend result.
        const updatedStations = await Station.find({}).populate('deviceId', '_id label');
        res.status(200).json(updatedStations);

    } catch (error) {
        console.error('Error in batch update:', error);
        res.status(500).json({ message: 'Server error during batch update.' });
    }
};