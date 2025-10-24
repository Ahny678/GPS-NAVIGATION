const express = require("express");
const router = express.Router();

// -----------------------------
// 📡 ESP32 Status Memory
// -----------------------------
let espStatus = {
  lat: 9.5282003,
  lon: 6.4655235,
  yaw: 0,
  status: "Disconnected",
  obstacle: "Unknown",
  satellites: 0,
  targetLat: null,
  targetLon: null,
  navigationActive: false,
};

// -----------------------------
// 🔄 ESP → Server: Status Updates
// -----------------------------
router.post("/esp-status", (req, res) => {
  const { ...rest } = req.body;
  espStatus = { ...espStatus, ...rest, status: "Connected" };
  console.log("ESP32 Status Update:", espStatus);
  res.json({ message: "Status received" });
});

// -----------------------------
// 📥 Frontend → Server: Get Latest ESP Status
// -----------------------------
router.get("/get-status", (_, res) => res.json(espStatus));

// -----------------------------
// 🏠 Home Route
// -----------------------------
router.get("/", (_, res) =>
  res.render("index", { title: "GPS Navigation", espStatus })
);

// -----------------------------
// 📍 Frontend → Server: Set Target
// -----------------------------
router.post("/set-target", (req, res) => {
  const { latitude, longitude } = req.body;
  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Invalid target coordinates." });
  }

  espStatus.targetLat = latitude;
  espStatus.targetLon = longitude;
  console.log(`📍 Target coordinates set: ${latitude}, ${longitude}`);
  res.json({ message: "Target coordinates stored successfully." });
});

// -----------------------------
// 📡 Frontend → Server: Send Coordinates to ESP
// -----------------------------
router.post("/send-coordinates", (req, res) => {
  if (espStatus.targetLat == null || espStatus.targetLon == null) {
    return res.status(400).json({ message: "No target set." });
  }

  // The ESP should be configured to poll /get-target, or you can push directly via another protocol
  console.log(
    `📡 Sending target to ESP: Lat=${espStatus.targetLat}, Lon=${espStatus.targetLon}`
  );

  res.json({
    message: "Target coordinates sent to ESP",
    targetLat: espStatus.targetLat,
    targetLon: espStatus.targetLon,
  });
});

// -----------------------------
// ⏹️ Stop Navigation
// -----------------------------
router.post("/stop-navigation", (req, res) => {
  espStatus.navigationActive = false;
  espStatus.targetLat = null;
  espStatus.targetLon = null;
  console.log("🛑 Navigation stopped.");
  res.json({ message: "Navigation stopped and target cleared." });
});

module.exports = router;
