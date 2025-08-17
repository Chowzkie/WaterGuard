const express = require("express");
const router = express.Router();

const MOCK_USERS = require("../mockData/mockUsers");

// Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = MOCK_USERS.find(u => u.username === username && u.password === password);

  if (user) {
    const { password, ...userToSend } = user;
    res.json({ message: "Login successful", user: userToSend });
  } else {
    res.status(401).json({ message: "Invalid Username or Password!" });
  }
});

module.exports = router;
