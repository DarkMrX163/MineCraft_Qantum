import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockType } from '../constants';
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
  public lastAttackTime = 0;
  private walkTime = 0;

  constructor(type: 'ZOMBIE' | 'SKELETON', startPos: THREE.Vector3) {
    this.type = type;
    this.position = startPos.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const materials = this.createMobMaterials(type);

    // Head (0.5 x 0.5 x 0.5)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMesh = new THREE.Mesh(headGeo, materials.headMats);
    headMesh.position.set(0, 1.45, 0);
    this.mesh.add(headMesh);

    // Torso (0.5 x 0.75 x 0.25)
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    const bodyMesh = new THREE.Mesh(bodyGeo, materials.bodyMat);
    bodyMesh.position.set(0, 0.825, 0);
    this.mesh.add(bodyMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const lArm = new THREE.Mesh(armGeo, materials.skinMat);
    lArm.position.set(-0.36, 0.825, 0.25);
    lArm.rotation.x = -Math.PI / 2.2; // Arms stretched forward
    this.mesh.add(lArm);

    const rArm = new THREE.Mesh(armGeo, materials.skinMat);
    rArm.position.set(0.36, 0.825, 0.25);
    rArm.rotation.x = -Math.PI / 2.2;
    this.mesh.add(rArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const lLeg = new THREE.Mesh(legGeo, materials.legMat);
    lLeg.position.set(-0.13, 0.375, 0);
    this.mesh.add(lLeg);

    const rLeg = new THREE.Mesh(legGeo, materials.legMat);
    rLeg.position.set(0.13, 0.375, 0);
    this.mesh.add(rLeg);
  }

  private createMobMaterials(type: 'ZOMBIE' | 'SKELETON') {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    if (type === 'ZOMBIE') {
      // Zombie Face Texture
      ctx.fillStyle = '#2e6b27';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#1c4518';
      ctx.fillRect(0, 0, 16, 5); // Hair
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(3, 7, 3, 2); // Dark eyes
      ctx.fillRect(10, 7, 3, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(4, 7, 1, 1);
      ctx.fillRect(11, 7, 1, 1);
      ctx.fillStyle = '#143011';
      ctx.fillRect(5, 11, 6, 2); // Mouth

      const faceTex = new THREE.CanvasTexture(canvas);
      faceTex.magFilter = THREE.NearestFilter;
      faceTex.colorSpace = THREE.SRGBColorSpace;

      const skinMat = new THREE.MeshLambertMaterial({ color: 0x38761d });
      const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a }); // Blue shirt
      const legMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Dark pants

      return {
        skinMat,
        bodyMat,
        legMat,
        headMats: [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat],
      };
    } else {
      // Skeleton Skull Texture
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#111827';
      ctx.fillRect(2, 6, 4, 4); // Eye sockets
      ctx.fillRect(10, 6, 4, 4);
      ctx.fillRect(7, 10, 2, 2); // Nose
      ctx.fillStyle = '#374151';
      ctx.fillRect(4, 13, 8, 2); // Teeth

      const skullTex = new THREE.CanvasTexture(canvas);
      skullTex.magFilter = THREE.NearestFilter;
      skullTex.colorSpace = THREE.SRGBColorSpace;

      const boneMat = new THREE.MeshLambertMaterial({ color: 0xe5e7eb });
      const faceMat = new THREE.MeshLambertMaterial({ map: skullTex });
      const ribMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });

      return {
        skinMat: boneMat,
        bodyMat: ribMat,
        legMat: boneMat,
        headMats: [boneMat, boneMat, boneMat, boneMat, faceMat, boneMat],
      };
    }
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    // Move towards player smoothly
    const dir = new THREE.Vector3().subVectors(playerPos, this.position);
    dir.y = 0;
    const distSq = dir.lengthSq();

    if (distSq > 0.4 && distSq < 400) {
      dir.normalize();
      this.position.addScaledVector(dir, dt * 1.8);
      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

      this.walkTime += dt * 6;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.walkTime)) * 0.08;
    }
  }
}

export class WorldEventManager {
  public activeEvent: WorldEvent | null = null;
  public eventTimeRemaining = 0;
  public mobs: MobEntity[] = [];
  private scene: THREE.Scene;
  private world: VoxelWorld;

  constructor(scene: THREE.Scene, world: VoxelWorld) {
    this.scene = scene;
    this.world = world;
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
    // Clean existing mobs
    this.mobs.forEach((m) => this.scene.remove(m.mesh));
    this.mobs = [];

    // Spawn 3 Mobs around player
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const spawnX = playerPos.x + Math.cos(angle) * 10;
      const spawnZ = playerPos.z + Math.sin(angle) * 10;
      const spawnY = this.world.getBlock(spawnX, playerPos.y, spawnZ) ? playerPos.y + 1 : playerPos.y;

      const mob = new MobEntity(i % 2 === 0 ? 'ZOMBIE' : 'SKELETON', new THREE.Vector3(spawnX, spawnY, spawnZ));
      this.mobs.push(mob);
      this.scene.add(mob.mesh);
    }
  }

  private spawnMeteorShower(playerPos: THREE.Vector3) {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const mx = playerPos.x + (Math.random() - 0.5) * 18;
        const mz = playerPos.z + (Math.random() - 0.5) * 18;
        const my = playerPos.y;

        this.world.setBlock(mx, my, mz, BlockType.OBSIDIAN);
        this.world.setBlock(mx + 1, my, mz, BlockType.GLOWSTONE);
        this.world.setBlock(mx, my, mz + 1, BlockType.DIAMOND_ORE);

        SoundEffects.getInstance().playBreakSound();
      }, i * 1500);
    }
  }

  private spawnTreasureDrop(playerPos: THREE.Vector3) {
    const tx = Math.floor(playerPos.x + 3);
    const ty = Math.floor(playerPos.y);
    const tz = Math.floor(playerPos.z + 3);

    this.world.setBlock(tx, ty, tz, BlockType.CHEST);
    SoundEffects.getInstance().playPlaceSound();
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    if (this.eventTimeRemaining > 0) {
      this.eventTimeRemaining -= dt;
      if (this.eventTimeRemaining <= 0) {
        this.activeEvent = null;
        this.mobs.forEach((m) => this.scene.remove(m.mesh));
        this.mobs = [];
      }
    }

    this.mobs.forEach((mob) => mob.update(dt, playerPos));
  }

  public attackMobWithRay(camPos: THREE.Vector3, camDir: THREE.Vector3, maxDist = 5.5): boolean {
    let closestMobIdx = -1;
    let minMobDist = maxDist;

    for (let i = 0; i < this.mobs.length; i++) {
      const mob = this.mobs[i];
      // Mob center position (chest height)
      const mobCenter = mob.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      const toMob = mobCenter.clone().sub(camPos);

      // Proj distance along ray direction
      const projDist = toMob.dot(camDir);
      if (projDist > 0 && projDist < minMobDist) {
        // Perpendicular distance squared from camera ray line
        const perpDistSq = toMob.lengthSq() - projDist * projDist;
        // Hit radius 0.9m
        if (perpDistSq <= 0.81) {
          minMobDist = projDist;
          closestMobIdx = i;
        }
      }
    }

    if (closestMobIdx !== -1) {
      const mob = this.mobs[closestMobIdx];
      mob.health -= 10;

      // Apply hit knockback away from player
      const kbDir = camDir.clone();
      kbDir.y = 0.15;
      kbDir.normalize();
      mob.position.addScaledVector(kbDir, 0.8);
      mob.mesh.position.copy(mob.position);

      SoundEffects.getInstance().playBreakSound();

      if (mob.health <= 0) {
        this.scene.remove(mob.mesh);
        this.mobs.splice(closestMobIdx, 1);
        SoundEffects.getInstance().playPopSound();
      }
      return true;
    }

    return false;
  }
}
