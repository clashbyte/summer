import { BinaryReader } from 'src/content/helpers/BinaryReader';

/**
 * Cell content type
 */
export enum CellType {
  None = -1,
  Wall,
  Sprite,
  Door,
  Stair
}

/**
 * Temporary cell struct
 */
interface TempCell {
  type: CellType;
  ID: number;
  side?: number;
  hasFloor?: boolean;
  floorID?: number;
  hasCeil?: boolean;
  ceilID?: number;
}

/**
 * Final blockmap cell data
 */
export interface Cell {
  wall: string | null;
  floor: string | null;
  ceil: string | null;
}

/**
 * Single game object
 */
export interface Entity {
  type: CellType;
  x: number;
  y: number;
  z: number;
  side: number;
  id: string | SpriteDef;
}

/**
 * Definition for sprite template
 */
export interface SpriteDef {
  solid: boolean;
  scale: number;
  frames: { name: string; delay: number; mesh: boolean }[];
}

/**
 * Class that parses data.bin file
 */
export class MapReader {
  /**
   * Parsing whole data file
   * @param {string} path
   * @returns {Promise<{textures: string[], modelsToLoad: string[], map: Cell[][][], sprites: SpriteDef[]}>}
   */
  public static async parse(path: string) {
    const req = await fetch(path);
    const f = new BinaryReader(await req.arrayBuffer());

    const width = f.readShort();
    const height = f.readShort();
    const mapSize = width * height * 8;
    const tempCells: TempCell[] = [];

    // Map compressed with sort-of RLE - decoding
    while (tempCells.length < mapSize) {
      const span = f.readSignedByte();
      const empty = span < 0;
      for (let i = 0; i < Math.abs(span); i++) {
        if (!empty) {
          const type = f.readSignedByte();
          if (type === CellType.Wall) {
            const ID = f.readShort();
            tempCells.push({
              type,
              ID
            });
          } else {
            const floorCeilMask = f.readByte();
            const hasFloor = !!(floorCeilMask & 1);
            const hasCeil = !!(floorCeilMask & 2);
            let floorID = 0;
            let ceilID = 0;
            if (hasFloor) {
              floorID = f.readShort();
            }
            if (hasCeil) {
              ceilID = f.readShort();
            }
            const side = f.readByte();
            let ID = 0;

            if ([CellType.Door, CellType.Sprite, CellType.Stair].includes(type)) {
              ID = f.readShort();
            }
            tempCells.push({
              type,
              ID,
              side,
              hasFloor,
              hasCeil,
              floorID,
              ceilID
            });
          }
        } else {
          tempCells.push({
            type: CellType.None,
            ID: 0
          });
        }
      }
    }

    // Reading texture dictionary
    const textures: string[] = [];
    const texCount = f.readShort();
    for (let i = 0; i < texCount; i++) {
      textures[i] = f.readString().replace('.png', '');
    }

    // Reading sprites
    const [
      sprites, //
      modelsToLoad
    ] = this.parseSprites(f);

    // Reading doors
    const doorTextures: string[] = [];
    const doorCount = f.readShort();
    for (let i = 0; i < doorCount; i++) {
      doorTextures[i] = f.readString().replace('.png', '');
    }

    // Transforming map into correct data
    const map: Cell[][][] = [];
    const entities: Entity[] = [];
    let idx = 0;
    for (let floor = 0; floor < 8; floor++) {
      const floorGroup: Cell[][] = [];
      for (let y = 0; y < height; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < width; x++) {
          const c: TempCell = tempCells[idx];
          idx++;

          let wallTex: string | null = null;
          let floorTex: string | null = null;
          let ceilTex: string | null = null;
          if (c.type === CellType.Wall) {
            wallTex = textures[c.ID];
          } else {
            if (c.hasFloor) {
              floorTex = textures[c.floorID!];
            }
            if (c.hasCeil) {
              ceilTex = textures[c.ceilID!];
            }

            let id: string | SpriteDef | null = null;

            switch (c.type) {
              case CellType.Sprite:
                id = sprites[c.ID];
                break;

              case CellType.Door:
                id = doorTextures[c.ID];
                break;

              case CellType.Stair:
                id = textures[c.ID];
                break;
            }
            if (id !== null) {
              entities.push({
                x: x,
                y: floor,
                z: y,
                side: (c.side! + 1) % 4,
                type: c.type,
                id: id
              });
            }
          }
          row.push({
            wall: wallTex,
            floor: floorTex,
            ceil: ceilTex
          });
        }
        floorGroup.push(row);
      }
      map.push(floorGroup);
    }

    return {
      map,
      textures,
      sprites,
      entities,
      modelsToLoad
    };
  }

  /**
   * Parsing sprite def dictionary
   * @param {BinaryReader} f
   * @returns {readonly [SpriteDef[], string[]]}
   * @private
   */
  private static parseSprites(f: BinaryReader) {
    const count = f.readShort();
    const sprites: SpriteDef[] = [];
    const models: string[] = [];
    for (let i = 0; i < count; i++) {
      const solid = !!f.readByte();
      const scale = f.readFloat();
      const frameCount = f.readByte();
      const sprite: SpriteDef = {
        solid,
        scale: scale === 0 ? 1 : scale,
        frames: []
      };
      for (let j = 0; j < frameCount; j++) {
        const name = f.readString();
        const delay = f.readShort();
        const mesh = name.endsWith('.s3d');
        if (mesh && !models.includes(name)) {
          models.push(name);
          sprite.solid = true;
        }
        sprite.frames.push({
          name,
          mesh,
          delay
        });
      }
      sprites[i] = sprite;
    }
    return [sprites, models] as const;
  }
}
