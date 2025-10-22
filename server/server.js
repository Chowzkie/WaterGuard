// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// --- Database & Helpers ---
const connectDB = require("./config/db");
const createDefaultUser = require("./utils/createDefaultUser");
const { initializeAlertCronJobs } = require("./helpers/alertManager");
const { initializeDeviceStatusCheck } = require("./helpers/deviceStatusManager"); 
const { initializeSensorStatusCheck } = require("./helpers/sensorStatusManager"); 
const Device = require("./models/Device");
const { processReading } = require("./controllers/sensorReadingController"); //
const HistoricalReading = require("./models/HistoricalReading");
const { createSystemLogs } = require("./helpers/createSystemLogs");
const { Socket } = require("dgram");

// --- Server & Socket.IO Initialization ---
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  allowEIO3: true,       //
  pingInterval: 10000,   //
  pingTimeout: 30000,    //
});

app.set("io", io); //
const PORT = process.env.PORT || 8080;

/**
 * Main function to start the server.
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    
    // 2. Run initial background tasks
    createDefaultUser();
    initializeAlertCronJobs();
    
    // 3. Start the device heartbeat status checker
    initializeDeviceStatusCheck(io);

    // 4. Start the individual sensor heartbeat status checker
    initializeSensorStatusCheck(io);

    // 5. Load Express Middleware
    require("./middleware")(app);
    
    // 6. Load API Routes
    require("./routes")(app);

    // ===========================
    // 🔌 SOCKET.IO HANDLERS
    // ===========================
    
    io.on("connection", (socket) => {
      console.log(`✅ Socket client connected:`, socket.id);

        /**
         * A debug listener that logs *any* event received.
         */
        socket.onAny((event, ...args) => {
          console.log(`📨 [${socket.id}] event received: ${event}`, args);
        });

      /**
       * (ESP32 Event)
       * Sends pump config on request.
       */
      socket.on("requestDeviceConfig", async (rawDeviceId) => { //
        try {
          const deviceId = String(rawDeviceId).replace(/"/g, ""); //
          const device = await Device.findById(deviceId).lean();
          if (device && device.configurations && device.configurations.controls) {
            const pumpConfig = device.configurations.controls.pumpCycleIntervals || {}; //
            socket.emit("deviceConfig", { pumpCycleIntervals: pumpConfig }); //
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
       * Handles device "Online" status and logging.
       */
      socket.on("joinRoom", async (rawDeviceId) => { //
        const deviceId = String(rawDeviceId).replace(/"/g, "");
        socket.join(deviceId);
        socket.deviceId = deviceId;
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);

        try {
          const device = await Device.findById(deviceId).lean();
          const wasOffline = !device || device.currentState.status === "Offline"; //

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.status": "Online", //
                "currentState.lastContact": new Date(), //
              },
            },
            { new: true }
          );

          if (wasOffline) {
            console.log(`✨ Device ${deviceId} is now ONLINE.`);
            createSystemLogs(
              null,
              deviceId,
              "Micro controller",
              "Device is online",
              "success"
            );
            if (updatedDevice) {
                io.emit("deviceUpdate", updatedDevice);
            }
          }
          
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
       * Receives valve state confirmation; acts as a heartbeat.
       */
      socket.on("stateUpdate", async (data) => { //
        try {
          const { deviceId, valveState } = data;
          console.log(`⚡ Received state update from ${deviceId}: Valve is ${valveState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.valve": valveState, //
                "commands.setValve": "NONE", //
                "currentState.lastContact": new Date(), // ✅ HEARTBEAT
              },
            },
            { new: true }
          );

          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice);
          }
        } catch (error) {
          console.error("Error processing state update from device:", error);
        }
      });

    /**
     * (ESP32 Event)
     * Receives pump state updates; acts as a heartbeat.
     */
      socket.on("pumpStateUpdate", async (data) => { //
        try {
          const { deviceId, pumpState } = data; 
          console.log(`⚡ Received pump state update from ${deviceId}: Pump is ${pumpState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.pump": pumpState, //
                "commands.setPump": "NONE", //
                "currentState.lastContact": new Date(), // ✅ HEARTBEAT
              },
            },
            { new: true }
          );

          if (updatedDevice) {
            io.emit("deviceUpdate", updatedDevice);
          }
        } catch (error) {
          console.error("Error processing pump state update from device:", error);
        }
      });

      /**
       * (ESP32 Event)
       * The PRIMARY heartbeat event. Receives all sensor data.
       * ✅ THIS HANDLER IS NOW UPDATED FOR PH.
       */
      socket.on("esp32_data", async (payload) => { //
        try {
          const data = payload;
          // ✅ 1. Extract PH (uppercase) from the payload
          const { deviceId, TEMP, TDS, TURBIDITY, PH } = data; 

          // ✅ 2. Update log to include PH
          console.log(`📡 ESP32 Reading from ${deviceId} → PH: ${PH}, TEMP: ${TEMP}°C, TDS: ${TDS} ppm, TURBIDITY: ${TURBIDITY} ntu`);

          /**
           * Sanitizes a sensor value. Preserves 'null', rounds numbers,
           * and converts other invalid values (like NaN) to 0.
           */
          const sanitize = (val) => {
            if (val === null || val === undefined) return null; // Preserve null
            const num = Number(val);
            return isNaN(num) ? 0 : Math.round(num * 10) / 10;
          };

          // ✅ 3. Sanitize all values, including PH
          const tempRounded = sanitize(TEMP);
          const tdsRounded = sanitize(TDS);
          const turbRounded = sanitize(TURBIDITY);
          const phRounded = sanitize(PH); // New
          const currentTimestamp = new Date();

          // Save a copy to the historical collection
          try {
            const newHistoricalReading = new HistoricalReading({
              deviceId: deviceId,
              timestamp: currentTimestamp,
              reading: {
                PH: phRounded, // ✅ 4. Add phRounded here
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

          // Prepare mock 'req' object to pass to the controller
          const req = {
            body: {
              deviceId,
              temp: tempRounded,
              tds: tdsRounded,
              turbidity: turbRounded,
              pH: phRounded, // ✅ 5. Pass phRounded as 'pH' (camelCase)
              timestamp: currentTimestamp,
            },
            app, //
          };

          const res = { // Mock response object
            status: (code) => ({
              json: (data) =>
                console.log(`📤 [processReading:${code}]`, JSON.stringify(data)),
            }),
          };

          // Call the main controller, which will handle all logic
          await processReading(req, res); //

        } catch (err) {
          console.error("❌ Error handling ESP32 data:", err);
        }
      });

      /**
       * (Socket.IO Event)
       * Handles client disconnects. No longer logs "offline".
       */
      socket.on("disconnect", () => {
        const deviceId = socket.deviceId ? socket.deviceId : "unknown device";
        console.log(`❌ Socket client disconnected: ${socket.id} (Device: ${deviceId})`);
        // No createSystemLogs here; cron job handles offline status
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