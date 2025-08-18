//corsOptions.js
const cors = require('cors');

const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
};

module.exports = cors(corsOptions);