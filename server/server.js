// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const connectDB = require("./config/db");
const createDefaultUser = require("./utils/createDefaultUser");
const { initializeAlertCronJobs } = require("./helpers/alertManager");
const Device = require("./models/Device");
const { processReading } = require("./controllers/sensorReadingController"); // ✅ integrate alert logic
const { createSystemLogs } = require("./helpers/createSystemLogs")

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO config — ESP32 compatible
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  allowEIO3: true,       // Support ESP32’s Socket.IO client (EIO=3)
  pingInterval: 10000,   // 10s ping interval
  pingTimeout: 30000,    // 30s timeout (prevents frequent reconnects)
});

app.set("io", io);
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  const DEVID = "unknownDevice";
  try {
    await connectDB();
    createDefaultUser();
    initializeAlertCronJobs();

    require("./middleware")(app);
    require("./routes")(app);

    // ===========================
    // 🔌 SOCKET.IO HANDLERS
    // ===========================
    io.on("connection", (socket) => {
      console.log(`✅ Socket client connected:`, socket.id);

        socket.onAny((event, ...args) => {
          console.log(`📨 [${socket.id}] event received: ${event}`, args);
        });

      socket.on("requestDeviceConfig", async (rawDeviceId) => {
        try {
          const deviceId = String(rawDeviceId).replace(/"/g, ""); // sanitize if quotes present
          const device = await Device.findById(deviceId).lean();
          if (device && device.configurations && device.configurations.controls) {
            const pumpConfig = device.configurations.controls.pumpCycleIntervals || {};
            socket.emit("deviceConfig", { pumpCycleIntervals: pumpConfig });
            console.log(`📡 (on request) Sent pump config to ${deviceId}:`, pumpConfig);
          } else {
            console.warn(`⚠️ (on request) No pump config for device ${deviceId}`);
            socket.emit("deviceConfig", { pumpCycleIntervals: {} });
          }
        } catch (err) {
          console.error("Error fetching pump config on request:", err);
        }
      });

      // --- ESP32 Joins Its Own Room ---
      socket.on("joinRoom", async (rawDeviceId) => {
        const deviceId = String(rawDeviceId).replace(/"/g, "");
        socket.join(deviceId);
        socket.deviceId = rawDeviceId.deviceId;
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);

        // Send current pumpCycleIntervals config to device (so ESP can use it)
        try {
          const device = await Device.findById(deviceId).lean();
          if (device && device.configurations && device.configurations.controls) {
            const pumpConfig = device.configurations.controls.pumpCycleIntervals || {};
            // Emit a dedicated event with the config
            socket.emit('deviceConfig', { pumpCycleIntervals: pumpConfig });
            console.log(`📡 Sent pump config to ${deviceId}:`, pumpConfig);
          }
        } catch (err) {
          console.error("Error sending pump config on join:", err);
        }
      });

      // --- Handle Valve Command state updates (existing) ---
      socket.on("stateUpdate", async (data) => {
        try {
          const { deviceId, valveState } = data;
          console.log(`⚡ Received state update from ${deviceId}: Valve is ${valveState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.valve": valveState,
                "commands.setValve": "NONE",
                "currentState.lastContact": new Date(),
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

    // --- NEW: Handle Pump State Updates from ESP32 ---
      socket.on("pumpStateUpdate", async (data) => {
        try {
          const { deviceId, pumpState } = data; // pumpState expected: 'FILLING' | 'DRAINING' | 'IDLE'
          console.log(`⚡ Received pump state update from ${deviceId}: Pump is ${pumpState}`);

          const updatedDevice = await Device.findByIdAndUpdate(
            deviceId,
            {
              $set: {
                "currentState.pump": pumpState,
                "commands.setPump": "NONE",
                "currentState.lastContact": new Date(),
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

      // --- 🧩 Enhanced: Handle Sensor Readings from ESP32 (alert-aware) ---
      socket.on("esp32_data", async (payload) => {
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

          // Instead of just updating DB, call the existing alert + device update controller
          const req = {
            body: {
              deviceId,
              temp: tempRounded,
              tds: tdsRounded,
              turbidity: turbRounded,
              timestamp: new Date(),
            },
            app, // so controller can access io
          };

          const res = {
            status: (code) => ({
              json: (data) =>
                console.log(`📤 [processReading:${code}]`, JSON.stringify(data)),
            }),
          };

          await processReading(req, res); // ✅ triggers alerts, DB update, socket emits

        } catch (err) {
          console.error("❌ Error handling ESP32 data:", err);
        }
      });

      // --- Handle Disconnect ---
      socket.on("disconnect", () => {
        console.log(`❌ Socket client disconnected:`, socket.id);
        createSystemLogs(null, socket.deviceId, "Micro controller" ,"Device is offline", "error");
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

startServer();
