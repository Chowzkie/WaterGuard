const express = require("express");
const router = express.Router();

const FAKE_API_DATA = require("../mockData/devices");

// Simulate devices going offline/online
const devicesForcedOffline = new Set();
setInterval(() => {
  if (Math.random() < 0.2) {
    const deviceIndex = Math.floor(Math.random() * FAKE_API_DATA.length);
    const device = FAKE_API_DATA[deviceIndex];
    if (device.status === "Online" && !devicesForcedOffline.has(device.id)) {
      device.status = "Offline";
      devicesForcedOffline.add(device.id);
      console.log(`Simulated Event: Device '${device.id}' taken OFFLINE.`);

      setTimeout(() => {
        device.status = "Online";
        devicesForcedOffline.delete(device.id);
        console.log(`Simulated Event: Device '${device.id}' brought back ONLINE.`);
      }, 30000 + Math.random() * 30000);
    }
  }
}, 15000);

// --- Routes ---
router.get("/", (req, res) => {
  res.json(FAKE_API_DATA);
});

router.put("/:deviceId/configurations", (req, res) => {
  const deviceId = req.params.deviceId;
  const newConfigs = req.body;

  const deviceIndex = FAKE_API_DATA.findIndex(d => d.id === deviceId);
  if (deviceIndex !== -1) {
    FAKE_API_DATA[deviceIndex].configurations = newConfigs;
    console.log(`Configurations updated for ${deviceId}:`, newConfigs);
    res.status(200).json({
      message: "Configuration updated successfully",
      updatedDevice: FAKE_API_DATA[deviceIndex],
    });
  } else {
    res.status(404).json({ message: "Device not found" });
  }
});

module.exports = router;
