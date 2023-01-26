import { vec3 } from 'gl-matrix';
import { Cell, CellType, Entity } from 'src/content/map/MapReader';
import { Resources } from 'src/content/Resources';
import { Camera } from 'src/core/Camera';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import { Shadowmap } from 'src/core/Shadowmap';
import MapFragCode from 'src/shaders/map/map.frag.glsl';
import MapVertCode from 'src/shaders/map/map.vert.glsl';
import MapShadowFragCode from 'src/shaders/map/map_shadow.frag.glsl';
import MapShadowVertCode from 'src/shaders/map/map_shadow.vert.glsl';

/**
 * World blockmap manager and renderer
 */
export class World {
  /**
   * Direct sunlight color
   * @type {readonly [number, number, number]}
   */
  public static readonly SUN_COLOR = [1.1, 0.95 * 1.1, 0.8 * 1.1] as const; // FFF4CE

  /**
   * Ambient light color
   * @type {readonly [number, number, number]}
   */
  public static readonly AMBIENT_COLOR = [0.45, 0.63, 0.73] as const; // 73A2BB

  /**
   * Sun vector
   * @type {any}
   */
  public static readonly SUN_VECTOR = vec3.normalize(vec3.create(), [1, 1.5, 1]);

  /**
   * Blockmap cells
   * @type {Cell[][][]}
   */
  public static MapCells: Cell[][][] = [];

  /**
   * All entities
   * @type {Entity[]}
   */
  public static MapEntities: Entity[] = [];

  /**
   * Direct pass shader
   * @type {Shader}
   * @private
   */
  private shader: Shader;

  /**
   * Shadow pass shader
   * @type {Shader}
   * @private
   */
  private shaderShadow: Shader;

  /**
   * Map vertex buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly vertexBuffer: WebGLBuffer;

  /**
   * Normals buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly normalBuffer: WebGLBuffer;

  /**
   * UV buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly uvBuffer: WebGLBuffer;

  /**
   * Indices buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly indexBuffer: WebGLBuffer;

  /**
   * Total index count
   * @type {number}
   * @private
   */
  private readonly indexCount: number;

  /**
   * Map manager constructor
   * @param {Cell[][][]} cells
   * @param {Entity[]} entities
   */
  public constructor(cells: Cell[][][], entities: Entity[]) {
    World.MapCells = cells;
    World.MapEntities = entities;
    this.shader = new Shader(
      MapFragCode,
      MapVertCode,
      ['atlas', 'sunlight', 'ambient', 'shadow', 'shadowMat', 'pointCount', 'pointLights[0]', 'pointFactor'],
      ['position', 'uv', 'normal']
    );
    this.shaderShadow = new Shader(MapShadowFragCode, MapShadowVertCode, [], ['position']);
    const {
      vertexBuffer, //
      normalBuffer,
      uvBuffer,
      indexBuffer,
      indexCount
    } = this.triangulateMap(cells, entities);
    this.vertexBuffer = vertexBuffer;
    this.normalBuffer = normalBuffer;
    this.uvBuffer = uvBuffer;
    this.indexBuffer = indexBuffer;
    this.indexCount = indexCount;
  }

  /**
   * Render map in direct pass
   */
  public render() {
    this.shader.bind();

    GL.enable(GL.CULL_FACE);
    GL.cullFace(GL.BACK);

    const lightCount = 3;
    const lights = [
      [16, 1, 22], //
      [16, 3, 20],
      [16, 5, 20]
    ].flat();

    GL.uniform1f(this.shader.uniform('pointFactor'), 1);
    GL.uniform1i(this.shader.uniform('pointCount'), lightCount);
    GL.uniform3fv(this.shader.uniform('pointLights[0]'), lights);
    GL.uniform3f(this.shader.uniform('sunlight'), ...World.SUN_COLOR);
    GL.uniform3f(this.shader.uniform('ambient'), ...World.AMBIENT_COLOR);

    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('normal'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.normalBuffer);
    GL.vertexAttribPointer(this.shader.attribute('normal'), 3, GL.FLOAT, true, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.activeTexture(GL.TEXTURE0);
    GL.bindTexture(GL.TEXTURE_2D, Resources.Textures.texture);
    GL.activeTexture(GL.TEXTURE1);
    GL.bindTexture(GL.TEXTURE_2D, Shadowmap.Texture);
    GL.uniform1i(this.shader.uniform('atlas'), 0);
    GL.uniform1i(this.shader.uniform('shadow'), 1);
    GL.uniformMatrix4fv(this.shader.uniform('shadowMat'), false, Camera.getShadowMatrix());
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, this.indexCount, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);

    GL.activeTexture(GL.TEXTURE1);
    GL.bindTexture(GL.TEXTURE_2D, null);
    GL.activeTexture(GL.TEXTURE0);
    GL.bindTexture(GL.TEXTURE_2D, null);

    this.shader.unbind();
  }

  /**
   * Render map shadow pass
   */
  public renderShadow() {
    this.shaderShadow.bind();

    GL.disable(GL.CULL_FACE);

    GL.enableVertexAttribArray(this.shaderShadow.attribute('position'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shaderShadow.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, this.indexCount, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);

    this.shaderShadow.unbind();
    GL.enable(GL.CULL_FACE);
  }

  /**
   * Building mesh from surfaces
   * @param {Cell[][][]} cells
   * @param entities
   * @private
   */
  private triangulateMap(cells: Cell[][][], entities: Entity[]) {
    const width = cells[0][0].length;
    const height = cells[0].length;
    const verts: number[] = [];
    const normals: number[] = [];
    const uv: number[] = [];
    const indices: number[] = [];
    let vertCount = 0;

    // Building static geometry
    for (let floor = 0; floor < cells.length; floor++) {
      for (let y = 0; y < cells[floor].length; y++) {
        for (let x = 0; x < cells[floor][y].length; x++) {
          const c = cells[floor][y][x];
          if (c.wall === null) {
            for (let i = 0; i < 4; i++) {
              const xoff = i === 1 ? 1 : i === 3 ? -1 : 0;
              const yoff = i === 0 ? -1 : i === 2 ? 1 : 0;
              if (x + xoff < 0 || x + xoff >= width || y + yoff < 0 || y + yoff >= height) continue;
              const oc = cells[floor][y + yoff][x + xoff];

              // If near cell has a wall data
              if (oc.wall !== null) {
                // Make wall face by rotating coords
                const angle = Math.PI * 0.5 * i;
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                const v1x = -0.5 * cos + 0.5 * sin + x;
                const v1y = -0.5 * sin - 0.5 * cos + y;
                const v2x = 0.5 * cos + 0.5 * sin + x;
                const v2y = 0.5 * sin - 0.5 * cos + y;
                const vnx = -0.5 * sin;
                const vny = 0.5 * cos;

                // Find atlas coords
                const texW = Resources.Textures.width;
                const texH = Resources.Textures.height;
                const tex = Resources.Textures.frames[oc.wall];
                const su = tex.x / texW + 0.001;
                const sv = tex.y / texH + 0.001;
                const eu = tex.width / texW + su - 0.002;
                const ev = tex.height / texH + sv - 0.002;

                // Add vertex data
                verts.push(v1x, floor + 0.5, v1y, v2x, floor + 0.5, v2y, v1x, floor - 0.5, v1y, v2x, floor - 0.5, v2y);
                normals.push(vnx, 0, vny, vnx, 0, vny, vnx, 0, vny, vnx, 0, vny);
                uv.push(su, sv, eu, sv, su, ev, eu, ev);
                indices.push(vertCount, vertCount + 2, vertCount + 1);
                indices.push(vertCount + 1, vertCount + 2, vertCount + 3);
                vertCount += 4;
              }
            }

            // If cell has floor data
            if (c.floor !== null) {
              const texW = Resources.Textures.width;
              const texH = Resources.Textures.height;
              const tex = Resources.Textures.frames[c.floor!];
              const su = tex.x / texW + 0.001;
              const sv = tex.y / texH + 0.001;
              const eu = tex.width / texW + su - 0.002;
              const ev = tex.height / texH + sv - 0.002;

              verts.push(
                -0.5 + x,
                floor - 0.5,
                -0.5 + y,
                0.5 + x,
                floor - 0.5,
                -0.5 + y,
                -0.5 + x,
                floor - 0.5,
                0.5 + y,
                0.5 + x,
                floor - 0.5,
                0.5 + y
              );
              normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              uv.push(su, ev, eu, ev, su, sv, eu, sv);
              indices.push(vertCount, vertCount + 2, vertCount + 1);
              indices.push(vertCount + 1, vertCount + 2, vertCount + 3);
              vertCount += 4;
            }

            // If cell has ceiling
            if (c.ceil !== null) {
              const texW = Resources.Textures.width;
              const texH = Resources.Textures.height;
              const tex = Resources.Textures.frames[c.ceil!];
              const su = tex.x / texW + 0.001;
              const sv = tex.y / texH + 0.001;
              const eu = tex.width / texW + su - 0.002;
              const ev = tex.height / texH + sv - 0.002;

              verts.push(
                -0.5 + x,
                floor + 0.5,
                0.5 + y,
                0.5 + x,
                floor + 0.5,
                0.5 + y,
                -0.5 + x,
                floor + 0.5,
                -0.5 + y,
                0.5 + x,
                floor + 0.5,
                -0.5 + y
              );
              normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
              uv.push(su, sv, eu, sv, su, ev, eu, ev);
              indices.push(vertCount, vertCount + 2, vertCount + 1);
              indices.push(vertCount + 1, vertCount + 2, vertCount + 3);
              vertCount += 4;
            }
          }
        }
      }
    }

    // Building stairs
    for (const stair of entities) {
      if (stair.type === CellType.Stair) {
        const texW = Resources.Textures.width;
        const texH = Resources.Textures.height;
        const tex = Resources.Textures.frames[stair.id as string];
        const su = tex.x / texW + 0.001;
        const sv = tex.y / texH + 0.001;
        const eu = tex.width / texW + su - 0.002;
        const ev = tex.height / texH + sv - 0.002;

        // Creating slope by rotating base vertex set
        const angle = (-stair.side * Math.PI) / 2;
        const vertList: vec3[] = (
          [
            [-0.5, 0.5, -0.5],
            [0.5, 0.5, -0.5],
            [-0.5, 0, 0.5],
            [0.5, 0, 0.5],
            [-0.5, 0, 0.5],
            [0.5, 0, 0.5],
            [-0.5, -0.5, 1.5],
            [0.5, -0.5, 1.5]
          ] as [number, number, number][]
        ).map((v) => vec3.rotateY(vec3.create(), v, [0, 0, 0], angle));
        for (const v of vertList) {
          verts.push(v[0] + stair.x, v[1] + stair.y, v[2] + stair.z);
        }
        for (let i = 0; i < 8; i++) {
          normals.push(0, 1, 0);
        }
        for (let i = 0; i < 2; i++) {
          uv.push(su, sv, eu, sv, su, ev, eu, ev);
          indices.push(vertCount, vertCount + 2, vertCount + 1);
          indices.push(vertCount + 1, vertCount + 2, vertCount + 3);
          indices.push(vertCount, vertCount + 1, vertCount + 2);
          indices.push(vertCount + 1, vertCount + 3, vertCount + 2);
          vertCount += 4;
        }
      }
    }

    // Building covering faces for walls to fix
    // shadowmap rendering issues
    for (let floor = 0; floor < cells.length; floor++) {
      for (let y = 0; y < cells[floor].length; y++) {
        for (let x = 0; x < cells[floor][y].length; x++) {
          const c = cells[floor][y][x];
          if (c.wall !== null) {
            let needFlat = false;
            if (floor === cells.length - 1) {
              needFlat = true;
            } else {
              const uc = cells[floor + 1][y][x];
              if (uc.wall === null && uc.floor === null) {
                needFlat = true;
              }
            }
            if (needFlat) {
              verts.push(
                -0.5 + x,
                floor + 0.5,
                -0.5 + y,
                0.5 + x,
                floor + 0.5,
                -0.5 + y,
                -0.5 + x,
                floor + 0.5,
                0.5 + y,
                0.5 + x,
                floor + 0.5,
                0.5 + y
              );
              normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              uv.push(0, 0, 0, 0, 0, 0, 0, 0);
              indices.push(vertCount, vertCount + 2, vertCount + 1);
              indices.push(vertCount + 1, vertCount + 2, vertCount + 3);
              vertCount += 4;
            }
          }
        }
      }
    }

    // Upload data to WebGL
    const vertexBuffer: WebGLBuffer = GL.createBuffer()!;
    const normalBuffer: WebGLBuffer = GL.createBuffer()!;
    const uvBuffer: WebGLBuffer = GL.createBuffer()!;
    const indexBuffer: WebGLBuffer = GL.createBuffer()!;

    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, normalBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(normals), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(uv), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);

    return {
      vertexBuffer,
      normalBuffer,
      uvBuffer,
      indexBuffer,
      indexCount: indices.length
    };
  }
}
