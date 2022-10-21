import { vec2, vec3 } from 'gl-matrix';
import { CellType } from 'src/content/map/MapReader';
import { Camera } from 'src/core/Camera';
import { Controls } from 'src/core/Controls';
import { World } from 'src/map/World';
import { Soundscape } from './Soundscape';
import { Zones } from './Zones';

/**
 * AABB collision box
 */
export interface CollisionBox {
  position: vec3;
  size: vec3;
}

/**
 * Player controller
 */
export class Player {
  /**
   * Solid boxes to collide with
   * @type {CollisionBox[]}
   */
  public static Colliders: CollisionBox[] = [];

  /**
   * Camera pitch
   * @type {number}
   * @private
   */
  private angleX: number = 0;

  /**
   * Camera yaw
   * @type {number}
   * @private
   */
  private angleY: number = 0;

  /**
   * Global player position
   * @type {vec3}
   * @private
   */
  private position: vec3 = [0, 0, 0];

  /**
   * Movement speed vector
   * @type {vec2}
   * @private
   */
  private speed: vec2 = [0, 0];

  /**
   * Camera bobbing counter
   * @type {number}
   * @private
   */
  private bob: number = 0;

  /**
   * Flag that step sound is played in this bob cycle
   * @type {boolean}
   * @private
   */
  private stepPlayed: boolean = false;

  /**
   * Player spawn
   * @param {vec3} position
   * @param {number} angle
   */
  public constructor(position: vec3, angle: number) {
    vec3.copy(this.position, position);
    this.angleX = angle;
    this.angleY = 0;
  }

  /**
   * Update player logic
   * @param {number} delta
   */
  public update(delta: number) {
    // Updating mouselook
    const mouseSpeed = 0.15;
    const moveAccel = 0.012;
    const moveMaxSpeed = 0.04;

    const mouse = Controls.getMouseSpeed();
    this.angleX = (this.angleX - mouse[0] * mouseSpeed) % 360;
    this.angleY = Math.min(Math.max(this.angleY - mouse[1] * mouseSpeed, -85), 85);

    // Calculating movement vector
    const movement = Controls.getMovement();
    const angle = -this.angleX * (Math.PI / 180.0);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let moveX = movement[0] * cos - movement[1] * sin;
    let moveY = movement[0] * sin + movement[1] * cos;
    const moveLen = vec2.len([moveX, moveY]);
    if (moveLen > 1) {
      moveX /= moveLen;
      moveY /= moveLen;
    }

    // Calculating acceleration
    this.speed[0] = this.speed[0] * Math.pow(0.8, delta) + moveX * moveAccel * delta;
    this.speed[1] = this.speed[1] * Math.pow(0.8, delta) + moveY * moveAccel * delta;
    const currentSpeed = vec2.len(this.speed);
    if (currentSpeed > moveMaxSpeed) {
      this.speed[0] = (this.speed[0] / currentSpeed) * moveMaxSpeed;
      this.speed[1] = (this.speed[1] / currentSpeed) * moveMaxSpeed;
    }

    // Process map collisions
    const moveDist = vec2.fromValues(this.position[0], this.position[2]);
    this.collide(delta);
    const onGrass = this.putOnFloor();
    moveDist[0] -= this.position[0];
    moveDist[1] -= this.position[2];
    const moveDistLen = Math.min(vec2.len(moveDist) / delta / moveMaxSpeed, 1.0);
    if (moveDistLen > 0.2) {
      this.bob = (this.bob + 0.22 * delta) % (Math.PI * 2);
      if (this.bob > Math.PI) {
        if (!this.stepPlayed) {
          Soundscape.emitStep(onGrass);
          this.stepPlayed = true;
        }
      } else {
        this.stepPlayed = false;
      }
    } else {
      this.stepPlayed = false;
      this.bob = 0;
    }

    // Updating logics
    Zones.update(this.position);
    Soundscape.update(this.position);

    // Update camera
    Camera.position = [
      this.position[0],
      this.position[1] + 0.07 - Math.sin(this.bob) * moveDistLen * 0.02,
      this.position[2]
    ];
    Camera.rotation = [this.angleY, this.angleX, 0];
  }

  /**
   * Colliding player AABB with gridmap and other AABBs
   * @param {number} delta
   * @private
   */
  private collide(delta: number) {
    const radius = 0.2;
    const height = 0.3;
    const pf = this.position[1];
    let px = this.position[0];
    let py = this.position[2];
    const cx = Math.floor(px + 0.5);
    const cy = Math.floor(py + 0.5);
    const cells = World.MapCells;

    // Collide in X axis
    if (this.speed[0] !== 0) {
      const startCell = Math.floor(py + 0.5 - radius);
      const endCell = Math.floor(py + 0.5 + radius);
      const startFloor = Math.max(Math.floor(pf + 0.5 - height), 0);
      const endFloor = Math.max(Math.floor(pf + 0.5 + height), 0);
      const dir = this.speed[0] > 0 ? 1 : -1;

      // Seeking nearest blockmap solid cell
      let nearest = cx + dir * 5;
      for (let fl = startFloor; fl <= endFloor; fl++) {
        const floor = cells[fl];
        if (floor) {
          for (let x = startCell; x <= endCell; x++) {
            const row = floor[x];
            if (row) {
              const cell = row[cx + dir];
              if (cell && cell.wall !== null) {
                nearest = cx + dir;
                if (dir < 0) {
                  nearest += 1;
                }
                break;
              }
            }
          }
        }
      }
      nearest -= 0.5;

      // Checking AABB boxes after blockmap
      for (const box of Player.Colliders) {
        const bx = box.position[0];
        const by = box.position[1];
        const bz = box.position[2];
        const bsx = box.size[0] * 0.5;
        const bsy = box.size[1] * 0.5;
        const bsz = box.size[2] * 0.5;
        if (!(bz - bsz > py + radius || bz + bsz < py - radius || by - bsy > pf + height || by + bsy < pf - height)) {
          if (Math.sign(bx - px) === dir) {
            nearest = Math[dir > 0 ? 'min' : 'max'](nearest, bx - bsx * dir);
          }
        }
      }

      // Try to move player along X axis
      px += this.speed[0] * delta;
      if (Math.abs(nearest - px) < radius) {
        px = nearest + radius * -dir * 1.001;
        this.speed[0] = 0;
      }
    }

    // Collide in Z axis
    if (this.speed[1] !== 0) {
      const startCell = Math.floor(px + 0.5 - radius);
      const endCell = Math.floor(px + 0.5 + radius);
      const startFloor = Math.max(Math.floor(pf + 0.5 - height), 0);
      const endFloor = Math.max(Math.floor(pf + 0.5 + height), 0);
      const dir = this.speed[1] > 0 ? 1 : -1;

      // Seeking nearest wall
      let nearest = cy + dir * 5;
      for (let fl = startFloor; fl <= endFloor; fl++) {
        const floor = cells[fl];
        if (floor) {
          const row = floor[cy + dir];
          if (row) {
            for (let x = startCell; x <= endCell; x++) {
              const cell = row[x];
              if (cell && cell.wall !== null) {
                nearest = cy + dir;
                if (dir < 0) {
                  nearest += 1;
                }
                break;
              }
            }
          }
        }
      }
      nearest -= 0.5;

      // Checking AABB boxes after blockmap
      for (const box of Player.Colliders) {
        const bx = box.position[0];
        const by = box.position[1];
        const bz = box.position[2];
        const bsx = box.size[0] * 0.5;
        const bsy = box.size[1] * 0.5;
        const bsz = box.size[2] * 0.5;
        if (!(bx - bsx > px + radius || bx + bsx < px - radius || by - bsy > pf + height || by + bsy < pf - height)) {
          if (Math.sign(bz - py) === dir) {
            nearest = Math[dir > 0 ? 'min' : 'max'](nearest, bz - bsz * dir);
          }
        }
      }

      // Try to move player along Z axis
      py += this.speed[1] * delta;
      if (Math.abs(nearest - py) < radius) {
        py = nearest + radius * -dir * 1.001;
        this.speed[1] = 0;
      }
    }

    // Updating position after movement and collision
    this.position[0] = px;
    this.position[2] = py;
  }

  /**
   * Searhing for highest floor under the player
   * @private
   */
  private putOnFloor() {
    // Checking blockmap for floor/wall under the player
    let floorPos = this.position[1];
    let onGrass = false;
    const cf = Math.floor(this.position[1] + 0.5);
    const cx = Math.floor(this.position[0] + 0.5);
    const cy = Math.floor(this.position[2] + 0.5);
    for (let y = cf; y >= 0; y--) {
      const cell = World.MapCells[y][cy][cx];
      if (cell.wall !== null && y < cf) {
        floorPos = y + 1;
        break;
      } else if (cell.floor !== null) {
        floorPos = y;
        if (cell.floor.toLowerCase().includes('grass')) {
          onGrass = true;
        }
        break;
      }
    }

    // Also checking "stair" objects by transforming
    // player coords into slope space
    let stairPos = floorPos;
    const stairs = World.MapEntities.filter((en) => en.type === CellType.Stair && en.y <= cf);
    for (const stair of stairs) {
      const player = vec2.rotate(
        vec2.create(),
        vec2.fromValues(
          this.position[0] - stair.x, //
          this.position[2] - stair.z
        ),
        [0, 0],
        (stair.side * Math.PI) / 2
      );
      if (player[0] >= -0.5 && player[0] <= 0.5 && player[1] >= -0.5 && player[1] <= 1.5) {
        stairPos = stair.y + 1 - (player[1] + 0.5) / 2.0;
      }
    }

    // Updating Y position
    this.position[1] = Math.max(floorPos, stairPos);
    return onGrass;
  }
}
