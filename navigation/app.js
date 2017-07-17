var origin = [
    4.448282718658447,
    50.854217806792526
];
var destination = [
    4.3930453062057495,
    50.8437861154778
];

// use http://turfjs.org/docs/#pointonline to get the current location on the route
// use http://turfjs.org/docs/#pointonline to simulate the user moving along the route.

function lengthOfRoute (route) {
    var length = 0.0;
    for(var i = 0; i < route.features.length; i++) {
        var feature = route.features[i];
        if (feature.geometry.type == "LineString") {
            length += turf.lineDistance(feature);
        }
    }
    return length;
}

function pointAlongRoute (route, distance) {
    var length = 0.0;
    for(var i = 0; i < route.features.length; i++) {
        var feature = route.features[i];
        if (feature.geometry.type == "LineString") {
            var localLength = turf.lineDistance(feature);

            if (length <= distance &&
                distance <= localLength + length) {
                return turf.along(feature, distance - length);
            }

            length += localLength;
        }
    }
    return length;
}

function pointOnRoute (route, point) {
    var best = 1000000;
    var bestData = {};
    for(var i = 0; i < route.features.length; i++) {
        var feature = route.features[i];
        if (feature.geometry.type == "LineString") {
            var snapped = turf.pointOnLine(feature, point);

            if (snapped.properties.dist < best) {
                best = snapped.properties.dist;
                bestData = feature.properties;
            }
        }
    }
    return bestData;
}

var length = lengthOfRoute(result.route);

console.log(length);


var i = 0;
function step (){ 

    var location = pointAlongRoute(result.route, i).geometry.coordinates;

    var dataAtLocation = pointOnRoute(result.route, location);

    document.getElementById("p1").innerHTML = 'After ' + i + "km we are at "  + location + ' on this edge ' + JSON.stringify(dataAtLocation);

    i += 0.01;

    if (i < length) {
        setTimeout(step, 100);
    }
}
setTimeout(step, 100);