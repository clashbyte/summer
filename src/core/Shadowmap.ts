import { GL } from './Core';

/**
 * Shadowmap render container
 */
export class Shadowmap {
  /**
   * Shadowmap depth texture
   * @type {WebGLTexture}
   */
  public static Texture: WebGLTexture;

  /**
   * WebGL framebuffer
   * @type {WebGLFramebuffer}
   * @private
   */
  private readonly buffer: WebGLFramebuffer;

  /**
   * Renderer construcotr
   */
  public constructor() {
    // Empty color texture - mandatory for framebuffer
    const emptyTex = GL.createTexture()!;
    GL.bindTexture(GL.TEXTURE_2D, emptyTex);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.R8, 2048, 2048, 0, GL.RED, GL.UNSIGNED_BYTE, null);
    GL.bindTexture(GL.TEXTURE_2D, null);

    // Depth texture
    const depthTex = GL.createTexture()!;
    GL.bindTexture(GL.TEXTURE_2D, depthTex);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.DEPTH_COMPONENT24, 2048, 2048, 0, GL.DEPTH_COMPONENT, GL.UNSIGNED_INT, null);
    GL.bindTexture(GL.TEXTURE_2D, null);
    Shadowmap.Texture = depthTex;

    // Framebuffer creation
    this.buffer = GL.createFramebuffer()!;
    GL.bindFramebuffer(GL.FRAMEBUFFER, this.buffer);
    GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, emptyTex, 0);
    GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.TEXTURE_2D, depthTex, 0);
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
  }

  /**
   * Enable drawing to shadowmap buffer
   */
  public bind() {
    GL.bindFramebuffer(GL.FRAMEBUFFER, this.buffer);
    GL.viewport(0, 0, 2048, 2048);
    GL.colorMask(false, false, false, false);
    GL.clear(GL.DEPTH_BUFFER_BIT);
  }

  /**
   * Disable rendering to shadowmap
   */
  public unbind() {
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
  }
}
