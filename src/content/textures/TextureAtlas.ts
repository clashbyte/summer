import { BinaryReader } from 'src/content/helpers/BinaryReader';
import { GL } from 'src/core/Core';

/**
 * Sub-frame on image atlas
 */
interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Texture atlas with lookup data
 */
export class TextureAtlas {
  /**
   * Generated WebGL texture
   * @type {WebGLTexture | null}
   */
  public texture: WebGLTexture | null = null;

  /**
   * Raw atlas image content
   * @type {HTMLImageElement | null}
   */
  public image: HTMLImageElement | null = null;

  /**
   * All nested sub-frames
   * @type {{[p: string]: Frame}}
   */
  public frames: { [key: string]: Frame } = {};

  /**
   * Atlas width
   * @type {number}
   */
  public width: number = 0;

  /**
   * Atlas height
   * @type {number}
   */
  public height: number = 0;

  /**
   * Parse atlas file
   * @param {string} configFile
   * @param {string} imageFile
   * @returns {Promise<TextureAtlas>}
   */
  public static async load(configFile: string, imageFile: string) {
    const [frames, image] = await Promise.all([this.loadFrames(configFile), this.loadImage(imageFile)]);
    const atlas = new TextureAtlas();
    atlas.image = image;
    atlas.frames = frames;
    atlas.width = image.width;
    atlas.height = image.height;
    atlas.texture = GL.createTexture();

    // Sending texture to WebGL
    GL.bindTexture(GL.TEXTURE_2D, atlas.texture);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, image.width, image.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, image);
    GL.bindTexture(GL.TEXTURE_2D, null);

    return atlas;
  }

  /**
   * Parse frame offsets and sizes
   * @param {string} path
   * @returns {Promise<{[p: string]: Frame}>}
   * @private
   */
  private static async loadFrames(path: string) {
    const frames: { [key: string]: Frame } = {};
    const req = await fetch(path);
    const f = new BinaryReader(await req.arrayBuffer());
    while (f.position < f.length) {
      const name = f.readNullString();
      const x = f.readShort();
      const y = f.readShort();
      const width = f.readShort();
      const height = f.readShort();
      frames[name] = {
        x,
        y,
        width,
        height
      };
    }
    return frames;
  }

  /**
   * Promisified image load
   * @param {string} path
   * @returns {Promise<HTMLImageElement>}
   * @private
   */
  private static loadImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => reject();
      img.src = path;
    });
  }
}
