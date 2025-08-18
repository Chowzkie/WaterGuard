const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// --- call the middleware(index.js) ---
require("./middleware")(app);

// --- call the routes(index.js) ---
require("./routes")(app);

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
