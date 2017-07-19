import mapboxgl from 'mapbox-gl';

function createMarker() {
  // create our pulsating dot
  let el = document.createElement('div');
  el.className = 'marker';
  let child1 = document.createElement('div');
  child1.className = 'dot';
  let child2 = document.createElement('div');
  child2.className = 'pulse';
  el.appendChild(child1);
  el.appendChild(child2);

  return new mapboxgl.Marker(el, { offset: [-10 / 2, -10] });
}

export function startTracking(map, updatePosition) {
  const marker = createMarker();
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(position =>
      onPosition(position, marker, map, updatePosition)
    );
  } else {
    alert("Sorry, your browser doesn't support geolocation!");
  }

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => _setHeading(e, map));
  }
}

export function stopTracking() {
  navigator.geolocation.clearWatch(this.state.watchPositionId);
  window.removeEventListener('deviceorientation', () => _setHeading(map));
}

function onPosition(position, marker, map, updatePosition) {
  const LngLat = [position.coords.longitude, position.coords.latitude];
  updatePosition(LngLat);
  marker.setLngLat(LngLat);
  marker.addTo(map);
}

function _setHeading(e, map) {}
