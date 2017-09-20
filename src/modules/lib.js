import turf from 'turf';
import { degAngle } from '../constants';

/*
* Fetch a JSON
* @param String url - The url to fetch from
* @returns Object json - The fetched JSON
*/
export function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => response.json())
      .then(json => resolve(json))
      .catch(ex => reject(ex));
  });
}

/*
* Displays the distance a string format
* @param int m - The distance in meters
* @returns string distance - Formatted distance
*/
export function displayDistance(m) {
  if (m < 1000) {
    return `${Math.round(m / 10) * 10}m`;
  }
  return `${Math.round(m / 100) / 10}km`;
}

/*
* Display the time in a string format
* @param int s - The time in seconds
* @returns string time - Formatted time
*/
export function displayTime(s) {
  if (s < 60) {
    return '1min';
  }
  if (s < 3600) {
    return `${Math.round(s / 60)}min`;
  }
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  return `${h} h ${m}min`;
}

/*
* Display the arrival time formatted in a string
* @param int s - The time in seconds
* @returns string arrival - Formatted arrival time
*/
export function displayArrival(s) {
  const arrival = new Date(Date.now() + s * 1000);

  var h = arrival.getHours();
  var m = arrival.getMinutes();

  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
}

/*
* Gets a paramtername
* @param string paramterName - Paramter
* @returns {} param - The param
*/
export function findGetParameter(parameterName) {
  var result = null,
    tmp = [];
  location.search
    .substr(1)
    .split('&')
    .forEach(function(item) {
      tmp = item.split('=');
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
  return result;
}

/*
* Swaps around the values in a 2 value array
* @param Array[int, int] array - The array to swap
* @returns Array[int, int] swapped - The swapped array
*/
export function swapArrayValues(array) {
  const array2 = [];
  array2.push(array[1]);
  array2.push(array[0]);
  return array2;
}

/**
 * Get a url parameter by its name. If no url is given the current url is used.
 * 
 * @param {string} name - the name of the parameter 
 * @param {string} url - the url to get the parameter from
 */
export function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Calculates the length of the route.
 * 
 * @param {Object} route - the route object.
 * @return {number} length of the route.
 */
export function lengthOfRoute(route) {
  var length = 0.0;
  for (var i = 0; i < route.features.length; i++) {
    var feature = route.features[i];
    if (feature.geometry.type == 'LineString') {
      length += turf.lineDistance(feature);
    }
  }
  return length;
}

/**
 * Returns the feature at the given distance on the route
 * 
 * @param {Object} route - the route object
 * @param {number} distance - distance on route 
 */
export function pointAlongRoute(route, distance) {
  var length = 0.0;
  for (var i = 0; i < route.features.length; i++) {
    var feature = route.features[i];
    if (feature.geometry.type == 'LineString') {
      var localLength = turf.lineDistance(feature);

      if (length <= distance && distance <= localLength + length) {
        return turf.along(feature, distance - length);
      }

      length += localLength;
    }
  }
  return length;
}

/**
 * Returns the properties of the geojson feature that is closest to the
 * given point.
 * 
 * @param {Object} route - the route object 
 * @param {Object} point - a coordinate along the route
 */
export function pointOnRoute(route, point) {
  var ret = {
    distance: 1000000
  };
  for (var i = 0; i < route.features.length; i++) {
    var feature = route.features[i];
    if (feature.geometry.type == 'LineString') {
      var snapped = turf.pointOnLine(feature, point);

      if (snapped.properties.dist < ret.distance) {
        ret.distance = snapped.properties.dist;
        ret.point = snapped.geometry.coordinates;
        ret.data = feature.properties;
        ret.nextPoint = feature.geometry.coordinates[snapped.properties.index];
      }
    }
  }
  return ret;
}

/**
 * Calculates the distance of the route between the startpoint and the
 * given location.
 * 
 * @param {Object} route - the route object
 * @param {Object} location - point along the route
 */
export function distanceAtLocation(route, location) {
  var bestDist = null;
  var bestIndex = null;
  for (var i = 0; i < route.features.length; i++) {
    var feature = route.features[i];
    if (feature.geometry.type == 'LineString') {
      var snapped = turf.pointOnLine(feature, location);
      var dist = snapped.properties.dist;

      if (bestDist !== null) {
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      } else {
        bestDist = dist;
        bestIndex = i;
      }
    }
  }

  var length = 0.0;
  for (var j = 0; j < bestIndex; j++) {
    length += turf.lineDistance(route.features[j]);
  }
  length += turf.lineDistance(
    turf.lineSlice(
      turf.point(route.features[bestIndex].geometry.coordinates[0]),
      location,
      route.features[bestIndex]
    )
  );
  return length;
}

/**
 * Returns the instruction that is next when you are at the given distance on the route
 * 
 * @param {Object} instructions - list of the instructions
 * @param {number} currentDistance - the distance to get the instruction for
 * @param {Object} closestPoint - closest point on the route based on location
 */
export function instructionAt(
  instructions,
  currentDistance,
  closestPoint,
  location
) {
  for (var i = 0; i < instructions.features.length; i++) {
    var instruction = instructions.features[i];
    if (instruction.properties.distance > currentDistance) {
      if (closestPoint.distance > 0.025) {
        instruction = {
          type: 'Feature',
          properties: {
            type: 'enter',
            nextColour: instruction.properties.colour,
            nextRef: instruction.properties.ref,
            angle: degAngle[calculateAngle(location, closestPoint)],
            distance: closestPoint.distance * 1000 + currentDistance
          },
          geometry: {
            type: 'Point',
            coordinates: closestPoint.point
          }
        };
      }
      return instruction;
    }
  }
}

export function calculateAngle(location, closestPoint) {
  var angle1 = turf.bearing(location, turf.point(closestPoint.point));
  var angle2 = turf.bearing(
    turf.point(closestPoint.point),
    turf.point(closestPoint.nextPoint)
  );
  var dif = angle2 - angle1;
  if (dif < 0) {
    dif += 360;
  }
  dif -= 90;
  return Math.round(dif / 45) * 45;
}

/**
 * Calculates a heading from alpha, beta, gamma values
 * @param {int} alpha alpha
 * @param {int} beta beta
 * @param {int} gamma gamma
 */
export function compassHeading(alpha, beta, gamma) {
  // Convert degrees to radians
  const alphaRad = alpha * (Math.PI / 180);
  const betaRad = beta * (Math.PI / 180);
  const gammaRad = gamma * (Math.PI / 180);

  // Calculate equation components
  const cA = Math.cos(alphaRad);
  const sA = Math.sin(alphaRad);
  const cB = Math.cos(betaRad);
  const sB = Math.sin(betaRad);
  const cG = Math.cos(gammaRad);
  const sG = Math.sin(gammaRad);

  // Calculate A, B, C rotation components
  const rA = -cA * sG - sA * sB * cG;
  const rB = -sA * sG + cA * sB * cG;
  const rC = -cB * cG;

  // Calculate compass heading
  let compassHeading = Math.atan(rA / rB);

  // Convert from half unit circle to whole unit circle
  if (rB < 0) {
    compassHeading += Math.PI;
  } else if (rA < 0) {
    compassHeading += 2 * Math.PI;
  }

  // Convert radians to degrees
  compassHeading *= 180 / Math.PI;

  return compassHeading;
}

/**
 * Calculates the rotation angle correctly, using the previous
 * angle so the whole thing doesn't spin around
 * @param {int} pR Previous rotation angle
 * @param {int} nR New rotation angle
 */
export function calculateRotationAngle(pR, nR) {
  let aR;
  let rot = pR;
  aR = rot % 360;
  if (aR < 0) {
    aR += 360;
  }
  if (aR < 180 && nR > aR + 180) {
    rot -= 360;
  }
  if (aR >= 180 && nR <= aR - 180) {
    rot += 360;
  }
  return (rot += nR - aR);
}
