const express = require("express");
const router = express.Router();

const FAKE_STATIONS_DATA = require("../mockData/stations");

router.get("/", (req, res) => {
  res.json(FAKE_STATIONS_DATA);
});

module.exports = router;
