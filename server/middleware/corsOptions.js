const cors = require("cors");

const corsOptions = {
  origin: [
    "https://waterguardapp.com", 
    "https://www.waterguardapp.com",  // live frontend domain
    "http://localhost:5173"        
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // allow cookies or auth headers if used
};

module.exports = cors(corsOptions);
