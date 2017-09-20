import {
  displayArrival,
  displayDistance,
  displayTime,
  calculateRotationAngle
} from '../lib';
import { angleDeg, colors } from '../../constants';
import turf from 'turf';

export default class NavView {
  constructor() {}

  /**
   * Updates the display of the reference of the current route.
   * 
   * @param {Object} instruction - current instruction
   */
  updateCurrentRoadSquare(instruction) {
    if (
      instruction.properties.type === 'enter' ||
      instruction.properties.type === 'stop'
    ) {
      document.getElementById('current-road-ref').style['display'] = 'none';
    } else {
      document.getElementById('current-road-ref').style['display'] = '';
      document.getElementById('current-road-ref').innerHTML =
        '' + instruction.properties.ref;
    }
  }

  /**
   * Updates the display of the reference of the next route.
   * 
   * @param {Object} instruction - current instruction 
   * @param {number} offset - offset based on distance to instruction
   */
  updateNextRoadSquare(instruction, offset) {
    document.getElementById('next-instruction-road-ref').style['top'] =
      offset - 11 + 'vh';

    if (
      instruction.properties.type === 'leave' ||
      instruction.properties.type === 'stop'
    ) {
      document.getElementById('next-instruction-road-ref').style['display'] =
        'none';
    } else {
      document.getElementById('next-instruction-road-ref').style['display'] =
        '';
      document.getElementById('next-instruction-road-ref').innerHTML =
        '' + instruction.properties.nextRef;
    }
  }

  /**
   * Updates the displayed data about the remaining route.
   * 
   * @param {number} remainingDistance - remaining distance in meters.
   * @param {number} remainingTime - remaining time in seconds.
   */
  updateRouteStats(remainingDistance, remainingTime) {
    document.getElementById('total-distance').innerHTML = displayDistance(
      remainingDistance
    );
    document.getElementById('arrival-time').innerHTML = displayArrival(
      remainingTime
    );
    document.getElementById('total-time').innerHTML = displayTime(
      remainingTime
    );
  }

  /**
   * Updates the display of the colour of the current route.
   * 
   * @param {Object} instruction - current instruction
   * @param {number} offset - offset based on distance to instruction
   */
  updateCurrentRoadColour(instruction, offset) {
    document.getElementById('current-road').style['height'] =
      80 - offset + 'vh';
    document.getElementById('current-road').style['top'] = offset + 20 + 'vh';

    if (instruction.properties.colour) {
      document.getElementById('current-road').style['background-color'] =
        instruction.properties.colour;
    } else {
      document.getElementById('current-road').style['background-color'] =
        colors.primary;
    }
  }

  /**
   * Updates the display of the colour of the next route.
   * 
   * @param {Object} instruction - current instruction 
   * @param {number} offset - offset based on distance to instruction
   */
  updateNextRoadColour(instruction, offset) {
    document.getElementById('next-instruction').style['height'] =
      offset + 20 + 'vh';

    if (instruction.properties.nextColour) {
      document.getElementById('next-instruction').style['background-color'] =
        instruction.properties.nextColour;
    } else {
      document.getElementById('next-instruction').style['background-color'] =
        colors.primary;
    }
  }

  /**
   * Updates the display of the distance to the next instruction.
   * 
   * @param {number} distanceToNext - distance to next instruction
   * @param {number} offset - offset based on distance to next instruction
   */
  updateNextInstructionDistance(distanceToNext, offset) {
    document.getElementById('next-instruction-distance').style['top'] =
      offset + 20 + 'vh';
    document.getElementById(
      'next-instruction-distance'
    ).innerHTML = displayDistance(distanceToNext);
  }

  /**
   * Updates the display of the turning indication of the next instruction.
   * 
   * @param {Object} instruction - next instruction 
   * @param {number} offset - offset based on distance to next instruction
   */
  updateNextRoadDirection(instruction, offset) {
    document.getElementById('next-instruction-arrow').style['top'] =
      offset + 1 + 'vh';
    if (instruction.properties.angle) {
      document.getElementById('next-instruction-arrow-img').style[
        'transform'
      ] = `rotate(${angleDeg[instruction.properties.angle.toLowerCase()]}deg)`;
    }
    if (instruction.properties.type === 'stop') {
      document.getElementById('next-instruction-arrow').style['display'] =
        'none';
    }
  }

  /**
   * Updates the directional arrow to point to closest point on the route.
   * 
   * @param {Object} instruction - next instruction
   * @param {Object} location - closest location on route
   * @param {number} heading - current heading
   */
  updateDirectionArrow(instruction, location, heading) {
    const arrow = document.getElementById('direction-arrow');
    if (
      instruction.properties.type === 'enter' ||
      instruction.properties.type === 'stop'
    ) {
      arrow.style['display'] = 'block';

      let dir = turf.bearing(location, instruction);

      // new direction
      dir -= heading;
      if (dir < 0) {
        dir = dir + 360;
      }
      dir = Math.round(dir);

      const previousDir = parseInt(arrow.dataset.dir) || 0;
      const calculatedDir = calculateRotationAngle(previousDir, dir);
      arrow.dataset.dir = calculatedDir;

      arrow.style['transform'] = `rotate(${calculatedDir}deg)`;
    } else {
      arrow.style['display'] = 'none';
    }
  }

  /**
   * Updates the message displayed for certain instructions.
   * 
   * @param {Object} instruction - next instruction 
   */
  updateMessage(instruction) {
    if (instruction.properties.type === 'leave') {
      document
        .getElementById('message')
        .setAttribute('data-l10n-id', 'instr-leave');
      document.getElementById('message').style['display'] = 'block';
    } else if (instruction.properties.type === 'stop') {
      document.getElementById('message').style['display'] = 'block';
      document
        .getElementById('message')
        .setAttribute('data-l10n-id', 'instr-destination');
    } else if (instruction.properties.type === 'enter') {
      document.getElementById('message').style['display'] = 'block';
      document
        .getElementById('message')
        .setAttribute('data-l10n-id', 'instr-enter');
    } else {
      document.getElementById('message').style['display'] = 'none';
    }
  }
}
