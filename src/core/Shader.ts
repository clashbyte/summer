import { mat4 } from 'gl-matrix';
import FragmentBase from 'src/shaders/common/prefix.frag.glsl';
import VertexBase from 'src/shaders/common/prefix.vert.glsl';
import { GL } from './Core';

type Lookup<T> = { [key: string]: T | null };

/**
 * WebGL shader wrapper
 */
export class Shader {
  /**
   * Active view matrix
   * @type {mat4}
   * @private
   */
  private static viewMatrix: mat4 = mat4.identity(mat4.create());

  /**
   * Active projection matrix
   * @type {mat4}
   * @private
   */
  private static projMatrix: mat4 = mat4.identity(mat4.create());

  /**
   * Raw vertex shader code
   * @type {string}
   * @private
   */
  private readonly vertexCode: string;

  /**
   * Raw fragment shader code
   * @type {string}
   * @private
   */
  private readonly fragmentCode: string;

  /**
   * WebGL vertex shader
   * @type {WebGLShader | null}
   * @private
   */
  private readonly vertexShader: WebGLShader | null;

  /**
   * WebGL fragment shader
   * @type {WebGLShader | null}
   * @private
   */
  private readonly fragmentShader: WebGLShader | null;

  /**
   * WebGL shader program
   * @type {WebGLProgram | null}
   * @private
   */
  private readonly program: WebGLProgram | null;

  /**
   * Uniform locations lookup
   * @type {Lookup<WebGLUniformLocation>}
   * @private
   */
  private readonly uniforms: Lookup<WebGLUniformLocation>;

  /**
   * Vertex attribute locations lookup
   * @type {Lookup<number>}
   * @private
   */
  private readonly attributes: Lookup<number>;

  /**
   * Current model matrix
   * @type {mat4}
   * @private
   */
  private modelMatrix: mat4;

  /**
   * Update view and projection matrices
   * @param {mat4} viewMatrix
   * @param {mat4} projMatrix
   */
  public static updateCamera(viewMatrix: mat4, projMatrix: mat4) {
    this.viewMatrix = viewMatrix;
    this.projMatrix = projMatrix;
  }

  /**
   * Shader constructor
   * @param {string} fragCode
   * @param {string} vertCode
   * @param {string[]} uniforms
   * @param {string[]} attributes
   */
  public constructor(fragCode: string, vertCode: string, uniforms: string[] = [], attributes: string[] = []) {
    this.fragmentCode = fragCode;
    this.vertexCode = vertCode;
    this.modelMatrix = mat4.identity(mat4.create());
    this.uniforms = {};
    this.attributes = {};
    this.vertexShader = null;
    this.fragmentShader = null;
    this.program = null;

    try {
      this.vertexShader = this.createShader(this.prefixVertexCode(), GL.VERTEX_SHADER);
      this.fragmentShader = this.createShader(this.prefixFragmentCode(), GL.FRAGMENT_SHADER);
      this.program = this.createProgram();
      GL.useProgram(this.program);

      // Seeking uniforms
      uniforms = ['projMat', 'viewMat', 'modelMat', ...uniforms];
      for (const name of uniforms) {
        this.uniforms[name] = GL.getUniformLocation(this.program, name);
      }

      // Seeking attributes
      for (const name of attributes) {
        this.attributes[name] = GL.getAttribLocation(this.program, name);
      }
    } catch (e) {
      console.error(e);
    }
    GL.useProgram(null);
  }

  /**
   * Get uniform location
   * @param {string} name
   * @returns {WebGLUniformLocation | null}
   */
  public uniform(name: string): WebGLUniformLocation | null {
    return this.uniforms[name] ?? null;
  }

  /**
   * Get vertex attribute location
   * @param {string} name
   * @returns {number}
   */
  public attribute(name: string): number {
    return this.attributes[name] ?? -1;
  }

  /**
   * Get connected matrix
   * @param {mat4} model
   */
  public updateMatrix(model: mat4) {
    this.modelMatrix = model;
  }

  /**
   * Setting as active pipeline shader
   */
  public bind() {
    GL.useProgram(this.program);
    GL.uniformMatrix4fv(this.uniforms['projMat'], false, Shader.projMatrix);
    GL.uniformMatrix4fv(this.uniforms['viewMat'], false, Shader.viewMatrix);
    GL.uniformMatrix4fv(this.uniforms['modelMat'], false, this.modelMatrix);
  }

  /**
   * Detaching shader from pipeline
   */
  public unbind() {
    GL.useProgram(null);
  }

  /**
   * Method for shader program compilation
   * @param {string} source
   * @param {GLenum} type
   * @returns {WebGLShader}
   * @private
   */
  private createShader(source: string, type: GLenum): WebGLShader {
    // Allocating shader object
    const shader = GL.createShader(type);
    if (!shader) {
      throw new Error('[Shader] Unable to allocate shader');
    }

    // Binding source code and compile
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      throw new Error('[Shader] Unable to compile shader\n\n' + source + '\n\n' + GL.getShaderInfoLog(shader));
    }

    // Shader is complete
    return shader;
  }

  /**
   * Method for program linkage
   * @returns {WebGLProgram}
   * @private
   */
  private createProgram(): WebGLProgram {
    // Allocating program
    const program = GL.createProgram();
    if (!program) {
      throw new Error('[Shader] Unable to allocate shader program');
    }

    // Linking program altogether
    GL.attachShader(program, this.vertexShader!);
    GL.attachShader(program, this.fragmentShader!);
    GL.linkProgram(program);
    if (!GL.getProgramParameter(program, GL.LINK_STATUS)) {
      throw new Error('[Shader] Unable to link program\n\n' + GL.getProgramInfoLog(program));
    }

    // Program is complete
    return program;
  }

  /**
   * Prefixing vertex code with base shader
   * @private
   */
  private prefixVertexCode() {
    return VertexBase + '\n' + this.vertexCode;
  }

  /**
   * Prefixing fragment code with base shader
   * @private
   */
  private prefixFragmentCode() {
    return FragmentBase + '\n' + this.fragmentCode;
  }
}
