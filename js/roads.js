function initMap() {
  let fiu = { lat: 25.756, lng: -80.375 };
  map = new google.maps.Map(document.getElementById('map'), {
    center: fiu,
    zoom: 15
  });
}