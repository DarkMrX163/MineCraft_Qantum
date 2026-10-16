import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BLOCK_DEFS } from '../constants';

export class PlayerPhysics {
  public position = new THREE.Vector3(0, 25, 0);
  public velocity = new THREE.Vector3(0, 0, 0);
  public isGrounded = false;
  public isFlying = false;

  public playerWidth = 0.6;
  public playerHeight = 1.8;

  private gravity = 28.0;
  private walkSpeed = 6.0;
  private flySpeed = 12.0;
  private jumpForce = 8.5;

  public update(
    dt: number,
    moveInput: { x: number; z: number }, // x: strafe, z: forward
    yaw: number, // Y-axis rotation in radians
    jumpRequested: boolean,
    sneakRequested: boolean,
    world: VoxelWorld
  ) {
    // Clamp frame delta time to prevent physics clipping
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

    const currentSpeed = this.isFlying ? this.flySpeed : (sneakRequested ? this.walkSpeed * 0.4 : this.walkSpeed);

    if (this.isFlying) {
      // 3D Flying Physics
      this.velocity.x = moveVector.x * currentSpeed;
      this.velocity.z = moveVector.z * currentSpeed;
      if (jumpRequested) {
        this.velocity.y = currentSpeed;
      } else if (sneakRequested) {
        this.velocity.y = -currentSpeed;
      } else {
        this.velocity.y = 0;
      }

      this.position.x += this.velocity.x * clampedDt;
      this.position.y += this.velocity.y * clampedDt;
      this.position.z += this.velocity.z * clampedDt;
      return;
    }

    // Walking / Gravity Physics
    this.velocity.x = moveVector.x * currentSpeed;
    this.velocity.z = moveVector.z * currentSpeed;

    // Apply gravity
    this.velocity.y -= this.gravity * clampedDt;

    // Jump
    if (jumpRequested && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Move and collide per axis (Y, X, Z) for smooth slide collision
    // 1. Move Y
    this.position.y += this.velocity.y * clampedDt;
    this.collideY(world);

    // 2. Move X
    this.position.x += this.velocity.x * clampedDt;
    this.collideX(world);

    // 3. Move Z
    this.position.z += this.velocity.z * clampedDt;
    this.collideZ(world);
  }

  private isSolidBlock(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const block = world.getBlock(x, y, z);
    const def = BLOCK_DEFS[block];
    return def ? def.solid : false;
  }

  private collideY(world: VoxelWorld) {
    const minX = Math.floor(this.position.x - this.playerWidth / 2);
    const maxX = Math.floor(this.position.x + this.playerWidth / 2);
    const minZ = Math.floor(this.position.z - this.playerWidth / 2);
    const maxZ = Math.floor(this.position.z + this.playerWidth / 2);

    this.isGrounded = false;

    if (this.velocity.y <= 0) {
      const checkY = Math.floor(this.position.y - 0.001);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, checkY, z)) {
            this.position.y = checkY + 1;
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
