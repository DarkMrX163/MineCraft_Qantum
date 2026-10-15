import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockType, ItemType } from '../constants';
import { SoundEffects } from '../audio/SoundEffects';

export interface WorldEvent {
  id: string;
  title: string;
  desc: string;
  duration: number; // seconds
}

export class MobEntity {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public health = 20;
  public type: 'ZOMBIE' | 'SKELETON';
  private walkTime = 0;

  constructor(type: 'ZOMBIE' | 'SKELETON', startPos: THREE.Vector3) {
    this.type = type;
    this.position = startPos.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const skinColor = type === 'ZOMBIE' ? 0x228b22 : 0xcccccc;
    const bodyColor = type === 'ZOMBIE' ? 0x1e3a8a : 0x888888;

    const skinMat = new THREE.MeshLambertMaterial({ color: skinColor });
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 1.45, 0);
    this.mesh.add(headMesh);

    // Torso
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0.825, 0);
    this.mesh.add(bodyMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const lArm = new THREE.Mesh(armGeo, skinMat);
    lArm.position.set(-0.36, 0.825, 0.25);
    lArm.rotation.x = -Math.PI / 2; // Arms stretched forward!
    this.mesh.add(lArm);

    const rArm = new THREE.Mesh(armGeo, skinMat);
    rArm.position.set(0.36, 0.825, 0.25);
    rArm.rotation.x = -Math.PI / 2;
    this.mesh.add(rArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const lLeg = new THREE.Mesh(legGeo, bodyMat);
    lLeg.position.set(-0.13, 0.375, 0);
    this.mesh.add(lLeg);

    const rLeg = new THREE.Mesh(legGeo, bodyMat);
    rLeg.position.set(0.13, 0.375, 0);
    this.mesh.add(rLeg);
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    // Move towards player
    const dir = new THREE.Vector3().subVectors(playerPos, this.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.5) {
      dir.normalize();
      this.position.addScaledVector(dir, dt * 2.5);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

      this.walkTime += dt * 8;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.walkTime)) * 0.1;
    }
  }
}

export class WorldEventManager {
  public activeEvent: WorldEvent | null = null;
  public eventTimeRemaining = 0;
  public mobs: MobEntity[] = [];
  private scene: THREE.Scene;
  private world: VoxelWorld;
  private particleGroup = new THREE.Group();

  constructor(scene: THREE.Scene, world: VoxelWorld) {
    this.scene = scene;
    this.world = world;
    this.scene.add(this.particleGroup);
  }

  public triggerEvent(event: WorldEvent, playerPos: THREE.Vector3) {
    this.activeEvent = event;
    this.eventTimeRemaining = event.duration;
    SoundEffects.getInstance().playPopSound();

    if (event.id === 'MOB_INVASION') {
      this.spawnMobInvasion(playerPos);
    } else if (event.id === 'METEOR_SHOWER') {
      this.spawnMeteorShower(playerPos);
    } else if (event.id === 'TREASURE_DROP') {
      this.spawnTreasureDrop(playerPos);
    }
  }

  private spawnMobInvasion(playerPos: THREE.Vector3) {
    // Spawn 4 Hostile Mobs around player
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const spawnX = playerPos.x + Math.cos(angle) * 12;
      const spawnZ = playerPos.z + Math.sin(angle) * 12;
      const spawnY = this.world.getBlock(spawnX, playerPos.y, spawnZ) ? playerPos.y + 1 : playerPos.y;

      const mob = new MobEntity(i % 2 === 0 ? 'ZOMBIE' : 'SKELETON', new THREE.Vector3(spawnX, spawnY, spawnZ));
      this.mobs.push(mob);
      this.scene.add(mob.mesh);
    }
  }

  private spawnMeteorShower(playerPos: THREE.Vector3) {
    // Spawn falling meteor impact craters
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const mx = playerPos.x + (Math.random() - 0.5) * 20;
        const mz = playerPos.z + (Math.random() - 0.5) * 20;
        const my = playerPos.y;

        // Create meteor crater with Obsidian & Glowstone!
        this.world.setBlock(mx, my, mz, BlockType.OBSIDIAN);
        this.world.setBlock(mx + 1, my, mz, BlockType.GLOWSTONE);
        this.world.setBlock(mx, my, mz + 1, BlockType.DIAMOND_ORE);

        SoundEffects.getInstance().playBreakSound('stone');
      }, i * 1500);
    }
  }

  private spawnTreasureDrop(playerPos: THREE.Vector3) {
    const tx = Math.floor(playerPos.x + 3);
    const ty = Math.floor(playerPos.y);
    const tz = Math.floor(playerPos.z + 3);

    this.world.setBlock(tx, ty, tz, BlockType.CHEST);
    SoundEffects.getInstance().playPlaceSound('wood');
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    if (this.eventTimeRemaining > 0) {
      this.eventTimeRemaining -= dt;
      if (this.eventTimeRemaining <= 0) {
        this.activeEvent = null;
        // Clean up mobs
        this.mobs.forEach((m) => this.scene.remove(m.mesh));
        this.mobs = [];
      }
    }

    // Update active Mobs
    this.mobs.forEach((mob) => mob.update(dt, playerPos));
  }

  public attackMobAt(pos: THREE.Vector3): boolean {
    for (let i = 0; i < this.mobs.length; i++) {
      const mob = this.mobs[i];
      if (mob.position.distanceTo(pos) < 2.5) {
        mob.health -= 10;
        SoundEffects.getInstance().playBreakSound('dirt');
        if (mob.health <= 0) {
          this.scene.remove(mob.mesh);
          this.mobs.splice(i, 1);
          SoundEffects.getInstance().playPopSound();
        }
        return true;
      }
    }
    return false;
  }
}
