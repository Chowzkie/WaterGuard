// controllers/deviceController.js

const Device = require('../models/Device');
const {createUserlog} = require('../helpers/createUserlog');
const {compareConfigs} = require('../helpers/configDiff');

/**
 * @desc    Create a new device
 * @route   POST /api/devices
 * @access  Private
 * Function to register a new microcontroller unit in the database.
 */
const createDevice = async (req, res) => {
  try {
    // Extract required fields from the incoming HTTP request body
    const { _id, label, location, position, userID } = req.body;

    // --- Validation: Check for Duplicates ---
    // Query the database to see if a device with this specific ID already exists
    const existingDevice = await Device.findById(_id);
    
    // If a conflict is found, return a 409 status code to stop execution
    if (existingDevice) {
      return res.status(409).json({ message: `Device with ID ${_id} already exists.` });
    }

    // --- Instance Creation ---
    // Instantiate a new Device model with the provided data
    // Mongoose will automatically apply any default values defined in the Schema
    const newDevice = new Device({
      _id,
      label,
      location,
      position,
      userID,
    });

    // Save the new device document to the MongoDB database
    const savedDevice = await newDevice.save();

    // Log the creation action to the user activity log for auditing
    await createUserlog(userID, `added device "${label}" at location "${location}".`, 'Device')

    // Return the saved device object with a 201 Created status
    res.status(201).json(savedDevice);

  } catch (error) {
    // Log internal server errors for debugging purposes
    console.error('Error creating device:', error);
    res.status(500).json({ message: 'Server error while creating device.' });
  }
};

/**
 * @desc    Delete a device
 * @route   DELETE /api/devices/:id
 * @access  Private
 * Function to remove a device from the database based on its ID.
 */
const deleteDevice = async (req, res) => {
  try {
    // Retrieve the device ID from the URL parameters
    const deviceId = req.params.id;
    // Retrieve the userID from the body for logging purposes
    const { userID } = req.body;

    // --- Existence Check ---
    // Attempt to find the device to ensure it exists before deletion
    const device = await Device.findById(deviceId);
    
    // If the device is not found, return a 404 error
    if (!device) {
      return res.status(404).json({ message: 'Device not found.' });
    }

    // Log the deletion action before removing the record
    await createUserlog(userID, `deleted device "${device.label}" at location "${device.location}".`, "Deletion")
    
    // --- Deletion ---
    // Execute the deletion method on the document instance
    await device.deleteOne(); 

    // Return a success message indicating the resource was removed
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
 * Function to modify device settings (thresholds, timers) and log specific changes.
 */
const updateDeviceConfiguration = async (req, res) => {
  try {
    // Extract device ID from URL and new configs from request body
    const { deviceId } = req.params;
    const { newConfigs, userID } = req.body;

    // --- Pre-Update Lookup ---
    // Retrieve the current (old) device state to compare against new values
    const oldDevice = await Device.findById(deviceId);
    
    // Validate existence
    if (!oldDevice) {
      return res.status(404).json({ message: "Device not found." });
    }

    // Isolate the existing configuration object
    const oldConfigs = oldDevice.configurations;
    
    // --- Diff Calculation ---
    // Use helper function to identify exactly which fields have changed
    // Returns an array of strings describing the changes (e.g., "pH High: 8 -> 9")
    const changes =  compareConfigs(oldConfigs, newConfigs); 

    // --- Database Update ---
    // Find the device by ID and update the 'configurations' field
    // { new: true } returns the modified document; { runValidators: true } enforces schema rules
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceId,
      { $set: { configurations: newConfigs } },
      { new: true, runValidators: true }
    );

    // Double-check if the update operation returned a document
    if (!updatedDevice) {
      return res.status(404).json({ message: "Device not found." });
    }

    // --- Audit Logging ---
    // Only create a log entry if actual changes were detected
    if (changes.length > 0) {
      const logAction = `Device ${updatedDevice.label} configuration updated.`;
      const logDetails = `Changes: ${changes.join(", ")}`;
      createUserlog(userID, `${logAction} ${logDetails}`, "Configuration");
    }

    // Return the updated device object to the client
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
 * Function to toggle the valve state (OPEN/CLOSED) via real-time sockets.
 */
const sendValveCommand = async (req, res) => {
  try {
    // Extract parameters and command value
    const { deviceId } = req.params;
    const { commandValue, userID } = req.body;

    // Validate that the command is one of the allowed values
    if (!['OPEN', 'CLOSED'].includes(commandValue)) {
      return res.status(400).json({ message: 'Invalid command value.' });
    }

    // Update the database to reflect the pending command
    // This ensures the state is preserved even if the server restarts
    await Device.findByIdAndUpdate(deviceId, {
      $set: { 'commands.setValve': commandValue }
    });

    // --- Socket retrieval ---
    // Access the Socket.IO instance attached to the Express app
    const io = req.app.get('io');

    // --- Real-time Transmission ---
    // Emit the 'command' event specifically to the room matching the deviceId
    // The ESP32 listens for this specific event to trigger hardware actuation
    io.to(deviceId).emit('command', { type: 'setValve', value: commandValue });
    
    console.log(`📢 Emitted command to ${deviceId}: setValve to ${commandValue}`);

    // Log the user's action
    await createUserlog(userID, `sent command to set valve to ${commandValue} for device ${deviceId}`, "Valve");

    // Return a 202 Accepted status indicating the command was sent for processing
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
 * Complex function handling Pump Start, Stop, and Resume logic with optimistic UI updates.
 */
const sendPumpCommand = async (req, res) => {
  try {
    // Extract parameters
    const { deviceId } = req.params;
    const { commandValue, userID } = req.body; // Expects: 'FILL', 'DRAIN', or 'IDLE'
    const io = req.app.get('io'); // Retrieve socket instance

    // Validate the command against allowed pump operations
    if (!['FILL', 'DRAIN', 'IDLE'].includes(commandValue)) {
      return res.status(400).json({ message: 'Invalid pump command value.' });
    }

    // --- Payload Preparation ---
    // Initialize the object structure to be sent to the hardware
    let commandPayload = {
      type: 'setPump',
      value: commandValue, 
      phase: 'NONE',
      resumeTime: 0
    };
    
    // Initialize the object structure for the Database update
    const updateSet = {
      'commands.setPump': commandValue
    };

    // Retrieve current device state (using .lean() for performance as no save is needed on this obj)
    const device = await Device.findById(deviceId).lean();
    if (!device) {
       return res.status(404).json({ message: 'Device not found.' });
    }

    // --- Logic: Start or Resume (FILL/DRAIN) ---
    if (commandValue === 'FILL' || commandValue === 'DRAIN') {
      
      // Extract current cycle details to check if a Resume is possible
      const { pausedPhase, remainingTime_sec } = device.currentState.pumpCycle;

      // Check if the pump was previously paused and has time remaining
      if (remainingTime_sec > 0 && pausedPhase !== 'NONE') {
        
        // CASE: RESUME OPERATION
        console.log(`🔄 Issuing RESUME for ${deviceId}. Phase: ${pausedPhase}, Time: ${remainingTime_sec}s`);
        
        // Set payload to instruct ESP32 to resume
        commandPayload.value = 'RESUME';
        commandPayload.phase = pausedPhase;
        commandPayload.resumeTime = remainingTime_sec;

        // Optimistic DB Update: Immediately set state to the paused phase
        updateSet['currentState.pump'] = pausedPhase; 
        updateSet['currentState.pumpCycle.pausedPhase'] = pausedPhase;
        updateSet['currentState.pumpCycle.remainingTime_sec'] = remainingTime_sec;
        // Set the start time to NOW to allow the frontend timer to begin counting down immediately
        updateSet['currentState.pumpCycle.phaseStartedAt'] = new Date(); 

      } else {
        
        // CASE: FRESH START
        // Configure payload for a new cycle
        commandPayload.value = commandValue;
        commandPayload.phase = (commandValue === 'FILL') ? 'FILLING' : 'DRAINING';
        commandPayload.resumeTime = 0; 

        // Calculate the full duration based on device settings (converted to seconds)
        const fullTime = (commandValue === 'FILL') 
          ? device.configurations.controls.pumpCycleIntervals.fill * 60
          : device.configurations.controls.pumpCycleIntervals.drain * 60;
          
        // Optimistic DB Update: Set state to new phase and full duration
        updateSet['currentState.pump'] = commandPayload.phase;
        updateSet['currentState.pumpCycle.pausedPhase'] = commandPayload.phase;
        updateSet['currentState.pumpCycle.remainingTime_sec'] = fullTime;
        updateSet['currentState.pumpCycle.phaseStartedAt'] = new Date(); 
      }
    } else if (commandValue === 'IDLE') {
        
        // --- Logic: Stop/Pause (IDLE) ---
        // Update the state to IDLE immediately. 
        // The 'remainingTime_sec' is NOT updated here; the system waits for the ESP32 
        // to report back the exact remaining time in the next heartbeat.
        updateSet['currentState.pump'] = 'IDLE';
    }

    // --- 1. Database Update ---
    // Apply the prepared update set to the database immediately
    // This serves as the "Single Source of Truth" for the UI
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceId,
      { $set: updateSet },
      { new: true } // Return the updated document for broadcasting
    );

    // --- 2. Hardware Communication ---
    // Emit the command to the physical device
    io.to(deviceId).emit('command', commandPayload);
    console.log(`📢 Emitted command to ${deviceId}:`, JSON.stringify(commandPayload));

    // --- 3. Frontend Synchronization ---
    // Broadcast the fully updated device object to all connected web clients.
    // This ensures the UI timer starts immediately without waiting for a hardware round-trip.
    if (updatedDevice) {
      io.emit("deviceUpdate", updatedDevice);
      console.log(`   ... Optimistically emitted deviceUpdate for ${deviceId}`);
    }

    // Log the pump command action
    await createUserlog(userID, `sent pump command (${commandValue}) to device ${deviceId}`, "Pump");

    // Return success response
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