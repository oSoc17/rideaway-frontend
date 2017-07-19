import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import 'whatwg-fetch';
import _ from 'lodash';
import 'l20n';

import icons from './icons';

import { getElementByClassName } from './modules/lib';
import { startTracking } from './modules/geolocation';
import { addFilters, configureAllElements } from './modules/domManipulations';
import { toggleLayer, clearRoutes } from './modules/mapManipulations';
import './scss/styles.scss';

document.querySelector('.marker-white').src = icons.NavWhite;

mapboxgl.accessToken = '';
const map = new mapboxgl.Map({
  container: 'map', // container id
  style: 'https://openmaptiles.github.io/positron-gl-style/style-cdn.json', //stylesheet location
  center: [4.355975, 50.860633], // starting position
  zoom: 11 // starting zoom
});

let places = {
  origin: null,
  destination: null,
  userPosition: null
};

/*
* Fetch a JSON
* @param {String} url
* @returns json
*/
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.json())
      .then(json => resolve(json))
      .catch(ex => reject(ex));
  });
}

/*
* Adds the filters and adds all of the routes to the map
*/
function addAllRoutes(geojson) {
  addFilters(geojson.features);

  map.addSource('GFR', {
    type: 'geojson',
    data: geojson
  });

  // actual routes
  map.addLayer({
    id: 'GFR_routes',
    type: 'line',
    source: 'GFR',
    layout: {
      visibility: 'visible'
    },
    paint: {
      'line-color': {
        type: 'identity',
        property: 'colour'
      },
      'line-width': 5,
      'line-opacity': 0.3
    }
  });

  // route identifiers
  map.addLayer({
    id: 'GFR_symbols',
    type: 'symbol',
    source: 'GFR',
    layout: {
      visibility: 'visible',
      'symbol-placement': 'line',
      'text-font': ['Open Sans Regular'],
      'text-field': '{icr}',
      'text-size': 16
    },
    paint: {
      'text-color': {
        type: 'identity',
        property: 'colour'
      }
    }
  });
}

/*
* Adds a yellow marker to the map
* @param LatLng Array[Lat, Lng]
*/
function addMarker(LatLng) {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: LatLng
        },
        properties: {
          iconSize: [50, 50]
        }
      }
    ]
  };
  const marker = geojson.features[0];
  let el = document.createElement('img');
  el.className = 'marker';
  el.src = icons.LocatorYellow;
  el.style.width = marker.properties.iconSize[0] + 'px';
  el.style.height = marker.properties.iconSize[1] + 'px';
  return new mapboxgl.Marker(el, {
    offset: [-marker.properties.iconSize[0] / 2, -marker.properties.iconSize[1]]
  }).setLngLat(marker.geometry.coordinates);
}

/*
* Calculates a route and shows it on the map
* @param origin Array[Lat, Lng]
* @param destination Array[Lat, Lng]
* @param profile String
*/
function calculateRoute(origin, destination, profile) {
  // swap around values for the API
  const originS = [origin[1], origin[0]];
  const destinationS = [destination[1], destination[0]];
  const url = `https://cyclerouting-api.osm.be/route?loc1=${originS}&loc2=${destinationS}&profile=${profile}`;
  fetchJSON(url).then(json => {
    // check if profile already exists
    const calculatedRoute = map.getSource(profile);
    if (calculatedRoute) {
      calculatedRoute.setData(url);
    } else {
      map.addLayer({
        id: profile,
        type: 'line',
        source: {
          type: 'geojson',
          data: json.route
        },
        paint: {
          'line-color':
            profile === 'shortest'
              ? 'lightgrey'
              : {
                  type: 'identity',
                  property: 'colour'
                },
          'line-width': 4
        },
        layout: {
          'line-cap': 'round'
        }
      });
    }
    if (profile === 'shortest' && map.getSource('brussels')) {
      map.moveLayer('shortest', 'brussels');
    }

    // sets the bounding box correctly
    let bbox = [];
    if (origin[0] > destination[0] && origin[1] > destination[1]) {
      bbox = [destination, origin];
    } else if (origin[0] < destination[0] && origin[1] > destination[1]) {
      bbox = [[origin[0], destination[1]], [destination[0], origin[1]]];
    } else if (origin[0] > destination[0] && origin[1] < destination[1]) {
      bbox = [[destination[0], origin[1]], [origin[0], destination[1]]];
    } else {
      bbox = [origin, destination];
    }

    map.fitBounds(bbox, { padding: 100 });
  });
}

function organiseRoutes() {
  toggleLayer(map, 'brussels', 'visible');
  toggleLayer(map, 'shortest', 'visible');
}

/*
* Returns a geocoder object
* @param placeholder String
* @returns MapboxGeocoder object
*/
function createGeocoder(placeholder) {
  return new MapboxGeocoder({
    accessToken:
      'pk.eyJ1IjoiYXJuYXVkd2V5dHMiLCJhIjoiY2o0cGt3d3oxMXl0cDMzcXNlbThnM3RtaCJ9.BMUyxqHH-FC69pW4U4YO9A',
    flyTo: false,
    placeholder,
    country: 'BE',
    bbox: [4.225015, 50.74915, 4.524909, 50.938001]
  });
}

function configureGeocoders() {
  const inputs = document.querySelectorAll('.mapboxgl-ctrl-geocoder input');
  inputs.forEach(input => {
    input.setAttribute('data-l10n-id', `${input.placeholder}-input`);
  });
}

/*
* Converts a result object to coordinates
* @param result Object{result: {geometry: coordinates: Array[Lat, Lng]}}
* @returns Array[Lat, Lng]
*/
function setPoint(result) {
  return result.geometry.coordinates;
}

function updatePosition(position) {
  places.userPosition = position;
}

function setPlace(place) {
  places[place] = places.userPosition;
}

// executes when the map is loading
map.on('load', function() {
  let markerO = null;
  let markerD = null;

  // start stracking the user
  startTracking(map, updatePosition);

  // show all the routes on the map
  fetchJSON('https://cyclerouting-api.osm.be/routes/GFR.json').then(json =>
    addAllRoutes(json)
  );

  // create geocoders and add to map
  const geocoder = createGeocoder('origin');
  const geocoder2 = createGeocoder('destination');
  map.addControl(geocoder);
  map.addControl(geocoder2);
  configureGeocoders();

  configureAllElements(map, setPlace);

  // fire functions on result
  geocoder.on('result', ({ result }) => {
    // result event fires twice for some reason, this prevents it
    // from executing our code twice, resulting in errors
    // https://github.com/mapbox/mapbox-gl-geocoder/issues/99
    if (!places.origin || places.origin !== setPoint(result)) {
      markerO && markerO.remove();
      places.origin = setPoint(result);
      markerO = addMarker(places.origin);
      markerO.addTo(map);

      // calculate route if destination is filled in
      places.destination &&
        calculateRoute(places.origin, places.destination, 'shortest');
      places.destination &&
        calculateRoute(places.origin, places.destination, 'brussels');
    }
  });
  geocoder2.on('result', ({ result }) => {
    if (!places.destination || places.destination !== setPoint(result)) {
      markerD && markerD.remove();
      places.destination = setPoint(result);
      markerD = addMarker(places.destination);
      markerD.addTo(map);

      places.origin &&
        calculateRoute(places.origin, places.destination, 'shortest');
      places.origin &&
        calculateRoute(places.origin, places.destination, 'brussels');

      // always hide the layer
      toggleLayer(map, 'GFR_routes', 'none');
      toggleLayer(map, 'GFR_symbols', 'none');
      document.querySelector('.routelist-none').click();
    }
  });
  geocoder.on('clear', () => {
    clearRoutes(map, markerO);
    places.origin = null;
  });
  geocoder2.on('clear', () => {
    clearRoutes(map, markerD);
    places.destination = null;
  });

  document.querySelector('.center-btn').addEventListener('click', () => {
    places.userPosition &&
      map.flyTo({
        center: places.userPosition,
        zoom: [15]
      });
  });
});
