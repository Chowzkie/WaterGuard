// server/server.js
const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db"); // Assuming this is the path to your file
const createDefaultUser = require("./utils/createDefaultUser");

const app = express();
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    // Await the database connection before proceeding
    await connectDB();

    // Call createDefaultUser AFTER the connection is established
    createDefaultUser();

    // Load middleware and routes
    require("./middleware")(app);
    require("./routes")(app);

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();