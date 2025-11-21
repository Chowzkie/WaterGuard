// server/server.js

// Import the Express framework for handling HTTP requests
const express = require("express");
// Import the native Node.js HTTP module to create the server
const http = require("http");
// Import the Server class from Socket.IO for real-time communication
const { Server } = require("socket.io");
// Load environment variables from the .env file into process.env
require("dotenv").config();

// --- Database & Helpers ---
// Import the database connection configuration
const connectDB = require("./config/db");
// Import utility to create a default user if one does not exist
const createDefaultUser = require("./utils/createDefaultUser");
// Import the cron job initializer for system alerts
const { initializeAlertCronJobs } = require("./helpers/alertManager");
// Import the cron job initializer for checking device connectivity status
const { initializeDeviceStatusCheck } = require("./helpers/deviceStatusManager"); 
// Import the cron job initializer for checking individual sensor health
const { initializeSensorStatusCheck } = require("./helpers/sensorStatusManager"); 
// Import the Mongoose model for Device data
const Device = require("./models/Device");
// Import the controller to process incoming sensor readings
const { processReading } = require("./controllers/sensorReadingController");
// Import the Mongoose model for storing historical sensor data
const HistoricalReading = require("./models/HistoricalReading");
// Import helper function to generate system-level logs
const { createSystemLogs } = require("./helpers/createSystemLogs");
// Import Socket type for type checking (if using TypeScript, otherwise unused here but kept for reference)
const { Socket } = require("dgram");

// --- Server & Socket.IO Initialization ---
// Initialize the Express application
const app = express();
// Create the HTTP server using the Express app
const server = http.createServer(app);

// Initialize the Socket.IO server with specific configurations
const io = new Server(server, {
  cors: {
    // Define allowed origins for Cross-Origin Resource Sharing
    origin: ["https://waterguardapp.com", "https://www.waterguardapp.com"], 
    // Define allowed HTTP methods for socket requests
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  // Enable Engine.IO v3 compatibility for older clients
  allowEIO3: true,
  // Set the interval for sending ping packets to clients (10 seconds)
  pingInterval: 10000,
  // Set the timeout for waiting for a ping response (30 seconds)
  pingTimeout: 30000,
});

// Attach the Socket.IO instance to the Express app for global access
app.set("io", io);
// Define the server port, defaulting to 4000 if not specified in environment variables
const PORT = process.env.PORT || 4000;

/**
 * Main function to start the server.
 * Handles DB connection, background tasks, middleware, routes, and socket logic.
 */
const startServer = async () => {
  try {
    // 1. Establish connection to the MongoDB database
    await connectDB();
    
    // 2. Execute initial background maintenance tasks
    createDefaultUser(); // Ensure default admin user exists
    initializeAlertCronJobs(); // Start alert monitoring jobs
    
    // 3. Start the background job to check if devices are online
    initializeDeviceStatusCheck(io);

    // 4. Start the background job to check if sensors are active
    initializeSensorStatusCheck(io);

    // 5. Initialize Express Middleware (body parsers, cors, etc.)
    require("./middleware")(app);
    
    // 6. Initialize API Routes
    require("./routes")(app);

    // ===========================
    // 🔌 SOCKET.IO HANDLERS
    // ===========================
    
    // Event listener for new socket connections
    io.on("connection", (socket) => {
      // Log the ID of the connected client
      console.log(`✅ Socket client connected:`, socket.id);

        /**
         * A debug listener that logs *any* event received.
         * Useful for tracing incoming data flow.
         */
        socket.onAny((event, ...args) => {
          // Log the event name and arguments for debugging
          console.log(`📨 [${socket.id}] event received: ${event}`, args);
        });

      /**
       * (ESP32 Event)
       * Listens for requests to fetch device configuration (pump cycles).
       */
      socket.on("requestDeviceConfig", async (rawDeviceId) => {
        try {
          // Sanitize the device ID by removing potential extra quotes
          const deviceId = String(rawDeviceId).replace(/"/g, "");
          // Fetch the device document from the database using lean() for performance
          const device = await Device.findById(deviceId).lean();
          
          // Check if device exists and has pump configurations
          if (device && device.configurations && device.configurations.controls) {
            // Extract pump cycle intervals or default to empty object
            const pumpConfig = device.configurations.controls.pumpCycleIntervals || {};
            // Emit the configuration back to the requesting socket
            socket.emit("deviceConfig", { pumpCycleIntervals: pumpConfig });
            // Log the successful transmission of config
            console.log(`📡 (on request) Sent pump config to ${deviceId}:`, pumpConfig);
          } else {
            // Log a warning if configuration is missing
            console.warn(`⚠️ (on request) No pump config for device ${deviceId}`);
            // Send empty configuration object
            socket.emit("deviceConfig", { pumpCycleIntervals: {} });
          }
        } catch (err) {
          // Log any errors occurred during config fetching
          console.error("Error fetching pump config on request:", err);
        }
      });

      /**
       * (ESP32 Event)
       * Handles device joining a specific room and setting status to "Online".
       */
      socket.on("joinRoom", async (rawDeviceId) => {
        // Sanitize the device ID
        const deviceId = String(rawDeviceId).replace(/"/g, "");
        // Join the socket room corresponding to the device ID
        socket.join(deviceId);
        // Attach device ID to the socket instance for later reference
        socket.deviceId = deviceId;
        // Log the join event
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);

        try {
          // Fetch the current device state
          const device = await Device.findById(deviceId).lean();
          // Determine if the device was previously offline or null
          const wasOffline = !device || device.currentState.status === "Offline";

          // Update the device status in the database
          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.status": "Online", // Set status to Online
                "currentState.lastContact": new Date(), // Update last contact timestamp
              },
            },
            { new: true } // Return the modified document
          );

          // If the device transitioned from Offline to Online, log it
          if (wasOffline) {
            console.log(`✨ Device ${deviceId} is now ONLINE.`);
            // Create a system log entry for the status change
            createSystemLogs(
              null,
              deviceId,
              "Microcontroller",
              "Device is online",
              "success"
            );
            // Broadcast the updated device object to all clients
            if (updatedDevice) {
                io.emit("deviceUpdate", updatedDevice);
            }
          }
          
          // Check and send pump configuration upon joining
          if (updatedDevice && updatedDevice.configurations && updatedDevice.configurations.controls) {
            const pumpConfig = updatedDevice.configurations.controls.pumpCycleIntervals || {};
            // Emit configuration to the device
            socket.emit('deviceConfig', { pumpCycleIntervals: pumpConfig });
            // Log the configuration transmission
            console.log(`📡 Sent pump config to ${deviceId}:`, pumpConfig);
          }
        } catch (err) {
          // Log errors during the join process
          console.error(`Error processing joinRoom for ${deviceId}:`, err);
        }
      });

      /**
       * (ESP32 Event)
       * Receives general valve state confirmation.
       * Acts as a heartbeat signal.
       */
      socket.on("stateUpdate", async (data) => {
        try {
          // Destructure device ID and valve state from payload
          const { deviceId, valveState } = data;
          // Log the received state update
          console.log(`⚡ Received state update from ${deviceId}: Valve is ${valveState}`);

          // Update the device state in the database
          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.valve": valveState, // Update valve status
                "commands.setValve": "NONE", // Clear pending valve commands
                "currentState.lastContact": new Date(), // Update heartbeat timestamp
              },
            },
            { new: true } // Return updated document
          );

          // Broadcast the update to web clients
          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice);
          }
        } catch (error) {
          // Log errors during state update
          console.error("Error processing state update from device:", error);
        }
      });

      /**
       * (ESP32 Event)
       * Receives detailed pump state updates.
       * Handles logic for running, idle, and paused states.
       */
      socket.on("pumpStateUpdate", async (data) => { 
        try {
          // Destructure pump data from the payload
          const { deviceId, pumpState, remainingTime_sec, pausedPhase } = data; 
          // Log the pump state details
          console.log(`⚡ Pump state from ${deviceId}: ${pumpState}, Phase: ${pausedPhase}, Time: ${remainingTime_sec}s`);

          // Prepare the object for database update
          const updateSet = {
            "currentState.pump": pumpState, // Set current pump status
            "commands.setPump": "NONE", // Clear pending pump commands
            "currentState.lastContact": new Date(), // Update heartbeat timestamp

            // Update pump cycle details for frontend synchronization
            "currentState.pumpCycle.pausedPhase": pausedPhase,
            "currentState.pumpCycle.remainingTime_sec": remainingTime_sec,
            
            // Record the timestamp when this phase started for timer calculations
            "currentState.pumpCycle.phaseStartedAt": new Date()
          };

          // Log specific pause events for debugging
          if (pumpState === 'IDLE' && pausedPhase && pausedPhase !== 'NONE') {
            console.log(`   ... Storing PAUSE state. Phase: ${pausedPhase}, Remaining: ${remainingTime_sec}s`);
          }

          // Execute the database update
          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            { $set: updateSet },
            { new: true }
          );

          // Broadcast the updated device state to all connected clients
          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice);
            console.log(`   ... Emitted deviceUpdate for ${deviceId}`);
          }
        } catch (error) {
          // Log errors during pump state processing
          console.error("Error processing pump state update from device:", error);
        }
      });

      /**
       * (ESP32 Event)
       * The primary data handler. Receives all sensor readings (Temp, TDS, Turbidity, pH).
       */
      socket.on("esp32_data", async (payload) => {
        try {
          const data = payload;
          // Destructure sensor readings from the payload
          const { deviceId, TEMP, TDS, TURBIDITY, PH } = data; 

          // Log the received sensor values
          console.log(`📡 ESP32 Reading from ${deviceId} → PH: ${PH}, TEMP: ${TEMP}°C, TDS: ${TDS} ppm, TURBIDITY: ${TURBIDITY} ntu`);

          /**
           * Helper function to sanitize sensor values.
           * Handles nulls, rounding, and NaN conversions.
           */
          const sanitize = (val) => {
            if (val === null || val === undefined) return null; // Return null if input is null/undefined
            const num = Number(val); // Convert to number
            return isNaN(num) ? 0 : Math.round(num * 10) / 10; // Return 0 if NaN, otherwise round to 1 decimal
          };

          // Sanitize all incoming sensor values
          const tempRounded = sanitize(TEMP);
          const tdsRounded = sanitize(TDS);
          const turbRounded = sanitize(TURBIDITY);
          const phRounded = sanitize(PH);
          const currentTimestamp = new Date();

          // Save the reading to the historical data collection
          try {
            const newHistoricalReading = new HistoricalReading({
              deviceId: deviceId,
              timestamp: currentTimestamp,
              reading: {
                PH: phRounded,
                TDS: tdsRounded,
                TEMP: tempRounded,
                TURBIDITY: turbRounded,
              },
            });
            // Write to database
            await newHistoricalReading.save();
            console.log(`💾 Saved historical reading for ${deviceId}`);
          } catch (saveError) {
            // Log failure to save historical data
            console.error("❌ Error saving historical reading:", saveError);
          }

          // Create a mock request object to pass data to the controller
          const req = {
            body: {
              deviceId,
              temp: tempRounded,
              tds: tdsRounded,
              turbidity: turbRounded,
              pH: phRounded,
              timestamp: currentTimestamp,
            },
            app, // Pass the app instance
          };

          // Create a mock response object to handle controller output
          const res = {
            status: (code) => ({
              json: (data) =>
                console.log(`📤 [processReading:${code}]`, JSON.stringify(data)),
            }),
          };

          // Delegate data processing to the sensor reading controller
          await processReading(req, res);

        } catch (err) {
          // Log critical errors in data handling
          console.error("❌ Error handling ESP32 data:", err);
        }
      });

      /**
       * (Socket.IO Event)
       * Handles client disconnection.
       */
      socket.on("disconnect", () => {
        // Identify the device ID or mark as unknown
        const deviceId = socket.deviceId ? socket.deviceId : "unknown device";
        // Log the disconnection event
        console.log(`❌ Socket client disconnected: ${socket.id} (Device: ${deviceId})`);
        // Note: Offline status update is handled by the cron job, not here immediately
      });
    });

    // ===========================
    // 🚀 START SERVER
    // ===========================
    
    // Define a basic root route for status checks
    app.get("/", (req, res) => {
      res.send("Server is running");
    });
    
    // Start listening for network requests on the defined port
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server with real-time sockets running on port ${PORT}`);
    });
  } catch (err) {
    // Log and exit if the server fails to start
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Execute the main function to start the application
startServer();