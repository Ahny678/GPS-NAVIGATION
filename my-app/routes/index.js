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
router.post("/send-coordinates", async function (req, res) {
  const { latitude, longitude } = req.body;

  // Replace with your actual API key
  const apiKey = "5b3ce3597851110001cf62489dfc1ea87c8e49589e4456b25f858f02";

  // Coordinates from ESP32 (can be dynamically updated or passed in a request)
  const esp_lat = 9.5282003;
  const esp_long = 6.4655235;

  try {
    // Fetch route from OpenRouteService API using axios
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

    // Extract route data from the API response
    const routeData = response.data;

    // Log the GeoJSON route data to the console (formatted for easier readability)
    //console.log('Route data:', JSON.stringify(routeData, null, 2));

    // Extract the first feature
    const route = routeData.features[0];
    const steps = route.properties.segments[0].steps;
    const coordinates = route.geometry.coordinates;
    console.log(coordinates);
  } catch (error) {
    // Handle errors that may occur during the API request
    console.error("Error fetching route:", error.message || error);
    res.status(500).json({ message: "Error calculating route" });
  }
});

module.exports = router;
