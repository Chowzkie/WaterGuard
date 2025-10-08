// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const connectDB = require("./config/db");
const createDefaultUser = require("./utils/createDefaultUser");
const { initializeAlertCronJobs } = require("./helpers/alertManager");
const Device = require('./models/Device');

const app = express();
const server = http.createServer(app);

// --- FIX APPLIED HERE ---
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // your front-end origin
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  allowEIO3: true, // This enables support for older Socket.IO v2 clients
});

// Make io available to routes/controllers
app.set("io", io);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    createDefaultUser();
    initializeAlertCronJobs();

    require("./middleware")(app);
    require("./routes")(app);

    // --- Socket.IO Connection Logic ---
    io.on("connection", (socket) => {
      console.log("✅ Socket client connected:", socket.id);

      socket.on('joinRoom', (deviceId) => {
        socket.join(deviceId);
        console.log(`📲 Device ${deviceId} joined room: ${deviceId}`);
      });

      socket.on('stateUpdate', async (data) => {
        try {
            const { deviceId, valveState } = data;
            
            console.log(`⚡ Received state update from ${deviceId}: Valve is ${valveState}`);
            
            const updatedDevice = await Device.findByIdAndUpdate(
                deviceId,
                {
                  $set: {
                    'currentState.valve': valveState,
                    'commands.setValve': 'NONE',      // Reset the command
                    'currentState.lastContact': new Date() // Update heartbeat
                  }
                },
                { new: true } // Return the updated document
            );
            
            // Broadcast the full updated device data to all listening web clients
            if (updatedDevice) {
              io.emit('deviceUpdate', updatedDevice);
            }

        } catch (error) {
            console.error("Error processing state update from device:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket client disconnected:", socket.id);
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server with real-time sockets running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();