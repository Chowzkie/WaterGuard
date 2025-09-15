const express = require("express");
const router = express.Router();

// Import the database model and controller functions
const Device = require('../models/Device');
const { createDevice, deleteDevice, updateDeviceConfiguration,  sendValveCommand } = require('../controllers/deviceController');

// =================================================================================
// --- DATABASE-DRIVEN ROUTES ---
// =================================================================================

/**
 * @desc    Fetch all devices from the database
 * @route   GET /api/devices
 */
router.get("/", async (req, res) => {
  try {
    const devices = await Device.find({});
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Server error while fetching devices.' });
  }
});

/**
 * @desc    Create a new device
 * @route   POST /api/devices
 */
router.post('/', createDevice);

/**
 * @desc    Delete a device by its ID
 * @route   DELETE /api/devices/:id
 */
router.delete('/:id', deleteDevice);


/**
 * @desc    Update a device's configurations
 * @route   PUT /api/devices/:deviceId/configurations
 */
// AFTER
router.put("/:deviceId/configurations", updateDeviceConfiguration);

/**
 * @desc    Send a command to a device's valve
 * @route   PUT /api/devices/:deviceId/command
 */
router.put("/:deviceId/command", sendValveCommand);

module.exports = router;