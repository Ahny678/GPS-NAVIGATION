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
  espStatus = { ...req.body, status: "Connected" };
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
// Handle receiving coordinates and fetching route
router.post("/send-coordinates", async function (req, res) {
  const { latitude, longitude } = req.body;

  // Replace with your actual API key
  const apiKey = "5b3ce3597851110001cf62489dfc1ea87c8e49589e4456b25f858f02";

  // Coordinates from ESP32 (live)
  const esp_lat = espStatus.lat;
  const esp_long = espStatus.lon;

  // Save target coordinates in espStatus
  espStatus.targetLat = latitude;
  espStatus.targetLon = longitude;

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
    console.log(coordinates);

    // Save useful route info in espStatus
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

module.exports = router;
