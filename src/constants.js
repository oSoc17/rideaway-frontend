// Defined route properties
export const routeConfig = {
  All: 'all',
  '1': 'radial',
  '2': 'radial',
  '3': 'radial',
  '4': 'radial',
  '5': 'radial',
  '6': 'radial',
  '7': 'radial',
  '8': 'radial',
  '9': 'radial',
  '10': 'radial',
  '11': 'radial',
  '12': 'radial',
  MM: 'transverse',
  SZ: 'transverse',
  CK: 'transverse',
  PP: 'transverse',
  A: 'loop',
  B: 'loop',
  C: 'loop'
};

export const colors = {
  primary: '#fbba00',
  secondary: '#385188',
  white: '#fff'
};

export const urls = {
  mapStyle: 'https://openmaptiles.github.io/positron-gl-style/style-cdn.json',
  network: 'https://cyclenetworks.osm.be/brumob/data/network.geojson',
  route: 'https://cyclerouting-api.osm.be'
};

// Brussels
export const center = { latlng: [4.355975, 50.860633], zoom: 11 };

export const boundingBox = [
  3.9784240723,
  50.6485897217,
  4.7282409668,
  51.0552073386
];

export const bounds = [
  [boundingBox[0], boundingBox[1]],
  [boundingBox[2], boundingBox[3]]
];

export const angleDeg = {
  sharpleft: -45,
  left: 0,
  slightlyleft: 45,
  straighton: 90,
  slightlyright: 135,
  right: 180,
  sharpright: 225
};

export const degAngle = {
  270: 'sharpleft',
  0: 'left',
  45: 'slightlyleft',
  90: 'straighton',
  135: 'slightlyright',
  180: 'right',
  225: 'sharpright'
};

// update intervals in ms
export const intervalTimes = {
  userHeading: 250
};
