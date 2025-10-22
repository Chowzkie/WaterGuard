// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config(); // Loads environment variables from .env file

// --- Database & Helpers ---
const connectDB = require("./config/db"); // Function to connect to MongoDB
const createDefaultUser = require("./utils/createDefaultUser"); // Utility to create an admin if one doesn't exist
const { initializeAlertCronJobs } = require("./helpers/alertManager"); // Initializes background jobs for alert lifecycles
// ✅ NEW: Import the device status checker
const { initializeDeviceStatusCheck } = require("./helpers/deviceStatusManager"); 
const Device = require("./models/Device"); // Mongoose Model for Devices
const { processReading } = require("./controllers/sensorReadingController"); // Controller to handle sensor logic
const HistoricalReading = require("./models/HistoricalReading"); // Mongoose Model for historical logs
const { createSystemLogs } = require("./helpers/createSystemLogs"); // Utility to create system logs
const { Socket } = require("dgram"); // (This import seems unused and can likely be removed)

// --- Server & Socket.IO Initialization ---
const app = express(); // Create the Express application
const server = http.createServer(app); // Create an HTTP server using the Express app

/**
 * Initialize Socket.IO server with specific configurations.
 * @property {object} cors - Configures Cross-Origin Resource Sharing for the frontend URL.
 * @property {boolean} allowEIO3 - Enables support for Engine.IO v3, required by the ESP32 Socket.IO client.
 * @property {number} pingInterval - How often to send a ping packet (10s).
 * @property {number} pingTimeout - How long to wait for a pong packet before timing out (30s).
 */
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // Frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  allowEIO3: true,       // ESP32 compatibility
  pingInterval: 10000,   //
  pingTimeout: 30000,    //
});

// Make the 'io' instance available to all routes/controllers via the 'app' object
app.set("io", io); 
const PORT = process.env.PORT || 8080; // Set port from environment or default to 8080

/**
 * Main function to start the server.
 * Initializes database, cron jobs, middleware, routes, and socket handlers.
 */
const startServer = async () => {
  const DEVID = "unknownDevice"; // Default device ID (seems unused)
  try {
    // 1. Connect to MongoDB
    await connectDB();
    
    // 2. Run initial background tasks
    createDefaultUser(); // Ensure default admin exists
    initializeAlertCronJobs(); // Start cron jobs for managing alerts
    
    // 3. ✅ NEW: Start the device heartbeat status checker
    // This cron job will periodically check `currentState.lastContact`
    // for all devices and mark any silent ones as "Offline".
    initializeDeviceStatusCheck(io);

    // 4. Load Express Middleware (e.g., json parser, cors)
    require("./middleware")(app);
    
    // 5. Load API Routes (e.g., /api/devices, /api/logs)
    require("./routes")(app);

    // ===========================
    // 🔌 SOCKET.IO HANDLERS
    // ===========================
    
    /**
     * This block runs every time a new client (browser or ESP32) connects.
     * The 'socket' object represents that specific client's connection.
     */
    io.on("connection", (socket) => {
      console.log(`✅ Socket client connected:`, socket.id);

        /**
         * A debug listener that logs *any* event received by this socket.
         * Useful for seeing the flow of events from clients.
         */
        socket.onAny((event, ...args) => {
          console.log(`📨 [${socket.id}] event received: ${event}`, args);
        });

      /**
       * (ESP32 Event)
       * Triggered by the ESP32 when it wants the latest pump configuration.
       * This is used on connect and before starting a pump cycle.
       */
      socket.on("requestDeviceConfig", async (rawDeviceId) => { //
        try {
          const deviceId = String(rawDeviceId).replace(/"/g, ""); // Sanitize "ps01-dev" string
          const device = await Device.findById(deviceId).lean();
          if (device && device.configurations && device.configurations.controls) {
            const pumpConfig = device.configurations.controls.pumpCycleIntervals || {}; //
            // Emit config back *only to this socket*
            socket.emit("deviceConfig", { pumpCycleIntervals: pumpConfig }); 
            console.log(`📡 (on request) Sent pump config to ${deviceId}:`, pumpConfig);
          } else {
            console.warn(`⚠️ (on request) No pump config for device ${deviceId}`);
            socket.emit("deviceConfig", { pumpCycleIntervals: {} }); //
          }
        } catch (err) {
          console.error("Error fetching pump config on request:", err);
        }
      });

      /**
       * (ESP32 Event)
       * The first event an ESP32 sends to identify itself and join its dedicated room.
       * This now also serves as the "Online" status trigger.
       */
      socket.on("joinRoom", async (rawDeviceId) => { //
        const deviceId = String(rawDeviceId).replace(/"/g, "");
        socket.join(deviceId); // Join a Socket.IO room named after the deviceId
        socket.deviceId = deviceId; // Store deviceId on the socket object for later (like in disconnect)
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);

        try {
          // Check if the device was previously marked "Offline"
          const device = await Device.findById(deviceId).lean();
          const wasOffline = !device || device.currentState.status === "Offline"; //

          // Update the device status to Online and set lastContact timestamp
          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.status": "Online", //
                "currentState.lastContact": new Date(), //
              },
            },
            { new: true } // Return the updated document
          );

          // ✅ Log "Online" event *only if it was previously offline*
          if (wasOffline) {
            console.log(`✨ Device ${deviceId} is now ONLINE.`);
            createSystemLogs(
              null,
              deviceId,
              "Micro controller",
              "Device is online",
              "success" // Log type
            );
            // Notify frontend that the device is online
            if (updatedDevice) {
                io.emit("deviceUpdate", updatedDevice);
            }
          }
          
          // Send the latest pump config to the device upon joining
          if (updatedDevice && updatedDevice.configurations && updatedDevice.configurations.controls) {
            const pumpConfig = updatedDevice.configurations.controls.pumpCycleIntervals || {}; //
            socket.emit('deviceConfig', { pumpCycleIntervals: pumpConfig }); //
            console.log(`📡 Sent pump config to ${deviceId}:`, pumpConfig);
          }
        } catch (err) {
          console.error(`Error processing joinRoom for ${deviceId}:`, err);
        }
      });

      /**
       * (ESP32 Event)
       * Receives valve state confirmation from ESP32 after a command.
       * This event also acts as a "heartbeat", updating `lastContact`.
       */
      socket.on("stateUpdate", async (data) => { //
        try {
          const { deviceId, valveState } = data;
          console.log(`⚡ Received state update from ${deviceId}: Valve is ${valveState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.valve": valveState, // Update valve state
                "commands.setValve": "NONE", // Clear the pending command
                "currentState.lastContact": new Date(), // ✅ HEARTBEAT: Update last contact time
              },
            },
            { new: true }
          );

          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice); // Notify frontend
          }
        } catch (error) {
          console.error("Error processing state update from device:", error);
        }
      });

    /**
     * (ESP32 Event)
     * Receives pump state updates (IDLE, FILLING, DRAINING) from ESP32.
     * This event also acts as a "heartbeat", updating `lastContact`.
     */
      socket.on("pumpStateUpdate", async (data) => { //
        try {
          const { deviceId, pumpState } = data; 
          console.log(`⚡ Received pump state update from ${deviceId}: Pump is ${pumpState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.pump": pumpState, // Update pump state
                "commands.setPump": "NONE", // Clear the pending command
                "currentState.lastContact": new Date(), // ✅ HEARTBEAT: Update last contact time
              },
            },
            { new: true }
          );

          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice); // Notify frontend
          }
        } catch (error) {
          console.error("Error processing pump state update from device:", error);
        }
      });

      /**
       * (ESP32 Event)
       * The PRIMARY heartbeat event. Receives sensor data every 5 seconds.
       * This block sanitizes data, saves a historical copy, and then
       * passes the data to `processReading` controller for all main logic.
       */
      socket.on("esp32_data", async (payload) => { //
        try {
          const data = payload;
          const { deviceId, TEMP, TDS, TURBIDITY } = data;

          console.log(`📡 ESP32 Reading from ${deviceId} → TEMP: ${TEMP}°C, TDS: ${TDS} ppm, TURBIDITY: ${TURBIDITY} ntu`);

          // Helper to sanitize and default invalid readings to 0
          const safeRound = (val) => {
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num * 10) / 10;
          };

          // Round to single decimal
          const tempRounded = safeRound(TEMP);
          const tdsRounded = safeRound(TDS);
          const turbRounded = safeRound(TURBIDITY);
          const currentTimestamp = new Date();

          // Save a copy to the historical collection
          try {
            const newHistoricalReading = new HistoricalReading({
              deviceId: deviceId,
              timestamp: currentTimestamp,
              reading: {
                PH: null, // ESP32 code does not send PH
                TDS: tdsRounded,
                TEMP: tempRounded,
                TURBIDITY: turbRounded,
              },
            });
            await newHistoricalReading.save();
            console.log(`💾 Saved historical reading for ${deviceId}`);
          } catch (saveError) {
            console.error("❌ Error saving historical reading:", saveError);
          }

          // Prepare mock 'req' and 'res' objects to pass to the controller
          // This allows reusing the controller logic from
          const req = {
            body: {
              deviceId,
              temp: tempRounded, // uses 'temp'
              tds: tdsRounded, // uses 'tds'
              turbidity: turbRounded, // uses 'turbidity'
              timestamp: currentTimestamp, // uses 'timestamp'
            },
            app, // Pass the app instance so the controller can access `io`
          };

          const res = { // Mock response object for logging
            status: (code) => ({
              json: (data) =>
                console.log(`📤 [processReading:${code}]`, JSON.stringify(data)),
            }),
          };

          // ✅ Call the main controller. This function handles alerts,
          // updates device state, AND updates `currentState.lastContact`.
          await processReading(req, res); 

        } catch (err) {
          console.error("❌ Error handling ESP32 data:", err);
        }
      });

      /**
       * (Socket.IO Event)
       * Triggered when any client (browser or ESP32) disconnects.
       * ⛔️ This NO LONGER logs an "offline" event.
       * Why: A disconnect can be temporary (Wi-Fi drop). The new
       * `deviceStatusManager` cron job is now the single source of truth
       * for determining if a device is truly offline.
       */
      socket.on("disconnect", () => {
        const deviceId = socket.deviceId ? socket.deviceId : "unknown device";
        console.log(`❌ Socket client disconnected: ${socket.id} (Device: ${deviceId})`);
        
        // NO MORE `createSystemLogs` HERE.
      });
    });

    // ===========================
    // 🚀 START SERVER
    // ===========================
    server.listen(PORT, () => {
      console.log(`🚀 Server with real-time sockets running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// --- Run the server ---
startServer();