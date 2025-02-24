function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError,{
      enableHighAccuracy: true, // Try to get high accuracy location
      timeout: 10000, // Wait at most 10 seconds for location
      maximumAge: 0  // Do not use cached locationgit p
      });
    } else {
      document.getElementById("error").innerHTML = "Geolocation is not supported by this browser.";
    }
  }
  
  function showPosition(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    
    // Display the coordinates on the HTML page
    document.getElementById("location").innerHTML = `Latitude: ${latitude} <br> Longitude: ${longitude}`;
  
    // Send the coordinates to the server using a POST request
    sendCoordinatesToServer(latitude, longitude);
  }
  
  function showError(error) {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        document.getElementById("error").innerHTML = "User denied the request for Geolocation.";
        break;
      case error.POSITION_UNAVAILABLE:
        document.getElementById("error").innerHTML = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        document.getElementById("error").innerHTML = "The request to get user location timed out.";
        break;
      case error.UNKNOWN_ERROR:
        document.getElementById("error").innerHTML = "An unknown error occurred.";
        break;
    }
  }
  
  function sendCoordinatesToServer(latitude, longitude) {
    fetch('/send-coordinates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: latitude,
        longitude: longitude
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Server response:', data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }
  