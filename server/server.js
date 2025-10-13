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
      console.log("✅ Socket client connected:", socket.id);

      // --- ESP32 Joins Its Own Room ---
      socket.on("joinRoom", (deviceId) => {
        socket.join(deviceId);
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);
      });

      // --- Handle Valve Command from Server (existing logic) ---
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

      // --- 🧩 Enhanced: Handle Sensor Readings from ESP32 (alert-aware) ---
      socket.on("esp32_data", async (payload) => {
        try {
          const data = payload;
          const { deviceId, TEMP, TDS } = data;

          console.log(`📡 ESP32 Reading from ${deviceId} → TEMP: ${TEMP}°C, TDS: ${TDS} ppm`);

          // Round to single decimal
          const tempRounded = Math.round(TEMP * 10) / 10;
          const tdsRounded = Math.round(TDS * 10) / 10;

          // Instead of just updating DB, call the existing alert + device update controller
          const req = {
            body: {
              deviceId,
              temp: tempRounded,
              tds: tdsRounded,
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
        console.log("❌ Socket client disconnected:", socket.id);
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
