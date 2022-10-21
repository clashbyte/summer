import { vec2 } from 'gl-matrix';
import { Resources } from 'src/content/Resources';
import { Player } from 'src/entities/Player';
import { Soundscape } from 'src/entities/Soundscape';
import { Fences } from 'src/map/Fences';
import { Skybox } from 'src/map/Skybox';
import { Sprites } from 'src/map/Sprites';
import { World } from 'src/map/World';
import { Camera } from './Camera';
import { Controls } from './Controls';
import { GL } from './Core';
import { Shadowmap } from './Shadowmap';

/**
 * Root game loop handler
 */
export class Engine {
  /**
   * Callback for resource loading finish
   * @type {() => void}
   */
  public static onLoad: () => void;

  /**
   * Flag that all resources are loaded
   * @type {boolean}
   */
  public static loaded: boolean = false;

  /**
   * Static world data
   * @type {World}
   */
  public static Map: World;

  /**
   * Active player
   * @type {Player | null}
   * @private
   */
  private player: Player | null = null;

  /**
   * Skybox renderer
   * @type {Skybox | null}
   * @private
   */
  private sky: Skybox | null = null;

  /**
   * Sprite manager
   * @type {Sprites | null}
   * @private
   */
  private sprites: Sprites | null = null;

  /**
   * Fence (aka door) manager
   * @type {Fences | null}
   * @private
   */
  private fences: Fences | null = null;

  /**
   * Shadowmap renderer
   * @type {Shadowmap | null}
   * @private
   */
  private shadowmap: Shadowmap | null = null;

  /**
   * Internal screen resolution
   * @type {vec2}
   * @private
   */
  private screenSize: vec2 = [1, 1];

  /**
   * Initialize all resources
   * @returns {Promise<void>}
   */
  public async init() {
    const data = await Resources.load();

    Engine.Map = new World(data.map, data.entities);

    this.sky = await Skybox.load();
    this.sprites = await Sprites.load(data.sprites, data.entities);
    this.fences = new Fences(data.entities);

    this.shadowmap = new Shadowmap();
    this.renderShadow();
    Soundscape.init();

    this.player = new Player([13, 4, 19], -85);
    Engine.loaded = true;
    if (Engine.onLoad) Engine.onLoad();
  }

  /**
   * Game logic update callback
   * @param {number} delta
   */
  public update(delta: number) {
    this.sprites?.update(delta);
    this.player?.update(delta);
    Controls.reset();
  }

  /**
   * Scene render callback
   */
  public render() {
    GL.viewport(0, 0, this.screenSize[0], this.screenSize[1]);
    GL.clearColor(0.2, 0.2, 0.2, 1);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    Camera.bindMatrices();

    this.sky?.render();

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    Engine.Map?.render();
    this.fences?.render();
    this.sprites?.render();
    GL.disable(GL.DEPTH_TEST);
  }

  /**
   * Release resources
   */
  public release() {
    console.log('release');
  }

  /**
   * Event for screen resolution change
   * @param {number} width
   * @param {number} height
   */
  public resize(width: number, height: number) {
    this.screenSize = [width, height];
    Camera.updateProjection(width / height);
  }

  /**
   * Render shadow pass
   * @private
   */
  private renderShadow() {
    if (!this.shadowmap) return;
    this.shadowmap.bind();
    Camera.bindShadowMatrices();

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    Engine.Map?.renderShadow();
    this.sprites?.renderShadow();
    GL.disable(GL.DEPTH_TEST);
    GL.colorMask(true, true, true, true);
    this.shadowmap.unbind();
  }
}
