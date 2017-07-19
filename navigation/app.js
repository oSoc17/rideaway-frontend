var origin = [
    4.448282718658447,
    50.854217806792526
];
var destination = [
    4.3930453062057495,
    50.8437861154778
];

var routeLine;

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

function distanceAtLocation(route, location){
    //point on line for every linestring
    var bestDist =  null;
    var bestIndex = null;
    for(var i = 0; i < route.features.length; i++){
        var feature = route.features[i];
        if (feature.geometry.type == "LineString") {
            var snapped = turf.pointOnLine(feature, location);
            var dist = turf.distance(snapped, location)
            //closest point is the location
            if(bestDist !== null){
                if (dist < bestDist){
                    bestDist = dist;
                    bestIndex = i;
                }
            }
            else {
                bestDist = dist;
                bestIndex = i;
            }
        }
    }
    //calculate linedistance of every segment before + slice of current segment
    var length = 0.0;
    for (var j = 0; j < bestIndex; j++){
        length += turf.lineDistance(route.features[j]); 
    }
    length += turf.lineDistance(turf.lineSlice(turf.point(route.features[bestIndex].geometry.coordinates[0]), location, route.features[bestIndex]));
    
    //return
    return length;
}

function instructionAt(instructions, currentDistance){
    for (var i = 0; i< instructions.features.length; i++){
        var instruction = instructions.features[i];
        if (instruction.properties.distance >= currentDistance){
            return instruction;
        }
    }
}

var result;

var length;
var dataAtLast;
var totalDistance;
var totalTime;

//console.log(dataAtLast);

var i = 0;

function initializeNavigation(result){
    this.result = result;
    length = lengthOfRoute(result.route);
    dataAtLast = result.route.features[result.route.features.length - 1].properties;
    totalDistance = dataAtLast.distance / 1000.0;
    totalTime = dataAtLast.time;
}

function step (){ 
    var location = pointAlongRoute(result.route, i).geometry.coordinates;
    update(location)
    
    i += 0.01;

    if (i < length) {
        setTimeout(step, 50);
    }
}

function update(location){
    var dataAtLocation = pointOnRoute(result.route, location);
    var distance = distanceAtLocation(result.route, location);
    var instruction = instructionAt(result.instructions, distance*1000);


    document.getElementById("next-instruction-distance").innerHTML = '' + Math.round((instruction.properties.distance - (distance*1000))/10)*10 + 'm';
    if (instruction.properties.type === "stop"){
        document.getElementById("next-instruction-road-ref").innerHTML = '' + "Bestemming";
        document.getElementById("next-instruction-road-ref").style["width"] = "250px";
    }
    else {
        document.getElementById("next-instruction-road-ref").innerHTML = '' + instruction.properties.nextRef;
    }
    if (instruction.properties.type === "start"){
        document.getElementById("current-road-ref").innerHTML = '' + instruction.properties.instruction;
    }
    else {
        document.getElementById("current-road-ref").innerHTML = '' + instruction.properties.ref;
    }

    document.getElementById("current-road-ref").innerHTML = '' + instruction.properties.ref;

    if (instruction.properties.colour)  {
        document.getElementById("current-road").style["background-color"] = instruction.properties.colour;
    } else {
        document.getElementById("current-road").style["background-color"] = "white";
    }
    if (instruction.properties.nextColour)  {
        document.getElementById("next-instruction").style["background-color"] = instruction.properties.nextColour
    } else {
        document.getElementById("next-instruction").style["background-color"] = "white";
    }

    if (instruction.properties.angle){
        if (instruction.properties.angle.toLowerCase().indexOf("left") !== -1){
            document.getElementById("next-instruction-arrow-img").style["transform"] = "rotate(0deg)"
        }
        else if (instruction.properties.angle.toLowerCase().indexOf("right") !== -1){
            document.getElementById("next-instruction-arrow-img").style["transform"] = "rotate(180deg)"
        }
        else{
            document.getElementById("next-instruction-arrow-img").style["transform"] = "rotate(90deg)"

        }
    }
    


    //debug
    /*
    document.getElementById("distance").innerHTML = '' + (totalDistance - distance);
    document.getElementById("time").innerHTML = '' + (totalTime - dataAtLocation.time);
    document.getElementById("instruction").innerHTML = '' + instruction.properties.instruction;
    document.getElementById("distanceNext").innerHTML = '' + (Math.round(instruction.properties.distance - (distance*1000))) + " m";

    document.getElementById("nextColour").style["background-color"] = instruction.properties.colour;
    document.getElementById("debug").innerHTML = '' + JSON.stringify(dataAtLocation);

    var direction;
    if (instruction.properties.angle){
        if (instruction.properties.angle.toLowerCase().indexOf("left") !== -1){
            direction =  "<-- " + instruction.properties.nextRef; 
        }
        else {
            direction = instruction.properties.nextRef + " -->"
        }
    }
    document.getElementById("direction").innerHTML = '' + direction;

    if (dataAtLocation.colour)  {
        document.getElementById("routeColour").style["background-color"] = dataAtLocation.colour;
    } else {
        document.getElementById("routeColour").style["background-color"] = "white";
    }*/
}

initializeNavigation(result);
setTimeout(step, 50);