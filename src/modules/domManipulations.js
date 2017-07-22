import { routeConfig, colors } from '../constants';
import {
  clearRoutes,
  filterRoute,
  toggleLayer,
  removeFilter
} from './mapManipulations';
import { displayDistance, displayTime, displayArrival } from './lib';
import icons from '../icons';

let map;

function collapseMenu() {
  if (window.innerWidth <= 800) {
    const menu = document.querySelector('.menu');
    document.querySelector('.dimmed').style.display = 'none';
    menu.style.transform = `translateX(-${menu.offsetWidth + 6}px)`;
  }
}

/*
* Configures the all button
*/
function configureAll() {
  let all = document.querySelector('.routelist-all');
  all.addEventListener('click', () => {
    const active = document.querySelector('.routelist-item--active');
    active && active.classList.remove('routelist-item--active');
    all.className += ' routelist-item--active';
    removeFilter(map);
    collapseMenu();
  });
  let none = document.querySelector('.routelist-none');
  none.addEventListener('click', () => {
    const active = document.querySelector('.routelist-item--active');
    active && active.classList.remove('routelist-item--active');
    none.className += ' routelist-item--active';
    toggleLayer(map, 'GFR_routes', 'none');
    toggleLayer(map, 'GFR_symbols', 'none');
    collapseMenu();
  });
}

/*
* Configures a ListItem for the routemenu
* @param route Object{name: string, colour: string}
* @return el Element the configured html element
*/
function configureListItem(route) {
  let el = document.createElement('li');
  el.className = 'routelist-item';
  let child = document.createElement('span');
  child.innerHTML = route.name;
  el.appendChild(child);
  el.className += ' routelist-item-' + routeConfig[el.firstChild.innerHTML];
  el.style.backgroundColor = route.color;

  // event listener
  el.addEventListener('click', () => {
    const active = document.querySelector('.routelist-item--active');
    active && active.classList.remove('routelist-item--active');
    el.className += ' routelist-item--active';
    filterRoute(map, route.name);
    collapseMenu();
  });
  return el;
}

function showCloseButton(geocoder) {
  if (geocoder === 'origin') {
    document.querySelector(
      'div:nth-of-type(1) .geocoder-icon.geocoder-icon-close'
    ).style.display =
      'block';
  } else {
  }
}

function showMyLocationSuggestion(input, setPlace) {
  const suggestions = input.parentElement.querySelector('.suggestions');
  const inputs = document.querySelectorAll('.mapboxgl-ctrl-geocoder input');

  // if the option doesn't exist, add it
  const myLoc = input.parentElement.querySelector('.mylocation');

  // need to access the link for the translation
  const a = document.createElement('a');

  if (!myLoc) {
    const el = document.createElement('li');
    el.className = 'mylocation active';
    a.setAttribute('data-l10n-id', 'suggestion-location');
    a.addEventListener('mousedown', e => {
      input.value = a.innerHTML;
      const place = input.getAttribute('data-l10n-id').replace('-input', '');
      showCloseButton(place);
      setPlace(place);
    });
    el.appendChild(a);
    suggestions.appendChild(el);
  }

  // don't show my location if the one of the inputs is already showing it
  // disgusting if statements, because of the translations this is pretty hard
  // tbh you need a new geocoder component, hooking into the mapbox one sucks,
  // maybe try forking the mapbox one
  /*if (input.getAttribute('data-l10n-id').replace('-input', '') === 'origin') {
    if (
      inputs[1].value !== '' &&
      inputs[1].value ===
        suggestions.querySelector('.mylocation').firstChild.innerHTML
    ) {
      return;
    }
  } else {
    if (
      inputs[0].value !== '' &&
      inputs[0].value ===
        suggestions.querySelector('.mylocation').firstChild.innerHTML
    ) {
      return;
    }
  }*/
  suggestions.style.display = 'block';
}

function hideMyLocationSuggestion(input) {
  const suggestions = input.parentElement.querySelector('.suggestions');
  suggestions.style.display = 'none';
}

function configureMobileMenu() {
  // mobile menu
  document.querySelector('.menu-btn-open').addEventListener('click', () => {
    document.querySelector('.menu').style.transform = 'translateX(0)';
    document.querySelector('.dimmed').style.display = 'block';
  });

  document.querySelector('.menu-btn-close').addEventListener('click', () => {
    collapseMenu();
  });
}

function configureInputs(setPlace) {
  const inputs = document.querySelectorAll('.mapboxgl-ctrl-geocoder input');
  inputs.forEach(input => {
    const place = input.getAttribute('data-l10n-id').replace('-input', '');
    input.addEventListener('focus', () => {
      showMyLocationSuggestion(input, setPlace);
    });
    input.addEventListener('keyup', e => {
      if (input.value.length === 0) {
        showMyLocationSuggestion(input, setPlace);
      }
      if (
        e.key === 'Enter' &&
        (input.value === '' || input.value === 'My location')
      ) {
        input.value = 'My location';
        if (place === 'origin') {
          showCloseButton('origin');
          hideMyLocationSuggestion(inputs[1]);
        } else {
          showCloseButton('destination');
          hideMyLocationSuggestion(inputs[0]);
        }
        setPlace(place);
        input.blur();
      }
    });
    input.addEventListener('focusout', e => {
      hideMyLocationSuggestion(input);
    });
  });
}

/*
* Adds a filter option for every route to the menu
* @param features Array[{}] all the routes
*/
export function addFilters(features) {
  // get the properties we need
  let routes = [];
  features.forEach(feat => {
    routes.push({
      name: feat.properties.icr,
      color: feat.properties.colour
    });
  });
  configureAll();
  // uniqBy to remove duplicates, sortBy to sort them in a good order
  const routesSorted = _.uniqBy(routes, 'name').sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  routesSorted.forEach(route => {
    if (route.name === 'G/C') {
      return;
    }
    const menu = document.querySelector(
      '.routelist-' + routeConfig[route.name]
    );
    const el = configureListItem(route);
    menu.appendChild(el);
  });
}

export function configureAllElements(mapboxmap, setPlace) {
  map = mapboxmap;
  configureMobileMenu();
  configureInputs(setPlace);
}

export function showNavigationBox(oldHandler, navHandler, distance, time) {
  const navBox = document.querySelector('.nav-box');
  const button = document.querySelector('.center-btn');
  button.style.display = 'none';
  document.querySelector('#map').style.height = 'calc(100vh - 150px)';

  document.querySelector('.nav-distance').innerHTML = displayDistance(distance);
  document.querySelector('.nav-time').innerHTML = displayTime(time);
  document.querySelector('.nav-arrival').innerHTML = displayArrival(time);

  const buttonNav = document.querySelector('.nav-btn');

  oldHandler && buttonNav.removeEventListener('click', oldHandler);
  buttonNav.addEventListener('click', navHandler);

  navBox.style.transform = 'translateY(0)';
}

export function hideNavigationBox() {
  const navBox = document.querySelector('.nav-box');
  document.querySelector('#map').style.height = '100vh';
  navBox.style.transform = 'translateY(200px)';
  document.querySelector('.center-btn').style.display = 'block';
}
