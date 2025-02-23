var express = require('express');
var router = express.Router();

// Handle the POST request to receive GPS coordinates
router.post('/send-coordinates', function(req, res) {
  const { latitude, longitude } = req.body;
  console.log('Received coordinates:', latitude, longitude);

  // Send a response back to the client
  res.json({ message: 'Coordinates received successfully!', latitude, longitude });
});

module.exports = router;
