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
    const { commandValue, userID } = req.body; // 'FILL', 'DRAIN', 'IDLE'
    const io = req.app.get('io'); // Get Socket.IO instance

    if (!['FILL', 'DRAIN', 'IDLE'].includes(commandValue)) {
      return res.status(400).json({ message: 'Invalid pump command value.' });
    }

    // Default payload
    let commandPayload = {
      type: 'setPump',
      value: commandValue, // e.g., 'IDLE'
      phase: 'NONE',
      resumeTime: 0
    };
    
    // This will hold our optimistic DB update
    const updateSet = {
      'commands.setPump': commandValue
    };

    const device = await Device.findById(deviceId).lean();
    if (!device) {
       return res.status(404).json({ message: 'Device not found.' });
    }

    if (commandValue === 'FILL' || commandValue === 'DRAIN') {
      // User wants to START or RESUME
      const { pausedPhase, remainingTime_sec } = device.currentState.pumpCycle;

      if (remainingTime_sec > 0 && pausedPhase !== 'NONE') {
        // --- THIS IS A RESUME ---
        console.log(`🔄 Issuing RESUME for ${deviceId}. Phase: ${pausedPhase}, Time: ${remainingTime_sec}s`);
        commandPayload.value = 'RESUME';
        commandPayload.phase = pausedPhase;
        commandPayload.resumeTime = remainingTime_sec;

        // --- OPTIMISTIC UPDATE for RESUME ---
        updateSet['currentState.pump'] = pausedPhase; // e.g., 'DRAINING'
        updateSet['currentState.pumpCycle.pausedPhase'] = pausedPhase;
        updateSet['currentState.pumpCycle.remainingTime_sec'] = remainingTime_sec;
        updateSet['currentState.pumpCycle.phaseStartedAt'] = new Date(); // Start countdown NOW

      } else {
        // --- THIS IS A FRESH START ---
        commandPayload.value = commandValue;
        commandPayload.phase = (commandValue === 'FILL') ? 'FILLING' : 'DRAINING';
        commandPayload.resumeTime = 0; // Will be set by ESP32, but we can set it optimistically

        // --- OPTIMISTIC UPDATE for FRESH START ---
        const fullTime = (commandValue === 'FILL') 
          ? device.configurations.controls.pumpCycleIntervals.fill * 60
          : device.configurations.controls.pumpCycleIntervals.drain * 60;
          
        updateSet['currentState.pump'] = commandPayload.phase;
        updateSet['currentState.pumpCycle.pausedPhase'] = commandPayload.phase;
        updateSet['currentState.pumpCycle.remainingTime_sec'] = fullTime;
        updateSet['currentState.pumpCycle.phaseStartedAt'] = new Date(); // Start countdown NOW
      }
    } else if (commandValue === 'IDLE') {
        // --- THIS IS A PAUSE/STOP ---
        // We are telling the pump to stop. We won't know the remaining time
        // until the ESP32 replies, but we can set the state to IDLE.
        updateSet['currentState.pump'] = 'IDLE';
    }

    // --- 1. UPDATE THE DATABASE (Optimistic) ---
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceId,
      { $set: updateSet },
      { new: true } // Return the new, updated document
    );

    // --- 2. EMIT COMMAND TO ESP32 ---
    io.to(deviceId).emit('command', commandPayload);
    console.log(`📢 Emitted command to ${deviceId}:`, JSON.stringify(commandPayload));

    // --- 3. EMIT NEW STATE TO UI (The Fix) ---
    if (updatedDevice) {
      io.emit("deviceUpdate", updatedDevice);
      console.log(`   ... Optimistically emitted deviceUpdate for ${deviceId}`);
    }

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