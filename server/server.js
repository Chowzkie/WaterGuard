const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
const corsOption = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
};
app.use(cors(corsOption));
app.use(express.json());

// Load all routes from routes/index.js
require("./routes")(app);

// Start server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
