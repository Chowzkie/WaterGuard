//corsOptions.js
const cors = require('cors');

const corsOptions = {
    origin: "https://waterguardapp.com"
};

module.exports = cors(corsOptions);