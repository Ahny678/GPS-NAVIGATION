const express = require("express");
const axios = require("axios");
const router = express.Router();

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
  waypoints: [], // ✅ Add this
};

// Endpoint for ESP32 to POST status
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

// Endpoint for frontend to fetch ESP32 status
router.get("/get-status", (req, res) => {
  res.json(espStatus);
});

// Home route (render EJS with defaults)
router.get("/", (_, res) => {
  res.render("index", { title: "GPS Navigation", espStatus });
});

// Handle receiving coordinates and fetching route
router.post("/send-coordinates", async function (req, res) {
  const { latitude, longitude } = req.body;

  const apiKey = "5b3ce3597851110001cf62489dfc1ea87c8e49589e4456b25f858f02";

  // Coordinates from ESP32 (live)
  const esp_lat = espStatus.lat;
  const esp_long = espStatus.lon;

  // Save target coordinates in espStatus
  espStatus.targetLat = latitude;
  espStatus.targetLon = longitude;

  // ✅ SAFETY CHECK: Ensure ESP32 has a valid GPS fix before routing
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
    // Fetch route from OpenRouteService API
    const response = await axios.get(
      "https://api.openrouteservice.org/v2/directions/driving-car",
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
    const duration = route.properties.summary.duration / 60; // minutes
    const coordinates = route.geometry.coordinates;

    // Save waypoints
    espStatus.waypoints = coordinates.map(([lon, lat]) => ({ lat, lon }));
    espStatus.targetDistance = distance.toFixed(2);

    console.log(
      `Route found: ${distance.toFixed(2)} km (${duration.toFixed(1)} min)`
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

// ✅ Endpoint for ESP32 to fetch the current route waypoints
router.get("/get-waypoints", (req, res) => {
  if (!espStatus.waypoints || espStatus.waypoints.length === 0) {
    return res.status(404).json({ message: "No route available yet" });
  }
  res.json({
    targetLat: espStatus.targetLat,
    targetLon: espStatus.targetLon,
    waypoints: espStatus.waypoints,
  });
});

module.exports = router;
