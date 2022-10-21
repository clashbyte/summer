import { vec3 } from 'gl-matrix';

/**
 * AABB zone box
 */
export interface Zone {
  start: vec3;
  end: vec3;
  active: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}

/**
 * Class for zone handling
 */
export class Zones {
  /**
   * All available zones
   * @type {Zone[]}
   * @private
   */
  private static zones: Zone[] = [];

  /**
   * Create zone instance
   * @param {vec3} start
   * @param {vec3} end
   * @param {() => void} onEnter
   * @param {() => void} onLeave
   * @returns {{onEnter: (() => void) | undefined, start: [number, number, number] | Float32Array, active: boolean, end: [number, number, number] | Float32Array, onLeave: (() => void) | undefined}}
   */
  public static addZone(start: vec3, end: vec3, onEnter?: () => void, onLeave?: () => void) {
    const zone = {
      start,
      end,
      onEnter,
      onLeave,
      active: false
    };
    this.zones.push(zone);
    return zone;
  }

  /**
   * Update all zones
   * @param {vec3} player
   */
  public static update(player: vec3) {
    const pos = [Math.floor(player[0] + 0.5), Math.floor(player[1] + 0.5), Math.floor(player[2] + 0.5)];
    for (const zn of this.zones) {
      let inside = true;
      for (let i = 0; i < 3; i++) {
        if (pos[i] < zn.start[i] || pos[i] > zn.end[i]) {
          inside = false;
          break;
        }
      }
      if (inside !== zn.active) {
        zn.active = inside;
        if (inside) {
          if (zn.onEnter) zn.onEnter();
        } else {
          if (zn.onLeave) zn.onLeave();
        }
      }
    }
  }
}
