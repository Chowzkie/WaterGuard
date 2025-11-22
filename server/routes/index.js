const devicesRoutes = require("./devices");
const stationsRoutes = require("./stations");
const sensorRoutes = require("./sensorReadings");
const auth = require("./auth.js")
const alertRoutes = require('./alerts');
const logsRoute = require('./Logs.js')
const historicalReadingsRoutes = require('./historical-readings.js');

module.exports = (app) => {
  app.use("/api/devices", devicesRoutes);
  app.use("/api/stations", stationsRoutes);
  app.use("/api/sensor-readings", sensorRoutes);
  app.use("/api/auth", auth);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/logs', logsRoute);
  app.use('/api/historical-readings', historicalReadingsRoutes);
};
