// server/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // New: Import the middleware

router.post("/login", authController.loginUser);

//Use the middleware to protect the route
router.get("/user", authMiddleware, authController.getUser);

module.exports = router;