const corsMiddleware = require("./corsOptions");
const jsonParser = require("./jsonParser");

module.exports = (app) => {
  app.use(corsMiddleware);
  app.use(jsonParser);
};
