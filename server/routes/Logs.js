const express = require("express");
const router = express.Router();
const LogsController = require("../controllers/LogsController")

router.get("/userlogs", LogsController.getUserLogs);
router.post('/delete', LogsController.deleteUserLogs);
router.post('/restore', LogsController.restoreUserLogs);
router.get("/systemlogs", LogsController.getSystemLogs);
router.post("/deleteSysLog", LogsController.deleteSystemLogs);
router.post("/restoreSysLog", LogsController.restoreSystemLogs);

// Route to mark multiple notifications as read
// This specific route MUST come FIRST
router.put("/systemlogs/read/all", LogsController.markAllLogsAsRead);

// Route to mark a single notification as read
// This dynamic route comes SECOND
router.put("/systemlogs/read/:id", LogsController.markLogAsRead);


module.exports = router;