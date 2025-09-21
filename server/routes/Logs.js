const express = require("express");
const router = express.Router();
const LogsController = require("../controllers/LogsController")

router.get("/userlogs", LogsController.getUserLogs);
router.post('/delete', LogsController.deleteUserLogs);
router.post('/restore', LogsController.restoreUserLogs);
router.get("/systemlogs", LogsController.getSystemLogs);
router.post("/deleteSysLog", LogsController.deleteSystemLogs);
router.post("/restoreSysLog", LogsController.restoreSystemLogs);

module.exports = router;