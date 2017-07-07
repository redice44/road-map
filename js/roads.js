const epsilon = 0.001; // Accuracy for snapping. Smaller requires more accuracy.

let startPoint;
let endPoint;
let pathPolyLine;
let map;
let geojson = {
  "type": "FeatureCollection",
  "features": []
};

function initMap() {
  map = setupMap();

  document.getElementById('load-geojson').addEventListener('click', loadGeoJson);
  document.getElementById('update-geojson').addEventListener('click', updateGeoJson);
  google.maps.event.addListener(map, 'click', handleMapClick);
}

function loadGeoJson () {
  let input = document.getElementById('input-geojson').value;
  if (!input) {
    console.log('No input');
    return;
  }

  geojson = JSON.parse(input);
  map.data.addGeoJson(geojson);
  map.data.setStyle({
    strokeColor: '#FF0000',
    strokeWeight: 2
  });
}

function updateGeoJson () {
  // Reset poly line
  startPoint = null;
  endPoint = null;
  if (pathPolyLine) {
    pathPolyLine.setPath([]);
  }

  // Clear map data layer
  map.data.forEach((feature) => {
    map.data.remove(feature);
  });

  // Update map data layer
  map.data.addGeoJson(geojson);
  map.data.setStyle({
    strokeColor: '#FF0000',
    strokeWeight: 2
  });

  // Update the output textarea
  document.getElementById('output-geojson').value = JSON.stringify(geojson);

  // Update the download link for roads
  let blob = new Blob([JSON.stringify(geojson)], {type: 'application/json'});
  let url = URL.createObjectURL(blob);
  document.getElementById('download-roads').href = url;

  // Update the download link for intersections
  let intersectionsGeoJson = getIntersections();
  blob = new Blob([JSON.stringify(intersectionsGeoJson)], {type: 'application/json'});
  url = URL.createObjectURL(blob);
  document.getElementById('download-intersections').href = url;

}

function getIntersections () {
  let roads = [];
  let intersections = [];

  geojson.features.forEach((feature) => {
    roads.push(feature.geometry.coordinates);
  });

  intersections.push(roads[0][0]);
  roads.forEach((road) => {
    if (isNewIntersection(intersections, road[0])) {
      intersections.push(road[0]);
    }

    if (isNewIntersection(intersections, road[1])) {
      intersections.push(road[1]);
    }
  });

  let intersectionGeoJson = {
    "type": "FeatureCollection",
    "features": []
  };

  intersections.forEach((intersection) => {
    intersectionGeoJson.features.push({
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": intersection
      },
      "properties": {}
    });
  });

  console.log(intersectionGeoJson);
  return intersectionGeoJson;
}

function isNewIntersection (intersections, point) {
  let i = 0;
  let result = true;

  while (i < intersections.length && result) {
    if (point[0] === intersections[i][0] && point[1] === intersections[i][1]) {
      // coordinate already exists, do not add.
      console.log('Exists. Do not add.');
      result = false;
    }
    i++;
  }

  return result;
}

function handleMapClick (event) {
  console.log(`{ lat: ${event.latLng.lat()}, lng: ${event.latLng.lng()} },`);

  if (!startPoint) {
    // First click
    startPoint = { lng: event.latLng.lng(), lat: event.latLng.lat() };
    startPoint = snapVertex(startPoint);
  } else {
    var polylineFeature = {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": []
      },
      "properties": {}
    };

    endPoint = { lng: event.latLng.lng(), lat: event.latLng.lat() };
    endPoint = snapVertex(endPoint);

    pathPolyLine = new google.maps.Polyline({
      map: map,
      path: [startPoint, endPoint],
      strokeColor: '#000000',
      strokeOpacity: 1.0,
      strokeWeight: 1
    });

    for (let i = 0; i < pathPolyLine.getPath().getLength(); i++) {
      let pt = pathPolyLine.getPath().getAt(i);
      polylineFeature.geometry.coordinates.push([
        pt.lng(), pt.lat()  
      ]);
    }

    geojson.features.push(polylineFeature);

    // Make the start of the next polyline the end of this one.
    startPoint = { lng: event.latLng.lng(), lat: event.latLng.lat() };
  }
}

function snapVertex (point) {
  // check to see if this is "near" any other vertex and "snap" to it instead
  let updated = false;
  let i = 0;
  let j = 0;

  while (i < geojson.features.length && !updated) {
    let coords = geojson.features[i].geometry.coordinates;
    j = 0;
    while (j < coords.length && !updated) {
      // 0: lng, 1: lat
      let deltaLng = Math.abs(coords[j][0] - point.lng);
      let deltaLat = Math.abs(coords[j][1] - point.lat);
      if (deltaLng < epsilon && deltaLat < epsilon) {
        // Close enough to be the same vertex
        point = { lng: coords[j][0], lat: coords[j][1] };
        console.log('Snapped vertex');
        updated = true;
      }
      j++;
    }
    i++;
  }

  return point;
}

function setupMap() {
  let fiu = { lat: 25.756, lng: -80.375 };

  return new google.maps.Map(document.getElementById('map'), {
    center: fiu,
    zoom: 14
  });
}