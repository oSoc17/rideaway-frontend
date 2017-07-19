/*
* Filters out the routes to a single route
* @param route String
*/
export function filterRoute(map, route) {
  map.setFilter('GFR_routes', ['==', 'icr', route]);
  map.setFilter('GFR_symbols', ['==', 'icr', route]);
  map.setLayoutProperty('GFR_routes', 'visibility', 'visible');
  map.setLayoutProperty('GFR_symbols', 'visibility', 'visible');
}

/*
* Removes all the filters from the map
*/
export function removeFilter(map) {
  toggleLayer(map, 'GFR_routes', 'visible');
  toggleLayer(map, 'GFR_symbols', 'visible');
  map.setFilter('GFR_routes', null);
  map.setFilter('GFR_symbols', null);
}

/*
* Clears the routes
*/
export function clearRoutes(map, marker) {
  if (map.getSource('brussels')) {
    map.removeLayer('brussels');
    map.removeSource('brussels');
  }
  if (map.getSource('shortest')) {
    map.removeLayer('shortest');
    map.removeSource('shortest');
  }
  marker.remove();
}

export function toggleLayer(map, id, showLayer) {
  let visibility;
  if (showLayer === undefined) {
    visibility = map.getLayoutProperty(id, 'visibility');
    if (visibility === 'visible') {
      visibility = 'none';
    } else {
      visibility = 'visible';
    }
  } else {
    visibility = showLayer;
  }
  map.setLayoutProperty(id, 'visibility', visibility);
}
