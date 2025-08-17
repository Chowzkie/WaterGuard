const devicesRoutes = require("./devices");
const stationsRoutes = require("./stations");
const sensorRoutes = require("./sensorReadings");
const usersRoutes = require("./Users");
const authRoutes = require("./auth");

module.exports = (app) => {
  app.use("/api/devices", devicesRoutes);
  app.use("/api/stations", stationsRoutes);
  app.use("/api/sensor-readings", sensorRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api", authRoutes); // for login, etc.
};
