var express = require('express');
var router = express.Router();
//PLACEHOLDER FOR ESP32 COORDINATES
const esp_lat =6.5243793  ;
const esp_long =3.3792057 ; 

// Home route
router.get('/', function(req, res, next) {
  res.render('index', { title: 'GPS Navigation' });
});

// Route to handle POST request for /send-coordinates
router.post('/send-coordinates', function(req, res) {
  const { latitude, longitude } = req.body;
  console.log('Received coordinates:', latitude, longitude);

  res.json({ message: 'Coordinates received successfully!', latitude, longitude });
});

module.exports = router;
