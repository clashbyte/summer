import RootConfig from 'src/assets/data.bin';
import DoorsAtlasConfig from 'src/assets/doors.bin';
import DoorsAtlasImage from 'src/assets/doors.png';
import IkarusModel from 'src/assets/ik20.s3d';
import Lada01Model from 'src/assets/lada01.s3d';
import Lada02Model from 'src/assets/lada02.s3d';
import Lada03Model from 'src/assets/lada03.s3d';
import Lada04Model from 'src/assets/lada04.s3d';
import SpriteAtlasConfig from 'src/assets/sprites.bin';
import SpriteAtlasImage from 'src/assets/sprites.png';
import TextureAtlasConfig from 'src/assets/textures.bin';
import TextureAtlasImage from 'src/assets/textures.png';
import { MeshSprite } from 'src/map/MeshSprite';
import { MapReader } from './map/MapReader';
import { TextureAtlas } from './textures/TextureAtlas';

/**
 * Class with shared resources
 */
export class Resources {
  public static Textures: TextureAtlas;
  public static SpriteTextures: TextureAtlas;
  public static DoorsTextures: TextureAtlas;
  public static Models: { [key: string]: MeshSprite } = {};

  /**
   * Load all graphical resources and map data
   */
  public static async load() {
    // Fetching texture dictionaries
    const [
      textures, //
      sprites,
      doors
    ] = await Promise.all([
      TextureAtlas.load(TextureAtlasConfig, TextureAtlasImage), //
      TextureAtlas.load(SpriteAtlasConfig, SpriteAtlasImage),
      TextureAtlas.load(DoorsAtlasConfig, DoorsAtlasImage)
    ]);
    this.Textures = textures;
    this.SpriteTextures = sprites;
    this.DoorsTextures = doors;

    // Loading models
    const [
      ikarus, //
      lada1,
      lada2,
      lada3,
      lada4
    ] = await Promise.all([
      MeshSprite.load(IkarusModel), //
      MeshSprite.load(Lada01Model),
      MeshSprite.load(Lada02Model),
      MeshSprite.load(Lada03Model),
      MeshSprite.load(Lada04Model)
    ]);
    this.Models = {
      'ik20.s3d': ikarus,
      'lada01.s3d': lada1,
      'lada02.s3d': lada2,
      'lada03.s3d': lada3,
      'lada04.s3d': lada4
    };

    // Returning parsed data
    return await MapReader.parse(RootConfig);
  }
}
