import { vec2 } from 'gl-matrix';
import { Soundscape } from 'src/entities/Soundscape';
import { Camera } from './Camera';
import { Engine } from './Engine';

/**
 * Input handling
 */
export class Controls {
  /**
   * Flag that mouse can be locked on click
   * @type {boolean}
   * @private
   */
  private static canLock: boolean = false;

  /**
   * Flag for touch mode
   * @type {boolean}
   * @private
   */
  private static touchMode: boolean = false;

  /**
   * Shared canvas element
   * @type {HTMLCanvasElement}
   * @private
   */
  private static canvas: HTMLCanvasElement;

  /**
   * List of all pressed keys
   * @type {{[p: string]: boolean}}
   * @private
   */
  private static keysDown: { [key: string]: boolean } = {};

  /**
   * Mouse movement speed
   * @type {vec2}
   * @private
   */
  private static mouseSpeed: vec2 = [0, 0];

  /**
   * Touch index
   * @type {number}
   * @private
   */
  private static touchID: number = -1;

  /**
   * Touch start point
   * @type {vec2}
   * @private
   */
  private static touchOrigin: vec2 = [0, 0];

  /**
   * Touch active point
   * @type {vec2}
   * @private
   */
  private static touchPos: vec2 = [0, 0];

  /**
   * Lock pointer
   */
  public static lock() {
    this.canLock = true;
    this.handleClick();
  }

  /**
   * Reset controls state
   */
  public static reset() {
    this.mouseSpeed = [0, 0];
  }

  /**
   * Get mouse movement speed
   * @returns {vec2}
   */
  public static getMouseSpeed(): vec2 {
    if (this.touchMode) {
      if (this.touchID !== -1) {
        const diff = ((this.touchPos[0] - this.touchOrigin[0]) / window.innerWidth) * -30.0;
        return [Math.max(Math.min(diff, 80.0), -80.0), 0];
      }
    } else {
      if (document.pointerLockElement === this.canvas && this.canLock) {
        return [this.mouseSpeed[0], this.mouseSpeed[1]];
      }
    }

    return [0, 0];
  }

  /**
   * Get "movement" vector based on pressed keys
   * @returns {vec2}
   */
  public static getMovement(): vec2 {
    let mx = 0;
    let my = 0;
    if (this.touchMode) {
      if (this.touchID !== -1) {
        const diff = ((this.touchPos[1] - this.touchOrigin[1]) / window.innerWidth) * -4.0;
        my = Math.max(Math.min(diff, 1.0), -1.0);
      }
    } else {
      if (this.canLock) {
        if (this.keysDown['KeyW'] || this.keysDown['ArrowUp']) {
          my = -1;
        } else if (this.keysDown['KeyS'] || this.keysDown['ArrowDown']) {
          my = 1;
        }
        if (this.keysDown['KeyD'] || this.keysDown['ArrowRight']) {
          mx = 1;
        } else if (this.keysDown['KeyA'] || this.keysDown['ArrowLeft']) {
          mx = -1;
        }
      }
    }
    return [mx, my];
  }

  /**
   * Bind handlers on window and canvas
   * @param {HTMLCanvasElement} canvas
   */
  public static bind(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.touchMode = window.matchMedia('(pointer: coarse)').matches;
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    window.addEventListener('touchmove', this.handleTouchMove);
    window.addEventListener('touchend', this.handleTouchEnd);
    window.addEventListener('touchcancel', this.handleTouchEnd);
  }

  /**
   * Detach handlers
   */
  public static release() {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  /**
   * Mouse click handler
   * @private
   */
  private static handleClick() {
    if (Engine.loaded) {
      if (!this.touchMode) this.canvas.requestPointerLock();
      Soundscape.checkBuffers();
    }
  }

  /**
   * Keypress handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyDown(e: KeyboardEvent) {
    this.keysDown[e.code] = true;
    if (this.keysDown['KeyP']) {
      console.log([
        Math.floor(Camera.position[0] + 0.5),
        Math.floor(Camera.position[1] + 0.5),
        Math.floor(Camera.position[2] + 0.5)
      ]);
    }
  }

  /**
   * Key release handler
   * @param {KeyboardEvent} e
   * @private
   */
  private static handleKeyUp(e: KeyboardEvent) {
    this.keysDown[e.code] = false;
  }

  /**
   * Mouse move event handler
   * @param {MouseEvent} ev
   * @private
   */
  private static handleMouseMove(ev: MouseEvent) {
    this.mouseSpeed = [ev.movementX, ev.movementY];
  }

  /**
   * Touch start handler
   * @param {TouchEvent} ev
   * @private
   */
  private static handleTouchStart(ev: TouchEvent) {
    if (this.touchID === -1) {
      this.touchID = ev.changedTouches[0].identifier;
      vec2.set(this.touchOrigin, ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
      vec2.copy(this.touchPos, this.touchOrigin);
    }
  }

  /**
   * Finger movement handler
   * @param {TouchEvent} ev
   * @private
   */
  private static handleTouchMove(ev: TouchEvent) {
    for (let i = 0; i < ev.changedTouches.length; i++) {
      if (ev.changedTouches[i].identifier === this.touchID) {
        vec2.set(this.touchOrigin, ev.changedTouches[i].clientX, ev.changedTouches[i].clientY);
        break;
      }
    }
  }

  /**
   * Touch cancel handler
   * @param {TouchEvent} ev
   * @private
   */
  private static handleTouchEnd(ev: TouchEvent) {
    for (let i = 0; i < ev.changedTouches.length; i++) {
      if (ev.changedTouches[i].identifier === this.touchID) {
        this.touchID = -1;
        break;
      }
    }
  }
}
