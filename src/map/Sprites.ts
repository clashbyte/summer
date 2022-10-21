import { mat4, quat, vec3 } from 'gl-matrix';
import { CellType, Entity, SpriteDef } from 'src/content/map/MapReader';
import { Resources } from 'src/content/Resources';
import { Camera } from 'src/core/Camera';
import { GL } from 'src/core/Core';
import { Shader } from 'src/core/Shader';
import { CollisionBox, Player } from 'src/entities/Player';
import SpriteFragCode from 'src/shaders/entities/sprite.frag.glsl';
import SpriteVertCode from 'src/shaders/entities/sprite.vert.glsl';
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
  private templates: SpriteTemplate[];

  /**
   * Sprite instances
   * @type {SpriteEntry[]}
   * @private
   */
  private entries: SpriteEntry[];

  /**
   * WebGL billboard vertex buffer
   * @type {WebGLBuffer}
   * @private
   */
  private vertexBuffer: WebGLBuffer;

  /**
   * UV buffer
   * @type {WebGLBuffer}
   * @private
   */
  private uvBuffer: WebGLBuffer;

  /**
   * Indices buffer
   * @type {WebGLBuffer}
   * @private
   */
  private indexBuffer: WebGLBuffer;

  /**
   * Direct pass shader
   * @type {Shader}
   * @private
   */
  private shader: Shader;

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
          rotation: en.side
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

    this.shader = new Shader(
      SpriteFragCode,
      SpriteVertCode,
      ['atlas', 'startUV', 'endUV', 'angleMat', 'color'],
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
  }

  /**
   * Update sprite texture animations
   * @param {number} delta
   */
  public update(delta: number) {
    for (const t of this.templates) {
      t.frameTime -= delta;
      if (t.frameTime <= 0) {
        t.currentFrame = (t.currentFrame + 1) % t.frames.length;
        t.frameTime = t.frames[t.currentFrame].delay;
      }
    }
  }

  /**
   * Render all sprites
   */
  public render() {
    this.updateQueries();
    const angleMat = mat4.create();
    mat4.fromYRotation(angleMat, (Camera.rotation[1] * Math.PI) / 180.0 + Math.PI);

    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (!frame.name.endsWith('.s3d')) {
        const atlasItem = Resources.SpriteTextures.frames[frame.name.replace('.png', '')];
        if (!atlasItem) {
          continue;
        }
        const texW = Resources.SpriteTextures.width;
        const texH = Resources.SpriteTextures.height;

        this.shader.updateMatrix(en.matrix);
        this.shader.bind();
        GL.enableVertexAttribArray(this.shader.attribute('position'));
        GL.enableVertexAttribArray(this.shader.attribute('uv'));
        GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
        GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
        GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

        GL.uniform3fv(this.shader.uniform('color'), en.lit ? World.SUN_COLOR : World.AMBIENT_COLOR);
        GL.uniformMatrix4fv(this.shader.uniform('angleMat'), false, angleMat);
        GL.uniform2f(this.shader.uniform('startUV'), atlasItem.x / texW + 0.001, atlasItem.y / texH + 0.001);
        GL.uniform2f(this.shader.uniform('endUV'), atlasItem.width / texW - 0.002, atlasItem.height / texH - 0.002);

        GL.bindTexture(GL.TEXTURE_2D, Resources.SpriteTextures.texture);
        GL.uniform1i(this.shader.uniform('atlas'), 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
        GL.bindBuffer(GL.ARRAY_BUFFER, null);
        this.shader.unbind();
      } else {
        const mesh = Resources.Models[frame.name];
        if (mesh) {
          mesh.render(en.matrix, (-en.rotation * Math.PI) / 2);
        }
      }
    }
  }

  /**
   * Perform shadow pass
   */
  public renderShadow() {
    this.renderShadowMeshes();
    this.calculateSpritesOcclusion();
    this.renderShadowBillboards();
  }

  /**
   * Rendering billboards to shadow buffer
   */
  private renderShadowBillboards() {
    const angleMat = mat4.create();
    mat4.fromYRotation(angleMat, Math.PI * 0.1);
    mat4.translate(angleMat, angleMat, [-0.015, 0, -0.05]);

    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (!frame.name.endsWith('.s3d')) {
        this.billboardShadowPass(en, tpl, angleMat);
      }
    }
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
      if (frame.name.endsWith('.s3d')) {
        const mesh = Resources.Models[frame.name];
        if (mesh) {
          const mat = mat4.create();
          mat4.copy(mat, en.matrix);
          const mat2 = mat4.fromYRotation(mat4.create(), (-en.rotation * Math.PI) / 2);
          mesh.render(mat4.multiply(mat4.create(), mat, mat2));
        }
      }
    }
  }

  /**
   * Calculate sprite lightness by WebGL occlusion queries
   * @private
   */
  private calculateSpritesOcclusion() {
    const angleMat = mat4.create();
    mat4.fromYRotation(angleMat, Math.PI * 0.1);
    mat4.translate(angleMat, angleMat, [-0.015, 0, -0.05]);

    this.queries = [];
    for (const en of this.entries) {
      const tpl = this.templates[en.id];
      const frame = tpl.frames[tpl.currentFrame];
      if (!frame.name.endsWith('.s3d')) {
        const query = GL.createQuery()!;
        GL.beginQuery(GL.ANY_SAMPLES_PASSED, query);
        this.billboardShadowPass(en, tpl, angleMat);
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
   * @param {mat4} angleMat
   * @private
   */
  private billboardShadowPass(en: SpriteEntry, tpl: SpriteTemplate, angleMat: mat4) {
    const frame = tpl.frames[tpl.currentFrame];
    const atlasItem = Resources.SpriteTextures.frames[frame.name.replace('.png', '')];
    if (!atlasItem) {
      return;
    }
    const texW = Resources.SpriteTextures.width;
    const texH = Resources.SpriteTextures.height;

    this.shader.updateMatrix(en.matrix);
    this.shader.bind();
    GL.enableVertexAttribArray(this.shader.attribute('position'));
    GL.enableVertexAttribArray(this.shader.attribute('uv'));
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this.shader.attribute('position'), 3, GL.FLOAT, false, 0, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.uvBuffer);
    GL.vertexAttribPointer(this.shader.attribute('uv'), 2, GL.FLOAT, false, 0, 0);

    GL.uniformMatrix4fv(this.shader.uniform('angleMat'), false, angleMat);
    GL.uniform2f(this.shader.uniform('startUV'), atlasItem.x / texW + 0.001, atlasItem.y / texH + 0.001);
    GL.uniform2f(this.shader.uniform('endUV'), atlasItem.width / texW - 0.002, atlasItem.height / texH - 0.002);

    GL.bindTexture(GL.TEXTURE_2D, Resources.SpriteTextures.texture);
    GL.uniform1i(this.shader.uniform('atlas'), 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_BYTE, 0);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    this.shader.unbind();
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
      if (fr.name.endsWith('.s3d')) {
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
