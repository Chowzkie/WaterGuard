const cors = require("cors");

const corsOptions = {
  origin: [
    "https://waterguardapp.com",   // your live frontend domain
    "http://localhost:5173"        // optional: allow local testing
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // allow cookies or auth headers if used
};

module.exports = cors(corsOptions);
