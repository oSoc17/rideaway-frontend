import turf from 'turf';
import _ from 'lodash';

import {
  fetchJSON,
  pointAlongRoute,
  pointOnRoute,
  distanceAtLocation,
  instructionAt,
  calculateAngle
} from '../lib';
import { degAngle } from '../../constants';

import NavView from '../views/NavView';

let navView;
let router;

let loading = true;
let interval;

let result;

let dataAtLast;
let totalDistance;
let totalTime;

let i = 0;
let loc1;
let loc2;

/**
 * Initialises the navigation with the result from the api.
 * 
 * @param {Object} result - result from the api 
 */
function initializeNavigation(jsonresult) {
  result = jsonresult;
  dataAtLast =
    result.route.features[result.route.features.length - 1].properties;
  totalDistance = dataAtLast.distance / 1000.0;
  totalTime = dataAtLast.time;
  i = 0;
}

/**
 * Initialises the navigation application.
 */
export default function initialize(origin, destination, routerContext) {
  // do not reinitialize if everything is already set
  if (_.isEqual(loc1, origin) && _.isEqual(loc2, destination)) {
    document.querySelector('.main-loading').classList.remove('visible');
    return;
  }

  router = routerContext;

  navView = new NavView();
  loc1 = origin;
  loc2 = destination;
  const url = `https://cyclerouting-api.osm.be/route?loc1=${loc1}&loc2=${loc2}&profile=brussels&instructions=true`;

  fetchJSON(url).then(json => {
    loading = true;
    initializeNavigation(json);
    //setTimeout(step, 50);

    // keep updating when the userposition changes
    router.geolocController.onUpdate = startTracking;

    // if the userposition is already found, do a single update
    // if not, start tracking
    if (router.geolocController.userPosition) {
      update();

      // remove the loading screen
      if (loading) {
        loading = false;
        document.querySelector('.main-loading').classList.remove('visible');
      }
    } else {
      router.geolocController.startTracking();
    }
    // set an interval update for the directional arrow
    interval = setInterval(onIntervalUpdate, 1000);
  });
  document
    .getElementById('close-navigation')
    .addEventListener('click', function() {
      router.goToRouteplanner();
    });

  document.getElementById('goto-map').addEventListener('click', function() {
    router.goToRouteplanner(loc1, loc2);
  });
}

/**
 * Starts tracking your location and updating the screen.
 */
function startTracking(position) {
  this.userPosition = [position.coords.longitude, position.coords.latitude];
  // update
  update();
  if (loading) {
    loading = false;
    document.querySelector('.main-loading').classList.remove('visible');
  }
}

/*
* Updates the direction arrow
* Clears itself as soon as the instruction changes
*/
function onIntervalUpdate() {
  const { userPosition, userHeading } = router.geolocController;
  // don't do anything if we don't have any user location details
  if (!userPosition || !userHeading) {
    return;
  }
  const distance = distanceAtLocation(result.route, userPosition);
  const instruction = instructionAt(result.instructions, distance * 1000);

  // if the next instruction isn't an enter or stop, clear the interval
  const type = instruction.properties.type;
  if (type !== 'enter' && type !== 'stop') {
    clearInterval(interval);
    interval = null;
  }
  navView.updateDirectionArrow(instruction, userPosition, userHeading);
}

/**
 * Step function used in debug mode to iterate over the route.
 */
function step() {
  if (loading) {
    loading = false;
    document.querySelector('.main-loading').classList.remove('visible');
  }
  var location = pointAlongRoute(result.route, i).geometry.coordinates;
  update(location);

  i += 0.01;

  if (i < length) {
    setTimeout(step, 50);
  }
}

/**
 * Updates the screen based on the given location.
 * 
 * @param {Object} location - the current location 
 */
function update() {
  const location = turf.point(router.geolocController.userPosition);
  const closestPoint = pointOnRoute(result.route, location);
  let distance = distanceAtLocation(result.route, location);
  let instruction = instructionAt(result.instructions, distance * 1000);
  let distanceToNext = instruction.properties.distance - distance * 1000;
  const remainingDistance = (totalDistance - distance) * 1000;
  const remainingTime = remainingDistance / 3.6;

  console.log(location);
  console.log(closestPoint);
  console.log(distance);
  console.log(instruction);
  console.log(distanceToNext);

  // if we arrive at stop, set the interval again
  if (instruction.properties.type === 'stop' && !interval) {
    interval = setInterval(onIntervalUpdate, 1000);
  }

  if (totalDistance - distance < 0.01) {
    // navigation finished
    router.goToRouteplanner();
  }

  // if the user is more than 25m off route, show a direction arrow to navigate
  // back to the route.
  if (closestPoint.distance > 0.025) {
    distanceToNext = closestPoint.distance * 1000;
    distance += closestPoint.distance;
    instruction = {
      type: 'Feature',
      properties: {
        type: 'enter',
        nextColour: instruction.properties.colour,
        nextRef: instruction.properties.ref,
        angle: degAngle[calculateAngle(location, closestPoint)]
      },
      geometry: {
        type: 'Point',
        coordinates: closestPoint.point
      }
    };
  }

  let offset = 0;
  if (distanceToNext < 1000) {
    offset = (distanceToNext - 1000) * -1 / 20;
  }

  // update the view
  navView.updateRouteStats(remainingDistance, remainingTime);
  navView.updateCurrentRoadSquare(instruction);
  navView.updateNextRoadSquare(instruction, offset);
  navView.updateCurrentRoadColour(instruction, offset);
  navView.updateNextRoadColour(instruction, offset);
  navView.updateNextInstructionDistance(distanceToNext, offset);
  navView.updateNextRoadDirection(instruction, offset);
  navView.updateMessage(instruction);
}
