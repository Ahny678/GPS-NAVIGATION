const express = require("express");
const axios = require("axios");
const router = express.Router();

// -----------------------------
// 🌍 Haversine Distance (in meters)
// -----------------------------
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -----------------------------
// 📡 ESP32 Status Memory
// -----------------------------
let espStatus = {
  distance: 0,
  targetDistance: 0,
  lat: 9.5282003,
  lon: 6.4655235,
  yaw: 0,
  status: "Disconnected",
  obstacle: "Unknown",
  satellites: 0,
  targetLat: null,
  targetLon: null,
  waypoints: [],
  navigationActive: false,
};

// -----------------------------
// 🔄 ESP → Server: Status Updates
// -----------------------------
router.post("/esp-status", (req, res) => {
  espStatus = {
    ...espStatus,
    ...req.body,
    distance: req.body.distance_to_obstacle ?? espStatus.distance,
    targetDistance: req.body.distance_to_target ?? espStatus.targetDistance,
    status: "Connected",
  };

  console.log("ESP32 Status Update:", espStatus);
  res.json({ message: "Status received" });
});

// -----------------------------
// 📥 Frontend → Server: Get Latest ESP Status
// -----------------------------
router.get("/get-status", (req, res) => {
  res.json(espStatus);
});

// -----------------------------
// 🏠 Home Route
// -----------------------------
router.get("/", (_, res) => {
  res.render("index", { title: "GPS Navigation", espStatus });
});

// -----------------------------
// 📍 Frontend → Server: Set Target & Calculate Route
// -----------------------------
router.post("/send-coordinates", async (req, res) => {
  const { latitude, longitude } = req.body;
  const apiKey = "5b3ce3597851110001cf62489dfc1ea87c8e49589e4456b25f858f02";

  const esp_lat = espStatus.lat;
  const esp_long = espStatus.lon;

  espStatus.targetLat = latitude;
  espStatus.targetLon = longitude;

  if (
    !esp_lat ||
    !esp_long ||
    esp_lat === 0 ||
    esp_long === 0 ||
    espStatus.satellites === 0
  ) {
    console.error("Invalid ESP32 coordinates. Cannot route from 0,0.");
    return res.status(400).json({
      message:
        "ESP32 has no valid GPS fix (lat/lon = 0 or no satellites). Please wait for a GPS lock before calculating a route.",
      currentESPStatus: {
        lat: esp_lat,
        lon: esp_long,
        satellites: espStatus.satellites,
      },
    });
  }

  try {
    // Calculate straight-line distance first
    const directDistance = haversine(esp_lat, esp_long, latitude, longitude);

    // ✅ Short distance: use direct path instead of API
    if (directDistance < 30) {
      // Clear any old route
      espStatus.waypoints = [];
      espStatus.navigationActive = false;
      espStatus.targetDistance = (directDistance / 1000).toFixed(3);

      // Only set direct source-target waypoints
      const directPath = [
        { lat: esp_lat, lon: esp_long },
        { lat: latitude, lon: longitude },
      ];

      espStatus.waypoints = directPath;

      console.log(
        `Short route (${directDistance.toFixed(1)} m) — using direct path only.`
      );

      return res.json({
        message: "Short route (<30m) — using direct path only",
        distance: (directDistance / 1000).toFixed(3),
        duration: 0,
        targetLat: latitude,
        targetLon: longitude,
        waypoints: directPath,
      });
    }

    // 🧭 Otherwise, request route from ORS (foot-walking)
    const response = await axios.get(
      "https://api.openrouteservice.org/v2/directions/foot-walking",
      {
        params: {
          api_key: apiKey,
          start: `${esp_long},${esp_lat}`,
          end: `${longitude},${latitude}`,
        },
        headers: {
          Accept:
            "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
        },
      }
    );

    const route = response.data.features[0];
    const distance = route.properties.summary.distance / 1000; // km
    const duration = route.properties.summary.duration / 60; // min
    const coordinates = route.geometry.coordinates;

    // Set route waypoints
    espStatus.waypoints = coordinates.map(([lon, lat]) => ({ lat, lon }));
    espStatus.targetDistance = distance.toFixed(2);
    espStatus.navigationActive = false;

    console.log(
      `Route found (foot-walking): ${distance.toFixed(
        2
      )} km (${duration.toFixed(1)} min)`
    );

    res.json({
      message: "Route found successfully",
      distance: distance.toFixed(2),
      duration: duration.toFixed(1),
      targetLat: latitude,
      targetLon: longitude,
    });
  } catch (error) {
    if (error.response) {
      console.error("ORS Error:", error.response.data);
      res.status(400).json({
        message: "Could not find a valid route between points",
        orsError: error.response.data,
      });
    } else {
      console.error("Error fetching route:", error.message);
      res.status(500).json({ message: "Error calculating route" });
    }
  }
});

// -----------------------------
// 🚗 ESP → Server: Get Waypoints (Only if Active)
// -----------------------------
router.get("/get-waypoints", (req, res) => {
  if (!espStatus.navigationActive) {
    return res.status(200).json({ message: "Navigation inactive." });
  }

  if (!espStatus.waypoints.length) {
    return res.status(404).json({ message: "No route available yet." });
  }

  res.json({
    targetLat: espStatus.targetLat,
    targetLon: espStatus.targetLon,
    waypoints: espStatus.waypoints,
  });
});

// -----------------------------
// ▶️ Frontend → Server: Start Navigation
// -----------------------------
router.post("/start-navigation", (req, res) => {
  if (!espStatus.waypoints.length) {
    return res
      .status(400)
      .json({ message: "No waypoints set. Set a target first." });
  }

  espStatus.navigationActive = true;
  console.log("✅ Navigation started (flag=true)");
  res.json({ message: "Navigation started. ESP will now fetch waypoints." });
});

// -----------------------------
// ⏹️ Frontend → Server: Stop Navigation
// -----------------------------
router.post("/stop-navigation", (req, res) => {
  espStatus.navigationActive = false;
  espStatus.waypoints = []; // clear any old route
  console.log("🛑 Navigation stopped and waypoints cleared.");
  res.json({ message: "Navigation stopped and waypoints cleared." });
});

// -----------------------------
// Export Router
// -----------------------------
module.exports = router;
