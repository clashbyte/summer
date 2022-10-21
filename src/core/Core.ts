import { Controls } from './Controls';
import { Engine } from './Engine';

// Internal state variables
let engine: Engine | undefined = undefined;
let GL: WebGL2RenderingContext;
let canvas: HTMLCanvasElement;
let raf = 0;
let rafTime = 0;

/**
 * RAF callback
 * @param {number} elapsed
 */
function frameUpdate(elapsed: number) {
  raf = requestAnimationFrame(frameUpdate);
  const delta = (elapsed - rafTime) / 16.666;
  rafTime = elapsed;
  engine?.update(delta);
  engine?.render();
}

/**
 * Create context and run graphics loop
 * @param {HTMLCanvasElement} element
 */
export function init(element: HTMLCanvasElement) {
  canvas = element;
  const options = {
    antialias: true,
    depth: true,
    stencil: true
  };
  GL = canvas.getContext('webgl2', options)! as WebGL2RenderingContext;
  engine = new Engine();
}

/**
 * Handle screen resize
 */
export function resize() {
  const dpi = window.devicePixelRatio;
  const w = window.innerWidth * dpi;
  const h = window.innerHeight * dpi;
  if (canvas) {
    canvas.width = w;
    canvas.height = h;
  }
  engine?.resize(w, h);
}

/**
 * Start engine loop
 */
export function run() {
  engine?.init();
  rafTime = performance.now();
  raf = requestAnimationFrame(frameUpdate);
  Controls.bind(canvas);
}

/**
 * Stop engine loop and release all resources memory
 */
export function stop() {
  cancelAnimationFrame(raf);
  engine?.release();
  Controls.release();
}

export { GL };
