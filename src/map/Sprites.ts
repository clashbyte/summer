import { mat4, quat, vec3 } from 'gl-matrix';
import { CellType, Entity, SpriteDef } from 'src/content/map/MapReader';
import { Resources } from 'src/content/Resources';
import { Camera } from 'src/core/Camera';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import { CollisionBox, Player } from 'src/entities/Player';
import SpriteFragCode from 'src/shaders/entities/sprite.frag.glsl';
import SpriteVertCode from 'src/shaders/entities/sprite.vert.glsl';
import SpriteShadowFragCode from 'src/shaders/entities/sprite_shadow.frag.glsl';
import SpriteShadowVertCode from 'src/shaders/entities/sprite_shadow.vert.glsl';
import { World } from './World';

/**
 * Sprite template
 */
interface SpriteTemplate extends SpriteDef {
  currentFrame: number;
  frameTime: number;
}

/**
 * Sprite instance
 */
interface SpriteEntry {
  matrix: mat4;
  id: number;
  rotation: number;
  lit?: boolean;
  offset: vec3;
  scale: number;
}

/**
 * Sprite occlusion query
 */
interface SpriteQuery {
  entry: SpriteEntry;
  query: WebGLQuery;
}

/**
 * Sprite manager
 */
export class Sprites {
  /**
   * Pending occlusion queries
   * @type {SpriteQuery[]}
   * @private
   */
  private queries: SpriteQuery[] = [];

  /**
   * Sprite templates
   * @type {SpriteTemplate[]}
   * @private
   */
  private readonly templates: SpriteTemplate[];

  /**
   * Sprite instances
   * @type {SpriteEntry[]}
   * @private
   */
  private readonly entries: SpriteEntry[];

  /**
   * WebGL billboard vertex buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly vertexBuffer: WebGLBuffer;

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
   * UV start for instancing
   * @type {WebGLBuffer}
   * @private
   */
  private readonly uvStartBuffer: WebGLBuffer;

  /**
   * UV end for instancing
   * @type {WebGLBuffer}
   * @private
   */
  private readonly uvSizeBuffer: WebGLBuffer;

  /**
   * Instancing color buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly colorBuffer: WebGLBuffer;

  /**
   * Instance offset buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly offsetBuffer: WebGLBuffer;

  /**
   * Instance scale buffer
   * @type {WebGLBuffer}
   * @private
   */
  private readonly scaleBuffer: WebGLBuffer;

  /**
   * Total instances count
   * @type {number}
   * @private
   */
  private billboardCount: number;

  /**
   * Direct pass shader
   * @type {Shader}
   * @private
   */
  private readonly shader: Shader;

  /**
   * Shadow pass shader
   * @type {Shader}
   * @private
   */
  private readonly shaderShadow: Shader;

  /**
   * Vertex array object
   * @type {WebGLVertexArrayObject}
   * @private
   */
  private readonly vao: WebGLVertexArrayObject;

  /**
   * Loading sprite assets
   * @param {SpriteDef[]} defs
   * @param {Entity[]} entities
   * @returns {Promise<Sprites>}
   */
  public static async load(defs: SpriteDef[], entities: Entity[]) {
    const templates: SpriteTemplate[] = defs.map((def) => ({
      ...def,
      currentFrame: 0,
      frameTime: def.frames[0].delay
    }));
    const entries: SpriteEntry[] = entities
      .filter((en) => en.type === CellType.Sprite)
      .map((en) => {
        const mat = mat4.create();
        const tpl = en.id as SpriteDef;
        mat4.fromRotationTranslationScale(
          mat,
          quat.create(),
          [en.x, en.y - 0.5, en.z],
          [tpl.scale, tpl.scale, tpl.scale]
        );

        Player.Colliders.push(this.generateCollider(tpl, [en.x, en.y, en.z], en.side));

        return {
          id: defs.indexOf(en.id as SpriteDef),
          matrix: mat,
          rotation: en.side,
          offset: [en.x, en.y - 0.5, en.z],
          scale: tpl.scale
        };
      });

    return new Sprites(templates, entries);
  }

  /**
   * Manager constructor
   * @param {SpriteTemplate[]} templates
   * @param {SpriteEntry[]} entities
   */
  public constructor(templates: SpriteTemplate[], entities: SpriteEntry[]) {
    this.templates = templates;
    this.entries = entities;
    this.billboardCount = 0;

    this.shader = new Shader(
      SpriteFragCode,
      SpriteVertCode,
      ['atlas', 'angle', 'ambient', 'sun'],
      ['position', 'uv', 'uvStart', 'uvSize', 'color', 'offset', 'scale']
    );
    this.shaderShadow = new Shader(
      SpriteShadowFragCode,
      SpriteShadowVertCode,
      ['atlas', 'angle', 'uvStart', 'uvSize', 'offset', 'scale'],
      ['position', 'uv']
    );
    this.vertexBuffer = GL.createBuffer()!;
    this.uvBuffer = GL.createBuffer()!;
    this.indexBuffer = GL.createBuffer()!;

    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-0.5, 1, 0, 0.5, 1, 0, -0.5, 0, 0, 0.5, 0, 0]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 1, 1, 0, 1]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 1, 3, 2]), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);

    this.uvStartBuffer = GL.createBuffer()!;
    this.uvSizeBuffer = GL.createBuffer()!;
    this.offsetBuffer = GL.createBuffer()!;
    this.scaleBuffer = GL.createBuffer()!;
    this.colorBuffer = GL.createBuffer()!;
    this.vao = GL.createVertexArray()!;
  }

  /**
   * Update sprite texture animations
   * @param {number} delta
   */
  public update(delta: number) {
    let needRebuild = false;
    for (const t of this.templates) {
      t.frameTime -= delta;
      if (t.frameTime <= 0) {
        const newFrame = (t.currentFrame + 1) % t.frames.length;
        if (newFrame !== t.currentFrame) {
          t.currentFrame = newFrame;
          needRebuild = true;
        }
        t.frameTime = t.frames[t.currentFrame].delay;
      }
    }

    // Rebuilding instancing VBOs
    if (needRebuild) {
      this.rebuildVao();
    }
  }

  /**
   * Render all sprites
   */
  public render() {
    this.updateQueries();

    // Rendering meshes
    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (frame.mesh) {
        const mesh = Resources.Models[frame.name];
        if (mesh) {
          mesh.render(en.matrix, (-en.rotation * Math.PI) / 2);
        }
      }
    }

    // Rendering billboards
    this.renderBillboards((Camera.rotation[1] * Math.PI) / 180.0 + Math.PI);
  }

  /**
   * Perform shadow pass
   */
  public renderShadow() {
    this.rebuildVao();
    this.renderShadowMeshes();
    this.calculateSpritesOcclusion();
    this.renderBillboards(Math.PI * 0.1);
  }

  /**
   * Render all billboards
   * @param {number} angle
   * @private
   */
  private renderBillboards(angle: number) {
    const mat = mat4.create();
    mat4.identity(mat);

    this.shader.updateMatrix(mat);
    this.shader.bind();

    GL.bindTexture(GL.TEXTURE_2D, Resources.SpriteTextures.texture);
    GL.uniform1i(this.shader.uniform('atlas'), 0);
    GL.uniform1f(this.shader.uniform('angle'), angle);
    GL.uniform3fv(this.shader.uniform('ambient'), World.AMBIENT_COLOR);
    GL.uniform3fv(this.shader.uniform('sun'), World.SUN_COLOR);

    GL.bindVertexArray(this.vao);
    GL.drawElementsInstanced(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0, this.billboardCount);
    GL.bindVertexArray(null);

    this.shader.unbind();
  }

  /**
   * Rendering meshes to shadow buffer
   */
  private renderShadowMeshes() {
    const angleMat = mat4.create();
    mat4.fromYRotation(angleMat, Math.PI * 0.1);
    mat4.translate(angleMat, angleMat, [-0.015, 0, -0.05]);

    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (frame.mesh) {
        const mesh = Resources.Models[frame.name];
        if (mesh) {
          const mat = mat4.create();
          mat4.copy(mat, en.matrix);
          const mat2 = mat4.fromYRotation(mat4.create(), (-en.rotation * Math.PI) / 2);
          mesh.renderShadow(mat4.multiply(mat4.create(), mat, mat2));
        }
      }
    }
  }

  /**
   * Calculate sprite lightness by WebGL occlusion queries
   * @private
   */
  private calculateSpritesOcclusion() {
    this.queries = [];
    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (!frame.mesh) {
        const query = GL.createQuery()!;
        GL.beginQuery(GL.ANY_SAMPLES_PASSED, query);
        this.billboardShadowPass(en, tpl, Math.PI * 0.1);
        GL.endQuery(GL.ANY_SAMPLES_PASSED);

        this.queries.push({
          query,
          entry: en
        });
      }
    }
  }

  /**
   * Update all pending queries
   * @private
   */
  private updateQueries() {
    if (this.queries.length > 0) {
      const temp = [...this.queries];
      for (const q of temp) {
        if (GL.getQueryParameter(q.query, GL.QUERY_RESULT_AVAILABLE)) {
          q.entry.lit = !!GL.getQueryParameter(q.query, GL.QUERY_RESULT);
          const idx = this.queries.indexOf(q);
          if (idx !== -1) {
            GL.deleteQuery(q.query);
            this.queries.splice(idx, 1);
          }
        }
      }
    }
  }

  /**
   * Render single sprite billboard
   * @param {SpriteEntry} en
   * @param {SpriteTemplate} tpl
   * @param {number} angle
   * @private
   */
  private billboardShadowPass(en: SpriteEntry, tpl: SpriteTemplate, angle: number) {
    const frame = tpl.frames[tpl.currentFrame];
    const atlasItem = Resources.SpriteTextures.frames[frame.name.replace('.png', '')];
    if (!atlasItem) {
      return;
    }
    const texW = Resources.SpriteTextures.width;
    const texH = Resources.SpriteTextures.height;

    this.shaderShadow.bind();

    GL.bindTexture(GL.TEXTURE_2D, Resources.SpriteTextures.texture);
    GL.uniform1i(this.shaderShadow.uniform('atlas'), 0);
    GL.uniform3f(this.shaderShadow.uniform('offset'), en.offset[0] - 0.015, en.offset[1], en.offset[2] - 0.05);
    GL.uniform1f(this.shaderShadow.uniform('angle'), angle);
    GL.uniform1f(this.shaderShadow.uniform('scale'), tpl.scale);
    GL.uniform2f(this.shaderShadow.uniform('uvStart'), atlasItem.x / texW + 0.001, atlasItem.y / texH + 0.001);
    GL.uniform2f(this.shaderShadow.uniform('uvSize'), atlasItem.width / texW - 0.002, atlasItem.height / texH - 0.002);

    GL.enableVertexAttribArray(this.shaderShadow.attribute('position'));
    GL.enableVertexAttribArray(this.shaderShadow.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shaderShadow.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shaderShadow.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shaderShadow.unbind();
  }

  /**
   * Rebuild Vertex Array
   * @private
   */
  private rebuildVao() {
    const texW = Resources.SpriteTextures.width;
    const texH = Resources.SpriteTextures.height;
    const uvStart: number[] = [];
    const uvSize: number[] = [];
    const offset: number[] = [];
    const scale: number[] = [];
    const color: number[] = [];
    this.billboardCount = 0;

    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (!frame.mesh) {
        const atlasItem = Resources.SpriteTextures.frames[frame.name.replace('.png', '')];
        if (atlasItem) {
          uvStart.push(atlasItem.x / texW + 0.001, atlasItem.y / texH + 0.001);
          uvSize.push(atlasItem.width / texW - 0.002, atlasItem.height / texH - 0.002);
          offset.push(en.offset[0], en.offset[1], en.offset[2]);
          scale.push(en.scale);
          color.push(en.lit ? 1 : 0);
          this.billboardCount++;
        }
      }
    }

    if (this.billboardCount > 0) {
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvStartBuffer);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(uvStart), GL.DYNAMIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvSizeBuffer);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(uvSize), GL.DYNAMIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.offsetBuffer);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(offset), GL.DYNAMIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.scaleBuffer);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(scale), GL.DYNAMIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.colorBuffer);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(color), GL.DYNAMIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, null);

      GL.bindVertexArray(this.vao);
      GL.enableVertexAttribArray(this.shader.attribute('position'));
      GL.enableVertexAttribArray(this.shader.attribute('uv'));
      GL.enableVertexAttribArray(this.shader.attribute('uvStart'));
      GL.enableVertexAttribArray(this.shader.attribute('uvSize'));
      GL.enableVertexAttribArray(this.shader.attribute('offset'));
      GL.enableVertexAttribArray(this.shader.attribute('scale'));
      GL.enableVertexAttribArray(this.shader.attribute('color'));

      GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
      GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
      GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvStartBuffer);
      GL.vertexAttribPointer(this.shader.attribute('uvStart'), 2, GL.FLOAT, false, 0, 0);
      GL.vertexAttribDivisor(this.shader.attribute('uvStart'), 1);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.uvSizeBuffer);
      GL.vertexAttribPointer(this.shader.attribute('uvSize'), 2, GL.FLOAT, false, 0, 0);
      GL.vertexAttribDivisor(this.shader.attribute('uvSize'), 1);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.offsetBuffer);
      GL.vertexAttribPointer(this.shader.attribute('offset'), 3, GL.FLOAT, false, 0, 0);
      GL.vertexAttribDivisor(this.shader.attribute('offset'), 1);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.scaleBuffer);
      GL.vertexAttribPointer(this.shader.attribute('scale'), 1, GL.FLOAT, false, 0, 0);
      GL.vertexAttribDivisor(this.shader.attribute('scale'), 1);
      GL.bindBuffer(GL.ARRAY_BUFFER, this.colorBuffer);
      GL.vertexAttribPointer(this.shader.attribute('color'), 1, GL.FLOAT, false, 0, 0);
      GL.vertexAttribDivisor(this.shader.attribute('color'), 1);
      GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      GL.bindVertexArray(null);
    }
  }

  /**
   * Calculate collider for sprite
   * @param {SpriteDef} def
   * @param {vec3} position
   * @param {number} side
   * @returns {CollisionBox}
   * @private
   */
  private static generateCollider(def: SpriteDef, position: vec3, side: number = 0): CollisionBox {
    // Building AABB for model
    for (const fr of def.frames) {
      if (fr.mesh) {
        return Resources.Models[fr.name].getCollider(position, side, def.scale);
      }
    }

    // No mesh found - direct cube for model
    return {
      position,
      size: [0.14, 1, 0.14]
    };
  }
}
