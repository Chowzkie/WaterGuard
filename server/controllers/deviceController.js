const Device = require('../models/Device');
const {createUserlog} = require('../helpers/createUserlog');
const {compareConfigs} = require('../helpers/configDiff')

/**
 * @desc    Create a new device
 * @route   POST /api/devices
 * @access  Private
 */
const createDevice = async (req, res) => {
  try {
    // Destructure the required fields from the request body
    const { _id, label, location, position, userID } = req.body;

    // --- Validation: Check if a device with this ID already exists ---
    const existingDevice = await Device.findById(_id);
    if (existingDevice) {
      // 409 Conflict is the appropriate status code for a duplicate resource
      return res.status(409).json({ message: `Device with ID ${_id} already exists.` });
    }

    // Create a new device instance. The default values from the schema will be applied automatically.
    const newDevice = new Device({
      _id,
      label,
      location,
      position,
      userID,
    });

    // Save the new device to the database
    const savedDevice = await newDevice.save();

    await createUserlog(userID, `added device "${label}" at location "${location}".`, 'Device')

    // Respond with the newly created device data and a 201 Created status
    res.status(201).json(savedDevice);

  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ message: 'Server error while creating device.' });
  }
};

/**
 * @desc    Delete a device
 * @route   DELETE /api/devices/:id
 * @access  Private
 */
const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { userID } = req.body;

    // Check if the device exists before trying to delete 
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    await createUserlog(userID, `deleted device "${device.label}" at location "${device.location}".`, "Deletion")
    // Remove the device from the database
    await device.deleteOne(); // Use deleteOne() on the document instance

    res.status(200).json({ message: `Device ${deviceId} successfully deleted.` });

  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ message: 'Server error while deleting device.' });
  }
};

/**
 * @desc    Update a device's configurations
 * @route   PUT /api/devices/:deviceId/configurations
 * @access  Private
 */
const updateDeviceConfiguration = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { newConfigs, userID } = req.body;

    // Find the device before updating to compare old configs
    const oldDevice = await Device.findById(deviceId);
    if (!oldDevice) {
      return res.status(404).json({ message: "Device not found." });
    }

    const oldConfigs = oldDevice.configurations;
    const changes =  compareConfigs(oldConfigs, newConfigs); // call the helper

    // Update the device with the new configurations
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceId,
      { $set: { configurations: newConfigs } },
      { new: true, runValidators: true }
    );

    if (!updatedDevice) {
      return res.status(404).json({ message: "Device not found." });
    }

    // Log the changes in user logs if there are differences
    if (changes.length > 0) {
      const logAction = `Device ${updatedDevice.label} configuration updated.`;
      const logDetails = `Changes: ${changes.join(", ")}`;
      createUserlog(userID, `${logAction} ${logDetails}`, "Configuration");
    }

    // Send success response
    res.status(200).json({
      message: "Configuration updated successfully",
      updatedDevice: updatedDevice,
    });

  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({
      message: "Server error while updating configuration",
      error: error.message,
    });
  }
};

/**
 * @desc    Send a command to a device's valve via Socket.IO
 * @route   PUT /api/devices/:deviceId/command
 * @access  Private
 */
const sendValveCommand = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { commandValue, userID } = req.body;

    if (!['OPEN', 'CLOSED'].includes(commandValue)) {
      return res.status(400).json({ message: 'Invalid command value.' });
    }

    // Update the database with the desired command
    await Device.findByIdAndUpdate(deviceId, {
      $set: { 'commands.setValve': commandValue }
    });

    // Get the Socket.IO instance from the app object
    const io = req.app.get('io');

    //  Emit the command directly to the device's private room
    io.to(deviceId).emit('command', { type: 'setValve', value: commandValue });
    console.log(`📢 Emitted command to ${deviceId}: setValve to ${commandValue}`);

    await createUserlog(userID, `sent command to set valve to ${commandValue} for device ${deviceId}`, "Valve");

    // Respond to the web client that the command was successfully sent
    res.status(202).json({ message: `Command to set valve to ${commandValue} has been sent.` });

  } catch (error) {
    console.error("Error sending valve command:", error);
    res.status(500).json({ message: "Server error while sending command" });
  }
};

/**
 * @desc    Send a command to a device's pump via Socket.IO
 * @route   PUT /api/devices/:deviceId/pumpCommand
 * @access  Private
 */
const sendPumpCommand = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { commandValue, userID } = req.body;

    // Acceptable commands for pump (match schema enum): 'FILL', 'DRAIN', 'IDLE'
    if (!['FILL', 'DRAIN', 'IDLE'].includes(commandValue)) {
      return res.status(400).json({ message: 'Invalid pump command value.' });
    }

    // Update DB to reflect desired command
    await Device.findByIdAndUpdate(deviceId, {
      $set: { 'commands.setPump': commandValue }
    });

    // Emit to device room via socket
    const io = req.app.get('io');
    io.to(deviceId).emit('command', { type: 'setPump', value: commandValue });
    console.log(`📢 Emitted pump command to ${deviceId}: setPump to ${commandValue}`);

    // Create user log
    await createUserlog(userID, `sent pump command (${commandValue}) to device ${deviceId}`, "Pump");

    // Respond to client
    res.status(202).json({ message: `Pump command ${commandValue} sent.` });

  } catch (error) {
    console.error("Error sending pump command:", error);
    res.status(500).json({ message: "Server error while sending pump command" });
  }
};

module.exports = {
  createDevice,
  deleteDevice,
  updateDeviceConfiguration,
  sendValveCommand,
  sendPumpCommand,
};