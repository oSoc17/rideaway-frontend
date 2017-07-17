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

function nextInstruction(instructions, currentDistance){
    for (var i = 0; i< instructions.features.length; i++){
        var instruction = instructions.features[i];
        if (instruction.properties.distance >= currentDistance){
            return instruction;
        }
    }
}

var length = lengthOfRoute(result.route);

var dataAtLast = result.route.features[result.route.features.length - 1].properties;
var totalDistance = dataAtLast.distance / 1000.0;
var totalTime = dataAtLast.time;

console.log(dataAtLast);

var i = 0;
function step (){ 

    var location = pointAlongRoute(result.route, i).geometry.coordinates;

    var dataAtLocation = pointOnRoute(result.route, location);

    var instruction = nextInstruction(result.instructions, i*1000);

    document.getElementById("distance").innerHTML = '' + (totalDistance - i);
    document.getElementById("time").innerHTML = '' + (totalTime - dataAtLocation.time);
    document.getElementById("instruction").innerHTML = '' + instruction.properties.instruction;
    document.getElementById("distanceToNext").innerHTML = '' + (instruction.properties.distance - (i*1000));
    document.getElementById("nextColour").style["background-color"] = instruction.properties.colour;
    document.getElementById("debug").innerHTML = '' + JSON.stringify(dataAtLocation);
    document.getElementById("main").style["background-color"] = instruction.properties.colour;


    if (dataAtLocation.colour)  {
        document.getElementById("routeColour").style["background-color"] = dataAtLocation.colour;
    } else {
        document.getElementById("routeColour").style["background-color"] = "white";
    }

    i += 0.01;

    if (i < length) {
        setTimeout(step, 100);
    }
}
setTimeout(step, 100);