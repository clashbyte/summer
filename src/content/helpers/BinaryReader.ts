/**
 * Helper class for reading DataView in C# manner
 */
export class BinaryReader {
  /**
   * Byte offset in stream
   * @type {number}
   */
  public position: number;

  /**
   * Total stream length
   * @type {number}
   */
  public readonly length: number;

  /**
   * Internal data buffer
   * @type {ArrayBuffer}
   * @private
   */
  private buffer: ArrayBuffer;

  /**
   * Internal DataView
   * @type {DataView}
   * @private
   */
  private reader: DataView;

  /**
   * Constructor for BinaryReader
   * @param {ArrayBuffer} buffer
   */
  public constructor(buffer: ArrayBuffer) {
    this.position = 0;
    this.length = buffer.byteLength;
    this.buffer = buffer;
    this.reader = new DataView(buffer);
  }

  /**
   * Read single unsigned byte
   * @returns {number}
   */
  public readByte() {
    const val = this.reader.getUint8(this.position);
    this.position++;
    return val;
  }

  /**
   * Read signed byte
   * @returns {number}
   */
  public readSignedByte() {
    const val = this.reader.getInt8(this.position);
    this.position++;
    return val;
  }

  /**
   * Read byte array with specified length
   * @param {number} count
   * @returns {Uint8Array}
   */
  public readBytes(count: number) {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(this.readByte());
    }
    return new Uint8Array(out);
  }

  /**
   * Read unsigned short (2 bytes)
   * @returns {number}
   */
  public readShort() {
    const val = this.reader.getUint16(this.position, true);
    this.position += 2;
    return val;
  }

  /**
   * Read signed int (4 bytes)
   * @returns {number}
   */
  public readInt() {
    const val = this.reader.getInt32(this.position, true);
    this.position += 4;
    return val;
  }

  /**
   * Read single-precision float (4 bytes)
   * @returns {number}
   */
  public readFloat() {
    const val = this.reader.getFloat32(this.position, true);
    this.position += 4;
    return val;
  }

  /**
   * Read string with length prefix
   * @returns {string}
   */
  public readString() {
    const len = this.readShort();
    let out = '';
    for (let i = 0; i < len; i++) {
      out += String.fromCharCode(this.readByte());
    }
    return out;
  }

  /**
   * Read null-terminated string
   * @returns {string}
   */
  public readNullString() {
    let out = '';
    for (let i = 0; i < 1024; i++) {
      const char = this.readByte();
      if (char === 0) {
        break;
      }
      out += String.fromCharCode(char);
    }
    return out;
  }
}
