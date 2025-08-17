const express = require("express");
const router = express.Router();

const MOCK_USERS = require("../mockData/mockUsers");

// Get all users
router.get("/", (req, res) => {
  res.json(MOCK_USERS);
});

// Get user profile
router.get("/:username", (req, res) => {
  const user = MOCK_USERS.find(u => u.username === req.params.username);
  if (user) {
    const { password, ...userProfile } = user;
    res.json(userProfile);
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

// Update profile (contact number)
router.put("/:username/profile", (req, res) => {
  const { contact } = req.body;
  const userIndex = MOCK_USERS.findIndex(u => u.username === req.params.username);

  if (userIndex === -1) return res.status(404).json({ message: "User not found" });

  const contactStr = String(contact);
  if (!/^09\d{9}$/.test(contactStr) && !/^\+639\d{9}$/.test(contactStr)) {
    return res.status(400).json({ message: "Invalid phone number format." });
  }

  MOCK_USERS[userIndex].contact = contact;
  const { password, ...updatedProfile } = MOCK_USERS[userIndex];
  res.json({ message: "Profile updated successfully", updatedUserProfile: updatedProfile });
});

// Change password
router.put("/:username/password", (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = MOCK_USERS.find(u => u.username === req.params.username);

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.password !== currentPassword) {
    return res.status(401).json({ message: "Current password does not match." });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ message: "Weak password." });
  }

  user.password = newPassword;
  res.json({ message: "Password changed successfully!" });
});

module.exports = router;
