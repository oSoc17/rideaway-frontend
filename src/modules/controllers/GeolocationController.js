import { compassHeading } from '../lib';

export default class GeolocationController {
  /**
   * @constructor
   */
  constructor() {
    this.userPosition = null;
    this.userHeading = 0;
    this.onUpdate = null;
    this.trackingMode = 'default';
    this.myLocationSelected = {
      origin: false,
      destination: false
    };
  }

  /*
   * Start tracking the user
   */
  startTracking() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        position => this.onUpdate(position),
        this.onUpdate(null),
        { enableHighAccuracy: true }
      );
    } else {
      alert("Sorry, your browser doesn't support geolocation!");
    }
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', e => this._setHeading(e));
    }
  }

  /**
   * Sets the heading
   * @param {event} e 
   */
  _setHeading(e) {
    this.userHeading =
      compassHeading(e.alpha, e.beta, e.gamma) || e.webkitCompassHeading;
  }

  /*
   * Stops tracking the user // not used because the entire app
   * uses tracking
   */
  stopTracking() {
    navigator.geolocation.clearWatch(this.watchPositionId);
  }
}
