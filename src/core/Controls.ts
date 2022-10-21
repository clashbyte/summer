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
    if (document.pointerLockElement === this.canvas && this.canLock) {
      return [this.mouseSpeed[0], this.mouseSpeed[1]];
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
    return [mx, my];
  }

  /**
   * Bind handlers on window and canvas
   * @param {HTMLCanvasElement} canvas
   */
  public static bind(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Detach handlers
   */
  public static release() {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Mouse click handler
   * @private
   */
  private static handleClick() {
    if (Engine.loaded) {
      this.canvas.requestPointerLock();
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
}
