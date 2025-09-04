const express = require("express");
const router = express.Router();
const LogsController = require("../controllers/LogsController")

router.get("/userlogs", LogsController.getUserLogs);

module.exports = router;