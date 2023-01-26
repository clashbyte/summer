import { mat4, quat, vec3 } from 'gl-matrix';
import SkyBack from 'src/assets/sky_bk.png';
import SkyFront from 'src/assets/sky_ft.png';
import SkyLeft from 'src/assets/sky_lf.png';
import SkyRight from 'src/assets/sky_rt.png';
import SkyUp from 'src/assets/sky_up.png';
import { Camera } from 'src/core/Camera';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import ShaderFrag from 'src/shaders/map/sky.frag.glsl';
import ShaderVert from 'src/shaders/map/sky.vert.glsl';
import ShaderHaloFrag from 'src/shaders/map/sky_halo.frag.glsl';
import ShaderHaloVert from 'src/shaders/map/sky_halo.vert.glsl';
import { World } from './World';

/**
 * Single sky side
 */
interface SkyFace {
  texture: WebGLTexture;
  matrix: mat4;
}

// // -0.3815, 0.3362, -0.8610

/**
 * Skybox renderer
 */
export class Skybox {
  /**
   * Box faces
   * @type {SkyFace[]}
   * @private
   */
  private readonly faces: SkyFace[] = [];

  /**
   * WebGL plane vertex buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly vertexBuffer: WebGLBuffer;

  /**
   * Plane UV coords
   * @type {WebGLBuffer}
   * @private
   */
  private readonly uvBuffer: WebGLBuffer;

  /**
   * Triangle indices buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly indexBuffer: WebGLBuffer;

  private readonly haloMat: mat4;

  /**
   * Shader for skybox
   * @type {Shader}
   * @private
   */
  private shader: Shader;
  private shaderHalo: Shader;

  /**
   * Fetch all textures and make skybox instance
   * @returns {Promise<Skybox>}
   */
  public static async load() {
    const textures = await Promise.all([
      this.loadTexture(SkyFront), //
      this.loadTexture(SkyBack),
      this.loadTexture(SkyLeft),
      this.loadTexture(SkyRight),
      this.loadTexture(SkyUp)
    ]);
    const angles: vec3[] = [
      [0, 180, 0], //
      [0, 0, 0],
      [0, 90, 0],
      [0, -90, 0],
      [-90, 180, 0]
    ];
    const faces: SkyFace[] = [];
    for (let i = 0; i < textures.length; i++) {
      const mat = mat4.create();
      mat4.fromQuat(mat, quat.fromEuler(quat.create(), angles[i][0], angles[i][1], angles[i][2]));

      faces.push({
        texture: textures[i],
        matrix: mat
      });
    }
    return new Skybox(faces);
  }

  /**
   * Renderer constructor
   * @param {SkyFace[]} faces
   */
  public constructor(faces: SkyFace[]) {
    this.shader = new Shader(ShaderFrag, ShaderVert, ['diffuse', 'camera'], ['position', 'uv']);
    this.shaderHalo = new Shader(ShaderHaloFrag, ShaderHaloVert, ['camera', 'color'], ['position', 'uv']);
    this.faces = faces;
    this.haloMat = mat4.create();
    mat4.fromQuat(this.haloMat, quat.fromEuler(quat.create(), -20.9, 24.0 + 180, 0));

    this.vertexBuffer = GL.createBuffer()!;
    this.uvBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;

    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 1, 3, 2]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
  }

  /**
   * Render skybox
   */
  public render() {
    const camPos = Camera.position;
    for (const face of this.faces) {
      this.shader.updateMatrix(face.matrix);
      this.shader.bind();
      GL.enableVertexAttribArray(this.shader.attribute('position'));
      GL.enableVertexAttribArray(this.shader.attribute('uv'));
      GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
      GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
      GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

      GL.bindTexture(GL.TEXTURE_2D, face.texture);
      GL.uniform1i(this.shader.uniform('diffuse'), 0);
      GL.uniform3f(this.shader.uniform('camera'), camPos[0], camPos[1], camPos[2]);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
      GL.bindBuffer(GL.ARRAY_BUFFER, null);
      this.shader.unbind();
    }

    /*
    this.shader.updateMatrix(face.matrix);
    this.shader.bind();
    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.uniform1i(this.shader.uniform('diffuse'), 0);
    GL.uniform3f(this.shader.uniform('camera'), camPos[0], camPos[1], camPos[2]);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shader.unbind();

     */
  }

  public renderHalo() {
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.ONE, GL.ONE);

    const camPos = Camera.position;
    this.shaderHalo.updateMatrix(this.haloMat);
    this.shaderHalo.bind();
    GL.enableVertexAttribArray(this.shaderHalo.attribute('position'));
    GL.enableVertexAttribArray(this.shaderHalo.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shaderHalo.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shaderHalo.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.uniform3f(this.shaderHalo.uniform('camera'), camPos[0], camPos[1], camPos[2]);
    GL.uniform3fv(this.shaderHalo.uniform('color'), World.SUN_COLOR);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shaderHalo.unbind();

    GL.disable(GL.BLEND);
  }

  /**
   * Promisified texture loading
   * @param {string} path
   * @returns {Promise<WebGLTexture>}
   * @private
   */
  private static loadTexture(path: string) {
    return new Promise<WebGLTexture>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const tex = GL.createTexture()!;
        GL.bindTexture(GL.TEXTURE_2D, tex);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, img.width, img.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, img);
        GL.bindTexture(GL.TEXTURE_2D, null);
        resolve(tex);
      };
      img.onerror = () => reject();
      img.src = path;
    });
  }
}
