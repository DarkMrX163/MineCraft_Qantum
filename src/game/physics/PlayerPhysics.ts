import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BLOCK_DEFS, BlockType } from '../constants';

export class PlayerPhysics {
  public position = new THREE.Vector3(0, 25, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public isGrounded = false;
  public isFlying = false;
  public isInWater = false;
  public isSubmerged = false;

  public playerWidth = 0.6;
  public playerHeight = 1.8;

  private gravity = 26.0;
  private walkSpeed = 6.0;
  private flySpeed = 11.0;
  private swimSpeed = 4.2;
  private jumpForce = 8.5;

  public update(
    dt: number,
    moveInput: { x: number; z: number }, // x: strafe, z: forward
    yaw: number, // Y-axis rotation in radians
    jumpRequested: boolean,
    sneakRequested: boolean,
    world: VoxelWorld,
    speedMultiplier = 1.0
  ) {
    // Clamp frame delta time to prevent large steps
    const clampedDt = Math.min(dt, 0.05);

    // Calculate move direction relative to camera yaw angle
    const moveVector = new THREE.Vector3();
    if (moveInput.x !== 0 || moveInput.z !== 0) {
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();
      moveVector.addScaledVector(right, moveInput.x);
      moveVector.addScaledVector(forward, moveInput.z);
      if (moveVector.lengthSq() > 0) {
        moveVector.normalize();
      }
    }

    // Check water at feet and head
    const feetBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 0.1),
      Math.floor(this.position.z)
    );
    const headBlock = world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + 1.55),
      Math.floor(this.position.z)
    );

    this.isInWater = feetBlock === BlockType.WATER || headBlock === BlockType.WATER;
    this.isSubmerged = headBlock === BlockType.WATER;

    // Determine current movement speed
    let speed = this.walkSpeed * speedMultiplier;
    if (this.isFlying) {
      speed = this.flySpeed * speedMultiplier;
    } else if (this.isInWater) {
      speed = this.swimSpeed * speedMultiplier;
    } else if (sneakRequested) {
      speed = this.walkSpeed * 0.45 * speedMultiplier;
    }

    // Sub-stepping to guarantee NO clipping / tunneling through textures at any framerate
    const subSteps = Math.max(1, Math.ceil(speed * clampedDt / 0.1));
    const subDt = clampedDt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.singleStep(subDt, moveVector, speed, jumpRequested, sneakRequested, world);
    }
  }

  private singleStep(
    dt: number,
    moveVector: THREE.Vector3,
    currentSpeed: number,
    jumpRequested: boolean,
    sneakRequested: boolean,
    world: VoxelWorld
  ) {
    if (this.isFlying) {
      // 3D Flying Physics with strict block collision
      this.velocity.x = moveVector.x * currentSpeed;
      this.velocity.z = moveVector.z * currentSpeed;

      if (jumpRequested) {
        this.velocity.y = currentSpeed * 0.8;
      } else if (sneakRequested) {
        this.velocity.y = -currentSpeed * 0.8;
      } else {
        this.velocity.y = 0;
      }

      this.moveAndCollide(dt, world);
      return;
    }

    if (this.isInWater) {
      // Swimming physics
      this.velocity.x = moveVector.x * currentSpeed;
      this.velocity.z = moveVector.z * currentSpeed;

      if (jumpRequested) {
        this.velocity.y = Math.min(this.velocity.y + 18.0 * dt, 4.0);
      } else if (sneakRequested) {
        this.velocity.y = Math.max(this.velocity.y - 18.0 * dt, -4.0);
      } else {
        // Buoyancy / slow sink
        this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, -0.8, dt * 6.0);
      }

      this.moveAndCollide(dt, world);
      return;
    }

    // Standard Walking / Gravity Physics
    this.velocity.x = moveVector.x * currentSpeed;
    this.velocity.z = moveVector.z * currentSpeed;

    // Apply gravity
    this.velocity.y -= this.gravity * dt;

    // Jump
    if (jumpRequested && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    this.moveAndCollide(dt, world);
  }

  private moveAndCollide(dt: number, world: VoxelWorld) {
    // 1. Move Y and collide
    this.position.y += this.velocity.y * dt;
    this.collideY(world);

    // 2. Move X and collide
    this.position.x += this.velocity.x * dt;
    this.collideX(world);

    // 3. Move Z and collide
    this.position.z += this.velocity.z * dt;
    this.collideZ(world);
  }

  private isSolidBlock(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const block = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    const def = BLOCK_DEFS[block];
    return def ? def.solid : false;
  }

  private collideY(world: VoxelWorld) {
    const halfW = this.playerWidth / 2;
    const minX = Math.floor(this.position.x - halfW + 0.001);
    const maxX = Math.floor(this.position.x + halfW - 0.001);
    const minZ = Math.floor(this.position.z - halfW + 0.001);
    const maxZ = Math.floor(this.position.z + halfW - 0.001);

    this.isGrounded = false;

    if (this.velocity.y <= 0) {
      const checkY = Math.floor(this.position.y);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, checkY, z)) {
            this.position.y = checkY + 1.0;
            this.velocity.y = 0;
            this.isGrounded = true;
            return;
          }
        }
      }
    } else {
      const checkY = Math.floor(this.position.y + this.playerHeight);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, checkY, z)) {
            this.position.y = checkY - this.playerHeight - 0.001;
            this.velocity.y = 0;
            return;
          }
        }
      }
    }
  }

  private collideX(world: VoxelWorld) {
    const halfW = this.playerWidth / 2;
    const minY = Math.floor(this.position.y + 0.01);
    const maxY = Math.floor(this.position.y + this.playerHeight - 0.01);
    const minZ = Math.floor(this.position.z - halfW + 0.001);
    const maxZ = Math.floor(this.position.z + halfW - 0.001);

    if (this.velocity.x > 0) {
      const checkX = Math.floor(this.position.x + halfW);
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, checkX, y, z)) {
            // Auto step-up check (ensure headroom above step and player)
            const stepTop = y + 1;
            if (
              y === minY &&
              stepTop - this.position.y <= 1.05 &&
              !this.isSolidBlock(world, checkX, y + 1, z) &&
              !this.isSolidBlock(world, checkX, y + 2, z) &&
              !this.isSolidBlock(world, Math.floor(this.position.x), y + 1, z) &&
              !this.isSolidBlock(world, Math.floor(this.position.x), y + 2, z)
            ) {
              this.position.y = stepTop;
              return;
            }
            this.position.x = checkX - halfW - 0.001;
            this.velocity.x = 0;
            return;
          }
        }
      }
    } else if (this.velocity.x < 0) {
      const checkX = Math.floor(this.position.x - halfW);
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, checkX, y, z)) {
            const stepTop = y + 1;
            if (
              y === minY &&
              stepTop - this.position.y <= 1.05 &&
              !this.isSolidBlock(world, checkX, y + 1, z) &&
              !this.isSolidBlock(world, checkX, y + 2, z) &&
              !this.isSolidBlock(world, Math.floor(this.position.x), y + 1, z) &&
              !this.isSolidBlock(world, Math.floor(this.position.x), y + 2, z)
            ) {
              this.position.y = stepTop;
              return;
            }
            this.position.x = checkX + halfW + 0.001;
            this.velocity.x = 0;
            return;
          }
        }
      }
    }
  }

  private collideZ(world: VoxelWorld) {
    const halfW = this.playerWidth / 2;
    const minY = Math.floor(this.position.y + 0.01);
    const maxY = Math.floor(this.position.y + this.playerHeight - 0.01);
    const minX = Math.floor(this.position.x - halfW + 0.001);
    const maxX = Math.floor(this.position.x + halfW - 0.001);

    if (this.velocity.z > 0) {
      const checkZ = Math.floor(this.position.z + halfW);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.isSolidBlock(world, x, y, checkZ)) {
            const stepTop = y + 1;
            if (
              y === minY &&
              stepTop - this.position.y <= 1.05 &&
              !this.isSolidBlock(world, x, y + 1, checkZ) &&
              !this.isSolidBlock(world, x, y + 2, checkZ) &&
              !this.isSolidBlock(world, x, y + 1, Math.floor(this.position.z)) &&
              !this.isSolidBlock(world, x, y + 2, Math.floor(this.position.z))
            ) {
              this.position.y = stepTop;
              return;
            }
            this.position.z = checkZ - halfW - 0.001;
            this.velocity.z = 0;
            return;
          }
        }
      }
    } else if (this.velocity.z < 0) {
      const checkZ = Math.floor(this.position.z - halfW);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (this.isSolidBlock(world, x, y, checkZ)) {
            const stepTop = y + 1;
            if (
              y === minY &&
              stepTop - this.position.y <= 1.05 &&
              !this.isSolidBlock(world, x, y + 1, checkZ) &&
              !this.isSolidBlock(world, x, y + 2, checkZ) &&
              !this.isSolidBlock(world, x, y + 1, Math.floor(this.position.z)) &&
              !this.isSolidBlock(world, x, y + 2, Math.floor(this.position.z))
            ) {
              this.position.y = stepTop;
              return;
            }
            this.position.z = checkZ + halfW + 0.001;
            this.velocity.z = 0;
            return;
          }
        }
      }
    }
  }
}
