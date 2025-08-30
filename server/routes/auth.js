// server/routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); // New: Import the middleware
const upload = require("../middleware/imageUpload")

router.post("/login", authController.loginUser);

//Use the middleware to protect the route
router.get("/user", authMiddleware, authController.getUser);
router.put("/update-name", authMiddleware, authController.updateName);
router.put("/update-username", authMiddleware, authController.updateUsername);
router.put("/update-contact", authMiddleware, authController.updateContact);
router.put("/update-password", authMiddleware, authController.updatePassword);
router.put('/upload-image/:userId', authMiddleware, upload.single('profileImage'), authController.uploadProfileImage);

module.exports = router;