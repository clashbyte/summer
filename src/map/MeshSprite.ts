import { mat4, vec3 } from 'gl-matrix';
import { BinaryReader } from 'src/content/helpers/BinaryReader';
import { Camera } from 'src/core/Camera';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import { CollisionBox } from 'src/entities/Player';
import SpriteFragCode from 'src/shaders/entities/mesh.frag.glsl';
import SpriteVertCode from 'src/shaders/entities/mesh.vert.glsl';
import ShadowFragCode from 'src/shaders/entities/mesh_shadow.frag.glsl';
import ShadowVertCode from 'src/shaders/entities/mesh_shadow.vert.glsl';
import { World } from './World';

/**
 * S3D mesh class
 */
export class MeshSprite {
  /**
   * Vertex positions buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly vertexBuffer: WebGLBuffer;

  /**
   * UV coords buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly uvBuffer: WebGLBuffer;

  /**
   * Normals array buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly normalBuffer: WebGLBuffer;

  /**
   * Total indices count (triangles * 3)
   * @type {number}
   * @private
   */
  private readonly indexCount: number;

  /**
   * Mesh texture
   * @type {WebGLTexture}
   * @private
   */
  private readonly texture: WebGLTexture;

  /**
   * Direct pass shader
   * @type {Shader}
   * @private
   */
  private shader: Shader;

  /**
   * Shader for shadow pass
   * @type {Shader}
   * @private
   */
  private shaderShadow: Shader;

  /**
   * Collision AABB
   * @type {CollisionBox}
   * @private
   */
  private collider: CollisionBox;

  /**
   * Loading S3D mesh
   * @param {string} path
   * @returns {Promise<void>}
   */
  public static async load(path: string) {
    const rawData = await fetch(path);
    const f = new BinaryReader(await rawData.arrayBuffer());

    // Reading surface data
    const positions: number[] = [];
    const uv: number[] = [];
    const surfCount = f.readShort();
    for (let i = 0; i < surfCount; i++) {
      const vertCount = f.readShort();
      for (let j = 0; j < vertCount * 3; j++) {
        const x = f.readFloat() * 0.03;
        const y = f.readFloat() * 0.03;
        const z = f.readFloat() * -0.03;
        const u = f.readFloat();
        const v = f.readFloat();

        positions.push(x, y, z);
        uv.push(u, v);
      }
    }

    // There's no normals in mesh file - we need
    // to calculate them by triangle cross product
    const normals = [];
    for (let i = 0; i < positions.length; i += 9) {
      const v0 = vec3.fromValues(positions[i], positions[i + 1], positions[i + 2]);
      const v1 = vec3.sub(vec3.create(), vec3.fromValues(positions[i + 3], positions[i + 4], positions[i + 5]), v0);
      const v2 = vec3.sub(vec3.create(), vec3.fromValues(positions[i + 6], positions[i + 7], positions[i + 8]), v0);
      const norm = vec3.cross(vec3.create(), v2, v1);
      vec3.normalize(norm, norm);

      for (let j = 0; j < 3; j++) {
        normals.push(norm[0], norm[1], norm[2]);
      }
    }

    // Reading texture
    const texSize = f.readInt();
    const tex = await this.loadTexture(f.readBytes(texSize));
    return new MeshSprite(positions, uv, normals, tex);
  }

  /**
   * Loading texture from packed image
   * @param {Uint8Array} data
   * @returns {Promise<WebGLTexture>}
   * @private
   */
  private static loadTexture(data: Uint8Array) {
    return new Promise<WebGLTexture>((resolve, reject) => {
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const tex = GL.createTexture()!;
        GL.bindTexture(GL.TEXTURE_2D, tex);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, img.width, img.height, 0, GL.RGBA, GL.UNSIGNED_BYTE, img);
        GL.bindTexture(GL.TEXTURE_2D, null);
        resolve(tex);
      };
      img.src = url;
    });
  }

  /**
   * Creating new mesh from vertex data and texture
   * @param {number[]} positions
   * @param {number[]} uv
   * @param {number[]} normal
   * @param {WebGLTexture} texture
   */
  public constructor(positions: number[], uv: number[], normal: number[], texture: WebGLTexture) {
    // Calculating AABB
    const minPos: vec3 = [Infinity, Infinity, Infinity];
    const maxPos: vec3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) {
      const vi = i % 3;
      minPos[vi] = Math.min(positions[i], minPos[vi]);
      maxPos[vi] = Math.max(positions[i], maxPos[vi]);
    }
    this.collider = {
      position: vec3.fromValues(
        (minPos[0] + maxPos[0]) / 2.0,
        (minPos[1] + maxPos[1]) / 2.0,
        (minPos[2] + maxPos[2]) / 2.0
      ),
      size: vec3.fromValues(
        maxPos[0] - minPos[0], //
        maxPos[1] - minPos[1],
        maxPos[2] - minPos[2]
      )
    };

    // Generating WebGL buffers
    this.vertexBuffer = GL.createBuffer()!;
    this.uvBuffer = GL.createBuffer()!;
    this.normalBuffer = GL.createBuffer()!;
    this.indexCount = positions.length;
    this.texture = texture;
    this.shader = new Shader(
      SpriteFragCode,
      SpriteVertCode,
      ['diffuse', 'shadow', 'angleMat', 'shadowMat', 'ambient', 'sunlight'],
      ['position', 'uv', 'normal']
    );
    this.shaderShadow = new Shader(ShadowFragCode, ShadowVertCode, ['angleMat'], ['position']);

    // Sending vertex data
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(positions), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.normalBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(normal), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(uv), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
  }

  /**
   * Rendering color pass
   * @param {mat4} matrix
   * @param {number} angle
   */
  public render(matrix: mat4, angle: number = 0) {
    // Creating matrix for mesh rotation
    const angleMat = mat4.fromYRotation(mat4.create(), angle);

    // Updating state and binding shader
    GL.enable(GL.CULL_FACE);
    GL.cullFace(GL.FRONT);
    this.shader.updateMatrix(matrix);
    this.shader.bind();

    // Sending vertex buffers
    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.enableVertexAttribArray(this.shader.attribute('normal'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.normalBuffer);
    GL.vertexAttribPointer(this.shader.attribute('normal'), 3, GL.FLOAT, true, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    // Updating value uniforms
    GL.uniform3f(this.shader.uniform('sunlight'), ...World.SUN_COLOR);
    GL.uniform3f(this.shader.uniform('ambient'), ...World.AMBIENT_COLOR);
    GL.uniformMatrix4fv(this.shader.uniform('shadowMat'), false, Camera.getShadowMatrix());
    GL.uniformMatrix4fv(this.shader.uniform('angleMat'), false, angleMat);

    // Updating textures
    GL.bindTexture(GL.TEXTURE_2D, this.texture);
    GL.activeTexture(GL.TEXTURE0);
    GL.uniform1i(this.shader.uniform('diffuse'), 0);
    GL.activeTexture(GL.TEXTURE1);
    GL.uniform1i(this.shader.uniform('shadow'), 1);

    // Rendering mesh and cleaning up
    GL.drawArrays(GL.TRIANGLES, 0, this.indexCount / 3);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.activeTexture(GL.TEXTURE0);
    this.shader.unbind();
    GL.cullFace(GL.BACK);
  }

  /**
   * Rendering shadow pass
   * @param {mat4} matrix
   */
  public renderShadow(matrix: mat4) {
    this.shaderShadow.updateMatrix(matrix);
    this.shaderShadow.bind();
    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.bindTexture(GL.TEXTURE_2D, this.texture);
    GL.uniform1i(this.shader.uniform('diffuse'), 0);
    GL.drawArrays(GL.TRIANGLES, 0, this.indexCount / 3);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shaderShadow.unbind();
  }

  /**
   * Calculating AABB for positioned model
   * @param {vec3} position
   * @param {number} side
   * @param {number} scale
   * @returns {CollisionBox}
   */
  public getCollider(position: vec3, side: number, scale: number): CollisionBox {
    const angle = (-side * Math.PI) / 2;
    const pos = vec3.rotateY(vec3.create(), vec3.copy(vec3.create(), this.collider.position), [0, 0, 0], angle);
    const size = vec3.rotateY(vec3.create(), vec3.copy(vec3.create(), this.collider.size), [0, 0, 0], angle);
    return {
      position: [
        pos[0] * scale + position[0], //
        pos[1] * scale + position[1] - 0.5,
        pos[2] * scale + position[2]
      ],
      size: [
        Math.abs(size[0] * scale), //
        Math.abs(size[1] * scale),
        Math.abs(size[2] * scale)
      ]
    };
  }
}
