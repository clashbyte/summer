import { vec3 } from 'gl-matrix';
import { CellType, Entity } from 'src/content/map/MapReader';
import { Resources } from 'src/content/Resources';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import { Player } from 'src/entities/Player';
import ShaderFrag from 'src/shaders/entities/fence.frag.glsl';
import ShaderVert from 'src/shaders/entities/fence.vert.glsl';

/**
 * Fence (door) renderer
 */
export class Fences {
  /**
   * WebGL vertex buffer
   * @type {WebGLBuffer}
   * @private
   */
  private vertexBuffer: WebGLBuffer;

  /**
   * UV coords buffer
   * @type {WebGLBuffer}
   * @private
   */
  private uvBuffer: WebGLBuffer;

  /**
   * Triangles index buffer
   * @type {WebGLBuffer}
   * @private
   */
  private indexBuffer: WebGLBuffer;

  /**
   * Fence rendering shader
   * @type {Shader}
   * @private
   */
  private shader: Shader;

  /**
   * Total indices count
   * @type {number}
   * @private
   */
  private indexCount: number;

  /**
   * Create renderer from map data
   * @param {Entity[]} entities
   */
  public constructor(entities: Entity[]) {
    // Triangulate all fences
    const positions: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    let vertCount = 0;
    for (const fence of entities) {
      if (fence.type === CellType.Door && (fence.id as string) !== '40') {
        const texW = Resources.DoorsTextures.width;
        const texH = Resources.DoorsTextures.height;
        const tex = Resources.DoorsTextures.frames[fence.id as string];
        const su = tex.x / texW + 0.001;
        const sv = tex.y / texH + 0.001;
        const eu = tex.width / texW + su - 0.002;
        const ev = tex.height / texH + sv - 0.002;
        const ehu = (tex.width / texW) * 0.1 + su - 0.002;
        const ehv = (tex.height / texH) * 0.1 + sv - 0.002;
        const angle = fence.side === 1 || fence.side === 3 ? Math.PI * 0.5 : 0;
        const vertList: vec3[] = (
          [
            [-0.5, 0, 0.05],
            [0.5, 0, 0.05],
            [0.5, 0, 0.05],
            [0.5, 0, -0.05],
            [0.5, 0, -0.05],
            [-0.5, 0, -0.05],
            [-0.5, 0, -0.05],
            [-0.5, 0, 0.05]
          ] as [number, number, number][]
        ).map((v) => vec3.rotateY(vec3.create(), v, [0, 0, 0], angle));
        for (let i = 0; i < vertList.length; i += 2) {
          const v = vertList[i];
          const v2 = vertList[i + 1];
          positions.push(v[0] + fence.x, fence.y + 0.5, v[2] + fence.z);
          positions.push(v2[0] + fence.x, fence.y + 0.5, v2[2] + fence.z);
          positions.push(v[0] + fence.x, fence.y - 0.5, v[2] + fence.z);
          positions.push(v2[0] + fence.x, fence.y - 0.5, v2[2] + fence.z);
        }
        for (let i = 0; i < 2; i++) {
          uv.push(su, sv, eu, sv, su, ev, eu, ev);
          uv.push(su, sv, ehu, sv, su, ehv, ehu, ehv);
        }
        for (let i = 0; i < 4; i++) {
          indices.push(vertCount, vertCount + 1, vertCount + 2, vertCount + 1, vertCount + 3, vertCount + 2);
          vertCount += 4;
        }

        // Adding AABB
        const boxW = angle === 0 ? 1 : 0.1;
        const boxH = angle === 0 ? 0.1 : 1;
        Player.Colliders.push({
          position: [fence.x, fence.y, fence.z],
          size: [boxW, 1, boxH]
        });
      }
    }

    // Uploading WebGL mesh data
    this.shader = new Shader(ShaderFrag, ShaderVert, ['atlas'], ['position', 'uv']);
    this.vertexBuffer = GL.createBuffer()!;
    this.uvBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;
    this.indexCount = indices.length;

    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(positions), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(uv), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
  }

  /**
   * Render fence buffer
   */
  public render() {
    GL.enable(GL.CULL_FACE);
    GL.cullFace(GL.FRONT);

    this.shader.bind();
    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.bindTexture(GL.TEXTURE_2D, Resources.DoorsTextures.texture);
    GL.uniform1i(this.shader.uniform('atlas'), 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, this.indexCount, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shader.unbind();
    GL.disable(GL.CULL_FACE);
  }
}
