import { vec2, vec3 } from 'gl-matrix';
import AmbientIndoor from 'src/sounds/ambient_indoor.mp3';
import AmbientCity from 'src/sounds/ambient_outside.mp3';
import AmbientBackyard from 'src/sounds/ambient_yard.mp3';
import CarAlarm from 'src/sounds/car_alarm.mp3';
import Children from 'src/sounds/children.mp3';
import Construction from 'src/sounds/construction.mp3';
import Crowd from 'src/sounds/crowd.mp3';
import DogBark from 'src/sounds/dog_bark.mp3';
import StepDefault from 'src/sounds/step.mp3';
import StepGrass from 'src/sounds/step_grass.mp3';
import { Zone, Zones } from './Zones';

/**
 * Sound files paths for prefetch
 * @type {any[]}
 */
const SOUND_PATHS = [
  AmbientCity,
  AmbientBackyard,
  AmbientIndoor,
  StepDefault,
  StepGrass,
  DogBark,
  Crowd,
  Children,
  Construction,
  CarAlarm
];

/**
 * Sound area type
 */
enum SoundArea {
  Outside,
  Backyard,
  Indoor
}

/**
 * Zone with area sound state
 */
interface AreaZone {
  zone: Zone;
  area: SoundArea;
}

/**
 * Sound point emitter
 */
interface SoundPoint {
  position: vec3;
  radius: number;
  path: string;
  volume: number;

  buffer?: AudioBuffer;
  gain?: GainNode;
  active?: boolean;
  source?: AudioBufferSourceNode;
}

/**
 * State struct for single ambient channel
 */
interface SoundAreaState {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode;
  gain: GainNode;
  volume: number;
  volumeMultiplier: number;
}

/**
 * Class for sound environment
 */
export class Soundscape {
  /**
   * Flag that assets is loading
   * @type {boolean}
   * @private
   */
  private static loading: boolean;

  /**
   * Flag for sounds readiness
   * @type {boolean}
   * @private
   */
  private static ready: boolean;

  /**
   * Browser audio context
   * @type {AudioContext}
   * @private
   */
  private static context: AudioContext;

  /**
   * Ambient channel states
   * @type {SoundAreaState[]}
   * @private
   */
  private static areas: SoundAreaState[] = [];

  /**
   * Ambient change zones
   * @type {AreaZone[]}
   * @private
   */
  private static areaZones: AreaZone[] = [];

  /**
   * One-shot step sounds collection
   * @type {AudioBufferSourceNode[]}
   * @private
   */
  private static steps: AudioBufferSourceNode[] = [];

  /**
   * Sound buffers lookup
   * @type {{[p: string]: AudioBuffer}}
   * @private
   */
  private static buffers: { [key: string]: AudioBuffer } = {};

  /**
   * Point emitters
   * @type {SoundPoint[]}
   * @private
   */
  private static emitters: SoundPoint[] = [];

  /**
   * Zones and emitters creation
   */
  public static init() {
    // Zoned ambience configs
    this.areaZones.push(
      {
        zone: Zones.addZone([13, 0, 14], [18, 6, 23]),
        area: SoundArea.Indoor
      },
      {
        zone: Zones.addZone([47, 0, 37], [59, 0, 43]),
        area: SoundArea.Backyard
      },
      {
        zone: Zones.addZone([39, 0, 45], [50, 0, 51]),
        area: SoundArea.Backyard
      },
      {
        zone: Zones.addZone([51, 0, 44], [53, 0, 47]),
        area: SoundArea.Indoor
      }
    );

    // Random sounds
    this.emitters.push(
      {
        position: [19, 4, 19],
        radius: 4,
        volume: 0.7,
        path: DogBark
      },
      {
        position: [34, 0, 50],
        radius: 8,
        volume: 0.9,
        path: Crowd
      },
      {
        position: [34, 0, 60],
        radius: 8,
        volume: 0.9,
        path: Children
      },
      {
        position: [34, 0, 15],
        radius: 10,
        volume: 0.2,
        path: Construction
      },
      {
        position: [63, 0, 29],
        radius: 10,
        volume: 0.2,
        path: Construction
      },
      {
        position: [50, 0, 60],
        radius: 10,
        volume: 0.2,
        path: Construction
      },
      {
        position: [48, 0, 51],
        radius: 8,
        volume: 0.6,
        path: CarAlarm
      }
    );
  }

  /**
   * Check buffers and start loading
   * @returns {Promise<void>}
   */
  public static async checkBuffers() {
    if (!this.loading && !this.ready) {
      this.loading = true;
      try {
        this.context = new AudioContext();
        await Promise.all(SOUND_PATHS.map((path) => this.preloadSound(path)));
        const areaFiles = [AmbientCity, AmbientBackyard, AmbientIndoor];
        const areaVolumes = [1.3, 0.5, 0.7];

        for (let i = 0; i < 3; i++) {
          const areaFile = areaFiles[i];
          const areaVolume = areaVolumes[i];
          const buffer = this.buffers[areaFile];

          const audio = this.context.createBufferSource();
          audio.buffer = buffer;
          audio.loop = true;

          const gain = new GainNode(this.context);
          gain.gain.value = 0;

          audio.connect(gain);
          gain.connect(this.context.destination);
          audio.start();

          this.areas.push({
            volume: 0,
            volumeMultiplier: areaVolume,
            buffer,
            source: audio,
            gain
          });
        }

        for (const emitter of this.emitters) {
          const buffer = this.buffers[emitter.path];

          const audio = this.context.createBufferSource();
          audio.buffer = buffer;
          audio.loop = true;

          const gain = new GainNode(this.context);
          gain.gain.value = 0;

          audio.connect(gain);
          gain.connect(this.context.destination);
          audio.start();

          emitter.buffer = buffer;
          emitter.source = audio;
          emitter.gain = gain;
        }

        this.ready = true;
      } catch (ex) {}
    }
  }

  /**
   * Emit step sound
   * @param {boolean} grass
   */
  public static emitStep(grass: boolean) {
    if (this.ready) {
      const source = this.context.createBufferSource();
      source.buffer = this.buffers[grass ? StepGrass : StepDefault];
      source.loop = false;
      source.onended = () => {
        const idx = this.steps.indexOf(source);
        if (idx !== -1) {
          this.steps.splice(idx, 1);
        }
      };
      source.playbackRate.value = 0.8 + Math.random() * 0.4;
      source.connect(this.context.destination);
      source.start();
    }
  }

  /**
   * Update sound logic
   * @param {vec3} position
   */
  public static update(position: vec3) {
    let area: SoundArea = SoundArea.Outside;
    for (const zn of this.areaZones) {
      if (zn.zone.active) {
        area = zn.area;
        break;
      }
    }

    if (this.ready) {
      // Ambience mix
      for (let i = 0; i < 3; i++) {
        this.areas[i].volume = Math.min(Math.max(this.areas[i].volume + (i === area ? 0.02 : -0.01), 0.0), 1.0);
        this.areas[i].gain.gain.value = this.areas[i].volume * this.areas[i].volumeMultiplier;
      }

      // Positional sounds
      for (const emitter of this.emitters) {
        const dist = vec2.dist([emitter.position[0], emitter.position[2]], [position[0], position[2]]);
        let volume = 0;
        if (dist < emitter.radius) {
          volume =
            (1.0 - dist / emitter.radius) * (1.0 - Math.min(Math.abs(emitter.position[1] - position[1]) / 0.7, 1.0));
        }
        if (volume > 0) {
          emitter.gain!.gain.value = (1.0 - Math.pow(1 - volume, 3)) * emitter.volume;
          if (!emitter.active) {
            try {
              emitter.source!.start();
              emitter.active = true;
            } catch (e) {}
          }
        } else {
          if (emitter.active) {
            try {
              emitter.source!.stop();
              emitter.active = false;
            } catch (e) {}
          }
        }
      }
    }
  }

  /**
   * Promisified sound buffer loading
   * @param {string} path
   * @returns {Promise<void>}
   * @private
   */
  private static async preloadSound(path: string) {
    const res = await fetch(path);
    const data = await res.arrayBuffer();
    this.buffers[path] = await this.context.decodeAudioData(data);
    if (!this.buffers[path]) {
      console.warn('unable to decode', path);
    }
  }
}
