import mapboxgl from 'mapbox-gl';
import turf from 'turf';
import _ from 'lodash';

import { urls, boundingBox, center, intervalTimes } from '../../constants';
import { swapArrayValues, fetchJSON, displayTime } from '../lib';
import icons from '../../icons';
import MapController from './MapController';
import { createGeocoder, getReverseLookup } from './GeocoderController';
import View from '../views/RouteplannerView';

// Global variables
let places = {
  origin: null,
  destination: null
};

// Global handlers
let handlers = {
  nav: null
};

// Interval variable
let updateHeading;

let router;
let map;
let mapController;
let geolocController;
let view;

/**
 * 
 * @param {Array[double, double]} origin - The origin
 * @param {Array[double, double]} destination - The destination 
 * @param {router} routerContext - The router
 */
export default function initialize(origin, destination, routerContext) {
  // set router and update function
  router = routerContext;
  router.geolocController.onUpdate = startTracking;

  // fresh load
  if (!map) {
    // passed origin and destination, set values
    if (origin && destination) {
      origin = swapArrayValues(origin);
      destination = swapArrayValues(destination);

      places.origin = origin;
      places.destination = destination;
    }

    // initialize controllers and views
    mapController = new MapController(map);
    geolocController = router.geolocController;
    view = new View(mapController, geolocController);

    // check if navigating from nav
    if (router.geolocController.userPosition) {
      view.toggleMainLoading();
    }

    // set map for easy access
    map = mapController.map;

    // bind all of the actions (when the maps loads)
    bindActions();
  } else {
    // when no origin or dest passed
    if (!origin || !destination) {
      clearAll();
      map.easeTo({
        center: center.latlng,
        zoom: center.zoom,
        pitch: 0,
        bearing: 0
      });
      geolocController.trackingMode = 'default';
    }
    // if origin has changed, change it and recalculate
    if (origin && !_.isEqual(places.origin, swapArrayValues(origin))) {
      mapController.clearMapObject('originMarker');
      places.origin = swapArrayValues(origin);
      calculateProfiles(places, ['shortest', 'brussels']);
    }
  }
  // look for tracking mode changes if navigation has changed it
  changeTrackingMode();
}

/**
 * Stracking function used by the routeplanner
 * @param {Array[int, int]} position - The position of the user
 */
function startTracking(position) {
  // when position is unavailable
  if (!position) {
    window.userLocated = false;
    mapController.userMarker.remove();
    view.toggleCenterButton(false);
    return;
  }
  // Get coords
  const LngLat = [position.coords.longitude, position.coords.latitude];
  // Check if user position is inside bounding box
  if (
    boundingBox[0] <= LngLat[0] &&
    LngLat[0] <= boundingBox[2] &&
    boundingBox[1] <= LngLat[1] &&
    LngLat[1] <= boundingBox[3]
  ) {
    if (!this.userPosition && !window.userLocated) {
      window.userLocated = true;
      view.hideLocationLoading();
    }
    this.userPosition = LngLat;
    mapController.setUserMarker(LngLat);
    if (geolocController.trackingMode === 'centered') {
      map.easeTo({ center: this.userPosition });
    }

    // if we're navigating from my location and the location
    // changes, check if change is bigger than 100m, then re-
    // calculate
    if (this.myLocationSelected['origin']) {
      const distance = turf.distance(LngLat, places.origin);
      if (distance > 0.1) {
        places.origin = LngLat;
        calculateProfiles(places, ['shortest', 'brussels'], true);
      }
    }
    if (this.myLocationSelected['destination']) {
      const distance = turf.distance(LngLat, places.destination);
      if (distance > 0.1) {
        places.destination = LngLat;
        calculateProfiles(places, ['shortest', 'brussels'], true);
      }
    }
    view.toggleCenterButton(true);
  } else {
    if (this.userPosition && window.userLocated) {
      this.userPosition = null;
      window.userLocated = false;
      mapController.userMarker.remove();
      view.toggleCenterButton(false);
    }
  }
}

/**
 * Clears all the stuff that's showing if a route is calculated
 */
export function clearAll() {
  view.hideNavigationBox();
  mapController.clearAllMapObjectsAndRoutes();
  document.querySelector('.routelist-all').click();
  view.clearGeocoderInputs();
  places.origin = null;
  places.destination = null;
}

/**
 * Calculates route for every profile passed
 * @param {Object{origin: Array[int, int], destination: Array[int, int]}} places - Origin / Dest
 * @param {Array[string]} profiles - Array of the profiles
 * @param {boolean} update - Used when my location is set as origin -> silent recalculate
 */
function calculateProfiles(places, profiles, update) {
  !update && view.toggleMapLoading();
  const { origin, destination } = places;
  profiles.forEach(profile => {
    calculateRoute(origin, destination, profile, update);
  });
}

/**
 * Calculates a route and shows it on the map
 * @param {Array[int, int]} origin - The LatLng Coords
 * @param {Array[int, int]} destination - The LagLng Coords
 * @param {String} profile - The routing profile
 * @param {boolean} update - For my location, if we should do a silent update
 */
function calculateRoute(origin, destination, profile, update) {
  // Swap around values for the API
  const originS = swapArrayValues(origin);
  const destinationS = swapArrayValues(destination);

  // Construct the url
  const url = `${urls.route}/route?loc1=${originS}&loc2=${destinationS}&profile=${profile}`;

  fetchJSON(url)
    .then(json => {
      // Check if profile already exists
      const calculatedRoute = map.getSource(profile);
      if (calculatedRoute) {
        // Just set the data
        calculatedRoute.setData(json.route);
      } else {
        // Add a new layer
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

      if (profile === 'shortest') {
        const lastFeature = json.route.features[json.route.features.length - 1];
        const { properties: { time } } = lastFeature;
        const text = displayTime(time);
        const middleFeature =
          json.route.features[Math.round(json.route.features.length / 2)];
        const LatLng = middleFeature.geometry.coordinates[0];
        // if there's already a popup, clear it before adding a new one
        mapController.clearMapObject('shortestPopup');
        mapController.addPopup(LatLng, text);
      }

      // Move the network layer always on top
      if (profile === 'shortest' && map.getSource('brussels')) {
        map.moveLayer('shortest', 'brussels');
      }

      // If the profile is brussels, initiate the nav stuff
      if (profile === 'brussels') {
        const oldHandler = handlers.nav;

        // prepare the navigation stuff when a userposition is found
        // and the destination isn't the userposition
        const prepareToNavigate =
          geolocController.userPosition &&
          !geolocController.myLocationSelected['destination'];
        if (prepareToNavigate) {
          const { destination } = places;
          // set origin as default start, use slice to copy
          const origin = geolocController.userPosition.slice();

          // Set the new handler
          handlers.nav = () => {
            router.prepareNavHistory(
              swapArrayValues(origin),
              swapArrayValues(destination)
            );

            router.goToNavigation(
              swapArrayValues(origin),
              swapArrayValues(destination)
            );
          };
        }

        // Always hide the layers
        mapController.toggleLayer('GFR_routes', 'none');
        mapController.toggleLayer('GFR_symbols', 'none');

        // Activate none
        view.clearShowAllRoutes('none');

        // Show the navigation box, change the handler

        const lastFeature = json.route.features[json.route.features.length - 1];
        const { properties: { distance, time } } = lastFeature;
        view.showNavigationBox(
          oldHandler,
          handlers.nav,
          distance,
          time,
          prepareToNavigate
        );

        // do not fit to bounds if updating
        if (update) return;

        // only fit bounds once we know the map is fully resized
        setTimeout(() => {
          mapController.fitToBounds(origin, destination);
          // hide the loading icon
          view.toggleMapLoading();
        }, 350);
      }
    })
    .catch(ex => {
      // eslint-disable-next-line
      console.warn('Problem calculating route: ', ex);
      if (profile === 'brussels') {
        view.toggleMapLoading();
        view.toggleErrorDialog();
      }
    });
}

/** 
 * Converts a result object to coordinates
 * @param Object{result: {geometry: coordinates: Array[Lat, Lng]}} result - The result from the geocoder
 * @returns Array[int, int] LatLng Array - Array with the coords
 */
function setPoint(result) {
  return result.geometry.coordinates;
}

/**
 * Sets the origin/dest as the userPosition on default
 * if placeToSet is null, it clears the route
 * @param {string} place - Origin/Destination
 * @param {placeToSet} placeToSet - Place to set
 */
function setPlace(place, placeToSet = geolocController.userPosition) {
  // switches around origin and destination
  if (placeToSet === 'origin' || placeToSet === 'destination') {
    // swap variables
    const oldPlace = places[place];
    places[place] = places[placeToSet];
    places[placeToSet] = oldPlace;

    const oldMyLocatiodSelected = geolocController.myLocationSelected[place];
    geolocController.myLocationSelected[place] =
      geolocController.myLocationSelected[placeToSet];
    geolocController.myLocationSelected[placeToSet] = oldMyLocatiodSelected;

    mapController.swapOriginDestMarkers();
  } else if (placeToSet === null) {
    onPlaceClear(place);
  } else {
    // set userposition as place
    places[place] = placeToSet;

    // set flag to recalculate when changed
    geolocController.myLocationSelected[place] = true;
  }
  const { origin, destination } = places;
  if (origin && destination) {
    router.prepareRouteplannerHistory(
      swapArrayValues(origin),
      swapArrayValues(destination)
    );
    calculateProfiles({ origin, destination }, ['shortest', 'brussels']);
  }
}

/**
 * When a place is cleared
 * @param {string} place - Place
 */
function onPlaceClear(place) {
  mapController.clearRoutes();
  mapController.clearMapObjects([`${place}Marker`, 'shortestPopup']);
  places[place] = null;
  view.hideNavigationBox();
  router.clearHistory();
}

/**
 * When a result is selected
 * @param {string} place 
 * @param {Object} result 
 */
function onPlaceResult(place, result) {
  // result event fires twice for some reason, this prevents it
  // from executing our code twice, resulting in errors
  // https://github.com/mapbox/mapbox-gl-geocoder/issues/99
  if (!places[place] || places[place] !== setPoint(result)) {
    mapController.clearMapObject(`${place}Marker`);
    places[place] = setPoint(result);
    mapController.addMarker(place, places[place]);

    geolocController.myLocationSelected[place] = false;

    if (places.origin && places.destination) {
      // Calculate route if both are filled in
      const { origin, destination } = places;
      // prepare the url
      router.prepareRouteplannerHistory(
        swapArrayValues(origin),
        swapArrayValues(destination)
      );
      calculateProfiles(
        {
          origin,
          destination
        },
        ['shortest', 'brussels']
      );
    }
  }
}

/**
 * Set clicked point on map
 * @param {*} mapboxgl.map - The map
 */
function setMapClick(map) {
  map.on('click', e => {
    const LngLat = [e.lngLat.lng, e.lngLat.lat];
    // don't set if we already have a route
    if (places.origin && places.destination) {
      return;
    }
    // prepare result for function
    const result = { geometry: { coordinates: LngLat } };
    if (!places.origin) {
      getReverseLookup(LngLat).then(result =>
        view.setGeocoderInput('origin', result)
      );
      onPlaceResult('origin', result);
    } else {
      getReverseLookup(LngLat).then(result =>
        view.setGeocoderInput('destination', result)
      );
      onPlaceResult('destination', result);
    }
  });
}

/**
 * Called everytime the tracking mode changes, passed as callback,
 * handles the different scenario's
 */
function changeTrackingMode() {
  const btn = document.querySelector('.center-btn');
  switch (geolocController.trackingMode) {
    case 'default':
      btn.querySelector('img').src = icons.Center;
      btn.classList.remove('center-btn--active');
      if (updateHeading) {
        clearInterval(updateHeading);
        updateHeading = null;
      }
      break;
    case 'centered':
      // if we were updating the heading => clear
      btn.querySelector('img').src = icons.Center;
      btn.classList.add('center-btn--active');
      if (updateHeading) {
        clearInterval(updateHeading);
        updateHeading = null;
      }
      map.easeTo({
        center: geolocController.userPosition,
        zoom: 15,
        bearing: 0,
        pitch: 0
      });
      break;
    case 'tracking':
      btn.querySelector('img').src = icons.Navigate;
      btn.classList.add('center-btn--active');
      if (!updateHeading) {
        updateHeading = setInterval(() => {
          map.easeTo({
            center: geolocController.userPosition,
            zoom: 18.5,
            pitch: 75,
            bearing: geolocController.userHeading || 0
          });
        }, intervalTimes.userHeading);
      }
      break;
    case 'pitched':
      clearInterval(updateHeading);
      updateHeading = null;
      break;
    case 'pitched-centered':
      btn.classList.add('center-btn--active');
      map.flyTo({ center: geolocController.userPosition, zoom: 15 });
      break;
    default:
      break;
  }
}

/**
 * Binds all of our actions on map load
 */
function bindActions() {
  const routeChosen = places.origin && places.destination;

  // Executes when the map loaded
  map.on('load', function() {
    // Change the position of the copyright controls
    map.addControl(new mapboxgl.AttributionControl(), 'bottom-left');

    // only start tracking if userPosition isn't defined yet
    // else add the already found position to the map
    if (!geolocController.userPosition) {
      geolocController.startTracking();
    } else {
      view.hideLocationLoading();
      mapController.setUserMarker(geolocController.userPosition);
    }

    // turn on loading screen for map
    view.toggleMapLoading();

    fetchJSON(urls.network).then(json => {
      // Show all the routes on the map
      mapController.addAllRoutes(json);

      // turn off loading screen of map
      view.toggleMapLoading();

      routeChosen && mapController.toggleLayer('GFR_routes', 'none');
      routeChosen && mapController.toggleLayer('GFR_symbols', 'none');

      // If the origin & destination were passed, calculate a route
      if (places.origin && places.destination) {
        const { origin, destination } = places;
        mapController.addMarker('origin', origin);
        mapController.addMarker('destination', destination);
        calculateProfiles(
          {
            origin,
            destination
          },
          ['shortest', 'brussels']
        );
      }

      // add filters in mobile menu last to decrease loading time
      view.addFilters(json.features);
    });

    view.toggleMainLoading();

    // Create geocoders and add to map
    const geocoder = createGeocoder('origin');
    const geocoder2 = createGeocoder('destination');
    map.addControl(geocoder);
    map.addControl(geocoder2);

    // Configure all elements (geocoder, inputs, etc)
    view.configureAllElements(setPlace);

    if (routeChosen) {
      getReverseLookup(places.origin).then(result =>
        view.setGeocoderInput('origin', result)
      );
      getReverseLookup(places.destination).then(result =>
        view.setGeocoderInput('destination', result)
      );
    }

    // Fire functions on result
    // !!!!! Geocoder also fires this when the input box is unfocused
    // See configureInputs in domManipulations
    // Because we're clearing the marker and destination
    // It recalculates the route...
    // => weird behaviour when you unfocus after manually emptying the input
    // p l s use a different geocoder
    geocoder.on('result', ({ result }) => {
      onPlaceResult('origin', result);
    });
    geocoder2.on('result', ({ result }) => {
      onPlaceResult('destination', result);
    });
    // Functions fired when the geocoder is cleared
    geocoder.on('clear', () => {
      onPlaceClear('origin');
    });
    geocoder2.on('clear', () => {
      onPlaceClear('destination');
    });

    setMapClick(map);

    view.configureCenterButton(changeTrackingMode);
  });

  /**
   * When the map is touched, the tracking mode should change
   * so the user can still move around
   */
  map.on('touchstart', () => {
    const btn = document.querySelector('.center-btn');
    // if currently center => go to default mode
    // if currently tracking => go to pitched default mode
    if (geolocController.trackingMode === 'centered') {
      geolocController.trackingMode = 'default';
      btn.classList.remove('center-btn--active');
    } else if (geolocController.trackingMode === 'tracking') {
      geolocController.trackingMode = 'pitched';
      btn.querySelector('img').src = icons.Center;
      btn.classList.remove('center-btn--active');
    }
    changeTrackingMode();
  });
}
