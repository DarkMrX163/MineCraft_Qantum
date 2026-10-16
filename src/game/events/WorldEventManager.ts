import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BLOCK_DEFS, BlockType } from '../constants';
import { SoundEffects } from '../audio/SoundEffects';
import { PlayerStats } from '../player/PlayerStats';
import { DroppedItemManager } from '../entities/DroppedItemEntity';

export type MobType =
  | 'ZOMBIE'
  | 'SKELETON'
  | 'CREEPER'
  | 'ENDERMAN'
  | 'SPIDER'
  | 'COW'
  | 'PIG'
  | 'SHEEP'
  | 'WOLF';

export interface WorldEvent {
  id: string;
  title: string;
  desc: string;
  duration: number; // seconds
}

export class MobEntity {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity = new THREE.Vector3(0, 0, 0);
  public health: number;
  public maxHealth: number;
  public type: MobType;
  public isHostile: boolean;
  public moveSpeed: number;
  public isGrounded = false;
  public width = 0.6;
  public height = 1.8;

  public headMesh?: THREE.Mesh;
  public lArm?: THREE.Mesh;
  public rArm?: THREE.Mesh;
  public lLeg?: THREE.Mesh;
  public rLeg?: THREE.Mesh;
  public extraLegs: THREE.Mesh[] = [];

  private walkTime = 0;
  private wanderTimer = 0;
  private wanderDir = new THREE.Vector3();
  private fleeTimer = 0;
  public fuseTimer = 0;

  constructor(type: MobType, startPos: THREE.Vector3) {
    this.type = type;
    this.position = startPos.clone();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.isHostile = ['ZOMBIE', 'SKELETON', 'CREEPER', 'ENDERMAN', 'SPIDER'].includes(type);
    this.maxHealth = type === 'ENDERMAN' ? 30 : type === 'SPIDER' ? 16 : type === 'CREEPER' ? 20 : 18;
    this.health = this.maxHealth;
    this.moveSpeed = type === 'ENDERMAN' ? 2.6 : type === 'SPIDER' ? 2.2 : type === 'CREEPER' ? 1.6 : 1.8;

    this.width = type === 'SPIDER' ? 0.9 : ['COW', 'PIG', 'SHEEP', 'WOLF'].includes(type) ? 0.75 : 0.6;
    this.height = type === 'ENDERMAN' ? 2.4 : type === 'SPIDER' ? 0.8 : ['COW', 'PIG', 'SHEEP', 'WOLF'].includes(type) ? 1.2 : 1.8;

    this.buildModel();
  }

  private createTextureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  private createMobMaterials(type: MobType) {
    const { canvas, ctx } = this.createTextureCanvas();

    if (type === 'ZOMBIE') {
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

      return { skinMat, bodyMat, legMat, headMats: [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat] };
    } else if (type === 'SKELETON') {
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

      return { skinMat: boneMat, bodyMat: ribMat, legMat: boneMat, headMats: [boneMat, boneMat, boneMat, boneMat, faceMat, boneMat] };
    } else if (type === 'CREEPER') {
      // Creeper Pixel Face
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#15803d';
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 7 + y * 13) % 5 === 0) ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(2, 4, 4, 4); // Eyes
      ctx.fillRect(10, 4, 4, 4);
      ctx.fillRect(6, 8, 4, 6); // Nose/Mouth
      ctx.fillRect(4, 10, 2, 6);
      ctx.fillRect(10, 10, 2, 6);

      const creeperTex = new THREE.CanvasTexture(canvas);
      creeperTex.magFilter = THREE.NearestFilter;
      creeperTex.colorSpace = THREE.SRGBColorSpace;

      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
      const faceMat = new THREE.MeshLambertMaterial({ map: creeperTex });

      return { skinMat: bodyMat, bodyMat, legMat: bodyMat, headMats: [bodyMat, bodyMat, bodyMat, bodyMat, faceMat, bodyMat] };
    } else if (type === 'ENDERMAN') {
      // Enderman Black & Glowing Eyes
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(2, 8, 5, 2); // Glowing Purple Eyes
      ctx.fillRect(9, 8, 5, 2);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(4, 8, 2, 2);
      ctx.fillRect(11, 8, 2, 2);

      const enderTex = new THREE.CanvasTexture(canvas);
      enderTex.magFilter = THREE.NearestFilter;
      enderTex.colorSpace = THREE.SRGBColorSpace;

      const blackMat = new THREE.MeshLambertMaterial({ color: 0x111115 });
      const faceMat = new THREE.MeshLambertMaterial({ map: enderTex });

      return { skinMat: blackMat, bodyMat: blackMat, legMat: blackMat, headMats: [blackMat, blackMat, blackMat, blackMat, faceMat, blackMat] };
    } else if (type === 'SPIDER') {
      // Spider Dark & 8 Red Eyes
      ctx.fillStyle = '#262626';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#dc2626';
      // 8 Eyes
      ctx.fillRect(3, 7, 2, 2);
      ctx.fillRect(6, 7, 2, 2);
      ctx.fillRect(9, 7, 2, 2);
      ctx.fillRect(12, 7, 2, 2);
      ctx.fillRect(4, 10, 2, 2);
      ctx.fillRect(10, 10, 2, 2);

      const spiderTex = new THREE.CanvasTexture(canvas);
      spiderTex.magFilter = THREE.NearestFilter;
      spiderTex.colorSpace = THREE.SRGBColorSpace;

      const spiderBodyMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
      const faceMat = new THREE.MeshLambertMaterial({ map: spiderTex });

      return { skinMat: spiderBodyMat, bodyMat: spiderBodyMat, legMat: spiderBodyMat, headMats: [spiderBodyMat, spiderBodyMat, spiderBodyMat, spiderBodyMat, faceMat, spiderBodyMat] };
    } else if (type === 'COW') {
      // Cow Brown/White
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 2, 5, 5);
      ctx.fillRect(9, 8, 6, 6);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(4, 11, 8, 4); // Snout

      const cowTex = new THREE.CanvasTexture(canvas);
      cowTex.magFilter = THREE.NearestFilter;
      cowTex.colorSpace = THREE.SRGBColorSpace;

      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x5b21b6 }); // Brown
      const skinMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const faceMat = new THREE.MeshLambertMaterial({ map: cowTex });

      return { skinMat, bodyMat: skinMat, legMat: skinMat, headMats: [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat] };
    } else if (type === 'PIG') {
      // Pig Pink
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#111827';
      ctx.fillRect(2, 6, 2, 2); // Eyes
      ctx.fillRect(12, 6, 2, 2);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(5, 9, 6, 4); // Snout

      const pigTex = new THREE.CanvasTexture(canvas);
      pigTex.magFilter = THREE.NearestFilter;
      pigTex.colorSpace = THREE.SRGBColorSpace;

      const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
      const faceMat = new THREE.MeshLambertMaterial({ map: pigTex });

      return { skinMat: pinkMat, bodyMat: pinkMat, legMat: pinkMat, headMats: [pinkMat, pinkMat, pinkMat, pinkMat, faceMat, pinkMat] };
    } else if (type === 'SHEEP') {
      // Sheep Wool & Beige Face
      ctx.fillStyle = '#fde68a'; // Face
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#111827';
      ctx.fillRect(3, 7, 2, 2);
      ctx.fillRect(11, 7, 2, 2);

      const sheepFaceTex = new THREE.CanvasTexture(canvas);
      sheepFaceTex.magFilter = THREE.NearestFilter;
      sheepFaceTex.colorSpace = THREE.SRGBColorSpace;

      const woolMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
      const skinMat = new THREE.MeshLambertMaterial({ color: 0xfde68a });
      const faceMat = new THREE.MeshLambertMaterial({ map: sheepFaceTex });

      return { skinMat, bodyMat: woolMat, legMat: skinMat, headMats: [skinMat, skinMat, woolMat, skinMat, faceMat, skinMat] };
    } else {
      // Wolf Grey Fur
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#111827';
      ctx.fillRect(3, 6, 2, 2);
      ctx.fillRect(11, 6, 2, 2);
      ctx.fillRect(6, 10, 4, 3); // Snout

      const wolfTex = new THREE.CanvasTexture(canvas);
      wolfTex.magFilter = THREE.NearestFilter;
      wolfTex.colorSpace = THREE.SRGBColorSpace;

      const wolfMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
      const faceMat = new THREE.MeshLambertMaterial({ map: wolfTex });

      return { skinMat: wolfMat, bodyMat: wolfMat, legMat: wolfMat, headMats: [wolfMat, wolfMat, wolfMat, wolfMat, faceMat, wolfMat] };
    }
  }

  private buildModel() {
    const materials = this.createMobMaterials(this.type);

    if (this.type === 'ZOMBIE' || this.type === 'SKELETON') {
      // Humanoid Model
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      this.headMesh = new THREE.Mesh(headGeo, materials.headMats);
      this.headMesh.position.set(0, 1.45, 0);
      this.mesh.add(this.headMesh);

      const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
      const bodyMesh = new THREE.Mesh(bodyGeo, materials.bodyMat);
      bodyMesh.position.set(0, 0.825, 0);
      this.mesh.add(bodyMesh);

      const armGeo = new THREE.BoxGeometry(0.18, 0.75, 0.18);
      this.lArm = new THREE.Mesh(armGeo, materials.skinMat);
      this.lArm.position.set(-0.36, 0.825, 0.25);
      this.lArm.rotation.x = -Math.PI / 2.2;
      this.mesh.add(this.lArm);

      this.rArm = new THREE.Mesh(armGeo, materials.skinMat);
      this.rArm.position.set(0.36, 0.825, 0.25);
      this.rArm.rotation.x = -Math.PI / 2.2;
      this.mesh.add(this.rArm);

      // Skeleton Bow
      if (this.type === 'SKELETON') {
        const bowGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
        const bowMat = new THREE.MeshBasicMaterial({ color: 0x78350f });
        const bowMesh = new THREE.Mesh(bowGeo, bowMat);
        bowMesh.position.set(0, -0.2, 0.2);
        this.lArm.add(bowMesh);
      }

      const legGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
      this.lLeg = new THREE.Mesh(legGeo, materials.legMat);
      this.lLeg.position.set(-0.13, 0.375, 0);
      this.mesh.add(this.lLeg);

      this.rLeg = new THREE.Mesh(legGeo, materials.legMat);
      this.rLeg.position.set(0.13, 0.375, 0);
      this.mesh.add(this.rLeg);
    } else if (this.type === 'CREEPER') {
      // Creeper Model
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      this.headMesh = new THREE.Mesh(headGeo, materials.headMats);
      this.headMesh.position.set(0, 1.2, 0);
      this.mesh.add(this.headMesh);

      const bodyGeo = new THREE.BoxGeometry(0.4, 0.7, 0.3);
      const bodyMesh = new THREE.Mesh(bodyGeo, materials.bodyMat);
      bodyMesh.position.set(0, 0.6, 0);
      this.mesh.add(bodyMesh);

      const legGeo = new THREE.BoxGeometry(0.18, 0.3, 0.18);
      const legPositions = [
        [-0.13, 0.15, 0.13],
        [0.13, 0.15, 0.13],
        [-0.13, 0.15, -0.13],
        [0.13, 0.15, -0.13],
      ];
      legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, materials.legMat);
        leg.position.set(x, y, z);
        this.extraLegs.push(leg);
        this.mesh.add(leg);
      });
    } else if (this.type === 'ENDERMAN') {
      // Tall Enderman Model
      const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      this.headMesh = new THREE.Mesh(headGeo, materials.headMats);
      this.headMesh.position.set(0, 2.3, 0);
      this.mesh.add(this.headMesh);

      const bodyGeo = new THREE.BoxGeometry(0.35, 1.0, 0.2);
      const bodyMesh = new THREE.Mesh(bodyGeo, materials.bodyMat);
      bodyMesh.position.set(0, 1.5, 0);
      this.mesh.add(bodyMesh);

      const armGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12);
      this.lArm = new THREE.Mesh(armGeo, materials.skinMat);
      this.lArm.position.set(-0.26, 1.4, 0);
      this.mesh.add(this.lArm);

      this.rArm = new THREE.Mesh(armGeo, materials.skinMat);
      this.rArm.position.set(0.26, 1.4, 0);
      this.mesh.add(this.rArm);

      const legGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
      this.lLeg = new THREE.Mesh(legGeo, materials.legMat);
      this.lLeg.position.set(-0.11, 0.55, 0);
      this.mesh.add(this.lLeg);

      this.rLeg = new THREE.Mesh(legGeo, materials.legMat);
      this.rLeg.position.set(0.11, 0.55, 0);
      this.mesh.add(this.rLeg);
    } else if (this.type === 'SPIDER') {
      // Wide Spider Model
      const headGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
      this.headMesh = new THREE.Mesh(headGeo, materials.headMats);
      this.headMesh.position.set(0, 0.25, 0.3);
      this.mesh.add(this.headMesh);

      const abdomenGeo = new THREE.BoxGeometry(0.7, 0.55, 0.8);
      const abdomenMesh = new THREE.Mesh(abdomenGeo, materials.bodyMat);
      abdomenMesh.position.set(0, 0.35, -0.3);
      this.mesh.add(abdomenMesh);

      // 8 Jointed Legs
      const legGeo = new THREE.BoxGeometry(0.6, 0.08, 0.08);
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? 1 : -1;
        const zOffset = ((i % 4) - 1.5) * 0.2;
        const leg = new THREE.Mesh(legGeo, materials.legMat);
        leg.position.set(side * 0.4, 0.2, zOffset);
        leg.rotation.z = side * -0.3;
        this.extraLegs.push(leg);
        this.mesh.add(leg);
      }
    } else {
      // Quadruped Animals (Cow, Pig, Sheep, Wolf)
      const isCow = this.type === 'COW';
      const isPig = this.type === 'PIG';
      const isSheep = this.type === 'SHEEP';
      const isWolf = this.type === 'WOLF';

      const bodyW = isCow ? 0.75 : isSheep ? 0.8 : isPig ? 0.65 : 0.45;
      const bodyH = isCow ? 0.7 : isSheep ? 0.75 : isPig ? 0.55 : 0.45;
      const bodyL = isCow ? 1.1 : isSheep ? 1.1 : isPig ? 0.9 : 0.8;
      const bodyY = isCow ? 0.75 : isSheep ? 0.7 : isPig ? 0.6 : 0.55;

      const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyL);
      const bodyMesh = new THREE.Mesh(bodyGeo, materials.bodyMat);
      bodyMesh.position.set(0, bodyY, 0);
      this.mesh.add(bodyMesh);

      // Head
      const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      this.headMesh = new THREE.Mesh(headGeo, materials.headMats);
      const headY = bodyY + 0.25;
      const headZ = bodyL / 2 + 0.15;
      this.headMesh.position.set(0, headY, headZ);
      this.mesh.add(this.headMesh);

      // Snout box for Pig / Cow / Wolf
      if (isPig) {
        const snoutGeo = new THREE.BoxGeometry(0.2, 0.15, 0.12);
        const snoutMat = new THREE.MeshLambertMaterial({ color: 0xec4899 });
        const snoutMesh = new THREE.Mesh(snoutGeo, snoutMat);
        snoutMesh.position.set(0, -0.05, 0.25);
        this.headMesh.add(snoutMesh);
      } else if (isCow) {
        const hornGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const hornMat = new THREE.MeshLambertMaterial({ color: 0xfef08a });
        const lHorn = new THREE.Mesh(hornGeo, hornMat);
        lHorn.position.set(-0.25, 0.25, 0);
        const rHorn = new THREE.Mesh(hornGeo, hornMat);
        rHorn.position.set(0.25, 0.25, 0);
        this.headMesh.add(lHorn);
        this.headMesh.add(rHorn);
      } else if (isWolf) {
        const earGeo = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const earMat = new THREE.MeshLambertMaterial({ color: 0x4b5563 });
        const lEar = new THREE.Mesh(earGeo, earMat);
        lEar.position.set(-0.15, 0.25, -0.05);
        const rEar = new THREE.Mesh(earGeo, earMat);
        rEar.position.set(0.15, 0.25, -0.05);
        this.headMesh.add(lEar);
        this.headMesh.add(rEar);
      }

      // 4 Stout Legs
      const legH = isCow ? 0.5 : isSheep ? 0.45 : isPig ? 0.4 : 0.4;
      const legGeo = new THREE.BoxGeometry(0.18, legH, 0.18);
      const legPositions = [
        [-bodyW / 2 + 0.1, legH / 2, bodyL / 2 - 0.15],
        [bodyW / 2 - 0.1, legH / 2, bodyL / 2 - 0.15],
        [-bodyW / 2 + 0.1, legH / 2, -bodyL / 2 + 0.15],
        [bodyW / 2 - 0.1, legH / 2, -bodyL / 2 + 0.15],
      ];
      legPositions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, materials.legMat);
        leg.position.set(x, y, z);
        this.extraLegs.push(leg);
        this.mesh.add(leg);
      });
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, world?: VoxelWorld) {
    const clampedDt = Math.min(dt, 0.05);
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    let moveVector = new THREE.Vector3();

    if (this.isHostile) {
      if (dist < 22 && dist > 0.4) {
        moveVector.copy(toPlayer).normalize();
      }

      // Creeper Explosion Fuse
      if (this.type === 'CREEPER' && dist < 2.2) {
        this.fuseTimer += clampedDt;
        const pulse = 1.0 + Math.sin(this.fuseTimer * 20) * 0.2;
        this.mesh.scale.set(pulse, pulse, pulse);
      } else if (this.type === 'CREEPER') {
        this.fuseTimer = Math.max(0, this.fuseTimer - clampedDt);
        this.mesh.scale.set(1, 1, 1);
      }
    } else {
      // Passive Animals: Wander or Flee when hit
      this.fleeTimer = Math.max(0, this.fleeTimer - clampedDt);
      if (this.fleeTimer > 0) {
        // Run away from player
        moveVector.copy(toPlayer).multiplyScalar(-1).normalize();
      } else {
        // Random Wander
        this.wanderTimer -= clampedDt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 3 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          this.wanderDir.set(Math.cos(angle), 0, Math.sin(angle));
        }
        if (Math.random() < 0.6) {
          moveVector.copy(this.wanderDir);
        }
      }
    }

    const spd = this.fleeTimer > 0 ? this.moveSpeed * 1.5 : this.moveSpeed;

    if (world) {
      // Apply gravity
      this.velocity.y -= 26.0 * clampedDt;

      if (moveVector.lengthSq() > 0) {
        this.velocity.x = moveVector.x * spd;
        this.velocity.z = moveVector.z * spd;
        this.mesh.rotation.y = Math.atan2(moveVector.x, moveVector.z);
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      // Voxel AABB Movement & Collisions
      this.moveAndCollide(clampedDt, world);
    } else {
      if (moveVector.lengthSq() > 0) {
        this.position.addScaledVector(moveVector, clampedDt * spd);
        this.mesh.rotation.y = Math.atan2(moveVector.x, moveVector.z);
      }
    }

    this.mesh.position.copy(this.position);

    if (moveVector.lengthSq() > 0) {
      this.walkTime += clampedDt * 7;
      const swing = Math.sin(this.walkTime) * 0.45;

      // Animate legs
      if (this.lLeg && this.rLeg) {
        this.lLeg.rotation.x = swing;
        this.rLeg.rotation.x = -swing;
      }
      if (this.extraLegs.length === 4) {
        this.extraLegs[0].rotation.x = swing;
        this.extraLegs[1].rotation.x = -swing;
        this.extraLegs[2].rotation.x = -swing;
        this.extraLegs[3].rotation.x = swing;
      } else if (this.extraLegs.length === 8) {
        this.extraLegs.forEach((leg, idx) => {
          leg.rotation.x = Math.sin(this.walkTime + idx) * 0.3;
        });
      }
    }
  }

  private isSolidBlock(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const block = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    const def = BLOCK_DEFS[block];
    return def ? def.solid : false;
  }

  private moveAndCollide(dt: number, world: VoxelWorld) {
    this.position.y += this.velocity.y * dt;
    this.collideY(world);

    this.position.x += this.velocity.x * dt;
    this.collideX(world);

    this.position.z += this.velocity.z * dt;
    this.collideZ(world);
  }

  private collideY(world: VoxelWorld) {
    const halfW = this.width / 2;
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
      const checkY = Math.floor(this.position.y + this.height);
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, x, checkY, z)) {
            this.position.y = checkY - this.height - 0.001;
            this.velocity.y = 0;
            return;
          }
        }
      }
    }
  }

  private collideX(world: VoxelWorld) {
    const halfW = this.width / 2;
    const minY = Math.floor(this.position.y + 0.01);
    const maxY = Math.floor(this.position.y + this.height - 0.01);
    const minZ = Math.floor(this.position.z - halfW + 0.001);
    const maxZ = Math.floor(this.position.z + halfW - 0.001);

    if (this.velocity.x > 0) {
      const checkX = Math.floor(this.position.x + halfW);
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isSolidBlock(world, checkX, y, z)) {
            const stepTop = y + 1;
            if (
              y === minY &&
              stepTop - this.position.y <= 1.05 &&
              !this.isSolidBlock(world, checkX, y + 1, z)
            ) {
              this.position.y = stepTop;
              return;
            }
            if (this.isGrounded) {
              this.velocity.y = 7.5; // Jump obstacle!
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
              !this.isSolidBlock(world, checkX, y + 1, z)
            ) {
              this.position.y = stepTop;
              return;
            }
            if (this.isGrounded) {
              this.velocity.y = 7.5; // Jump obstacle!
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
    const halfW = this.width / 2;
    const minY = Math.floor(this.position.y + 0.01);
    const maxY = Math.floor(this.position.y + this.height - 0.01);
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
              !this.isSolidBlock(world, x, y + 1, checkZ)
            ) {
              this.position.y = stepTop;
              return;
            }
            if (this.isGrounded) {
              this.velocity.y = 7.5; // Jump obstacle!
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
              !this.isSolidBlock(world, x, y + 1, checkZ)
            ) {
              this.position.y = stepTop;
              return;
            }
            if (this.isGrounded) {
              this.velocity.y = 7.5; // Jump obstacle!
            }
            this.position.z = checkZ + halfW + 0.001;
            this.velocity.z = 0;
            return;
          }
        }
      }
    }
  }

  public onHit(playerPos: THREE.Vector3) {
    this.fleeTimer = 4.0;
  }
}

// Falling Meteor Entity with particle tail and explosion crater trigger
interface ActiveMeteor {
  mesh: THREE.Group;
  trailParticles: THREE.Mesh[];
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  velocity: THREE.Vector3;
  progress: number;
}

interface ExplosionParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class WorldEventManager {
  public activeEvent: WorldEvent | null = null;
  public eventTimeRemaining = 0;
  public mobs: MobEntity[] = [];
  private activeMeteors: ActiveMeteor[] = [];
  private explosionParticles: ExplosionParticle[] = [];

  private scene: THREE.Scene;
  private world: VoxelWorld;
  private ambientSpawnTimer = 0;

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
    // Clear existing event mobs
    this.mobs.forEach((m) => this.scene.remove(m.mesh));
    this.mobs = [];

    const invasionTypes: MobType[] = ['ZOMBIE', 'SKELETON', 'CREEPER', 'ENDERMAN', 'SPIDER'];

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spawnX = playerPos.x + Math.cos(angle) * 12;
      const spawnZ = playerPos.z + Math.sin(angle) * 12;
      const spawnY = Math.max(1, this.world.getBlock(spawnX, playerPos.y, spawnZ) ? playerPos.y + 1 : playerPos.y);

      const type = invasionTypes[i % invasionTypes.length];
      const mob = new MobEntity(type, new THREE.Vector3(spawnX, spawnY, spawnZ));
      this.mobs.push(mob);
      this.scene.add(mob.mesh);
    }
  }

  public spawnMeteorShower(playerPos: THREE.Vector3, stats?: PlayerStats) {
    // Launch a series of 5 meteors from high sky with physics and explosion
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = 5 + Math.random() * 22;

        const targetX = Math.floor(playerPos.x + Math.cos(offsetAngle) * offsetDist);
        const targetZ = Math.floor(playerPos.z + Math.sin(offsetAngle) * offsetDist);

        // Find terrain surface Y at impact target
        let surfaceY = Math.floor(playerPos.y);
        for (let checkY = Math.min(60, Math.floor(playerPos.y) + 15); checkY >= 2; checkY--) {
          if (this.world.getBlock(targetX, checkY, targetZ) !== BlockType.AIR) {
            surfaceY = checkY;
            break;
          }
        }

        const targetPos = new THREE.Vector3(targetX, surfaceY, targetZ);
        const startPos = new THREE.Vector3(
          targetX + (Math.random() - 0.5) * 30 + 15,
          surfaceY + 50 + Math.random() * 15,
          targetZ + (Math.random() - 0.5) * 30 + 15
        );

        this.createFallingMeteor(startPos, targetPos, stats);
      }, i * 1600);
    }
  }

  private createFallingMeteor(startPos: THREE.Vector3, targetPos: THREE.Vector3, stats?: PlayerStats) {
    const meteorGroup = new THREE.Group();

    // Burning glowing core
    const coreGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    meteorGroup.add(coreMesh);

    // Fiery outer shell blocks
    const shellGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const shellMat = new THREE.MeshLambertMaterial({ color: 0x111115 });
    for (let j = 0; j < 6; j++) {
      const rock = new THREE.Mesh(shellGeo, shellMat);
      rock.position.set(
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6
      );
      meteorGroup.add(rock);
    }

    meteorGroup.position.copy(startPos);
    this.scene.add(meteorGroup);

    const velocity = targetPos.clone().sub(startPos).normalize().multiplyScalar(42.0); // 42 units/sec speed

    this.activeMeteors.push({
      mesh: meteorGroup,
      trailParticles: [],
      startPos,
      targetPos,
      currentPos: startPos.clone(),
      velocity,
      progress: 0,
    });
  }

  private createExplosionEffectsAndCrater(impactPos: THREE.Vector3, stats?: PlayerStats) {
    const cx = Math.floor(impactPos.x);
    const cy = Math.floor(impactPos.y);
    const cz = Math.floor(impactPos.z);

    // 1. Play Heavy Explosion Sound & Screen Shake
    SoundEffects.getInstance().playExplosionSound();
    if (stats) {
      stats.screenShakeTimer = 0.7;
      stats.damageFlashTimer = 0.35;
    }

    // 2. Spawn 45 Fiery Explosion Particles (embers, smoke, fire)
    const particleGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const fireColors = [0xff4500, 0xff8c00, 0xffd700, 0x333333, 0x111111];

    for (let i = 0; i < 45; i++) {
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      const mat = new THREE.MeshBasicMaterial({ color });
      const pMesh = new THREE.Mesh(particleGeo, mat);

      pMesh.position.set(
        impactPos.x + (Math.random() - 0.5) * 1.5,
        impactPos.y + (Math.random() - 0.5) * 1.5,
        impactPos.z + (Math.random() - 0.5) * 1.5
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        Math.random() * 12 + 4,
        (Math.random() - 0.5) * 14
      );

      this.scene.add(pMesh);
      this.explosionParticles.push({
        mesh: pMesh,
        velocity: vel,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
      });
    }

    // 3. EXCAVATE SPHERICAL CRATER & PLACE METEORITE ORES / OBSIDIAN
    const craterRadius = 3.6;
    const rSq = craterRadius * craterRadius;

    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dz = -4; dz <= 4; dz++) {
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq <= rSq) {
            const bx = cx + dx;
            const by = cy + dy;
            const bz = cz + dz;

            if (by <= 1) continue; // Keep bedrock safe

            const existingBlock = this.world.getBlock(bx, by, bz);
            if (existingBlock === BlockType.BEDROCK) continue;

            const dist = Math.sqrt(distSq);

            if (dist < craterRadius - 0.9) {
              // Inner core: Hollow out air crater!
              this.world.setBlock(bx, by, bz, BlockType.AIR);
            } else {
              // Outer lining/bottom of crater: replace with obsidian, glowstone, ores & scorched ground
              const rand = Math.random();
              if (rand < 0.35) {
                this.world.setBlock(bx, by, bz, BlockType.OBSIDIAN);
              } else if (rand < 0.55) {
                this.world.setBlock(bx, by, bz, BlockType.GLOWSTONE);
              } else if (rand < 0.70) {
                this.world.setBlock(bx, by, bz, BlockType.DIAMOND_ORE);
              } else if (rand < 0.85) {
                this.world.setBlock(bx, by, bz, BlockType.GOLD_ORE);
              } else {
                this.world.setBlock(bx, by, bz, BlockType.COBBLESTONE);
              }
            }
          }
        }
      }
    }

    // Place central molten meteor core at crater bottom
    this.world.setBlock(cx, Math.max(2, cy - 2), cz, BlockType.OBSIDIAN);
    this.world.setBlock(cx, Math.max(3, cy - 1), cz, BlockType.GLOWSTONE);

    // 4. Damage player if close to crater explosion radius
    if (stats) {
      const distToPlayer = impactPos.distanceTo(stats ? stats as unknown as THREE.Vector3 : impactPos);
      if (distToPlayer < 5.5) {
        const dmg = Math.max(3, Math.floor((6.0 - distToPlayer) * 2.5));
        stats.takeDamage(dmg);
      }
    }
  }

  private spawnTreasureDrop(playerPos: THREE.Vector3) {
    const tx = Math.floor(playerPos.x + 3);
    const ty = Math.floor(playerPos.y);
    const tz = Math.floor(playerPos.z + 3);

    this.world.setBlock(tx, ty, tz, BlockType.CHEST);
    SoundEffects.getInstance().playPlaceSound();
  }

  public update(dt: number, playerPos: THREE.Vector3, isNight = false, stats?: PlayerStats) {
    if (this.eventTimeRemaining > 0) {
      this.eventTimeRemaining -= dt;
      if (this.eventTimeRemaining <= 0) {
        this.activeEvent = null;
      }
    }

    // Ambient Mob Spawning (keeps 6-8 mobs active in the world)
    this.ambientSpawnTimer += dt;
    if (this.ambientSpawnTimer > 8.0) {
      this.ambientSpawnTimer = 0;
      if (this.mobs.length < 8) {
        this.spawnAmbientMob(playerPos, isNight);
      }
    }

    this.mobs.forEach((mob) => mob.update(dt, playerPos, this.world));

    // Update active falling meteors
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const m = this.activeMeteors[i];
      m.currentPos.addScaledVector(m.velocity, dt);
      m.mesh.position.copy(m.currentPos);
      m.mesh.rotation.x += dt * 5;
      m.mesh.rotation.y += dt * 7;

      // Check ground collision / target reached
      if (
        m.currentPos.y <= m.targetPos.y ||
        m.currentPos.distanceTo(m.startPos) >= m.startPos.distanceTo(m.targetPos)
      ) {
        this.scene.remove(m.mesh);
        this.createExplosionEffectsAndCrater(m.targetPos, stats);
        this.activeMeteors.splice(i, 1);
      }
    }

    // Update explosion particles
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.explosionParticles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 16.0 * dt; // Gravity on particles
      p.mesh.position.addScaledVector(p.velocity, dt);

      const scale = Math.max(0.01, 1 - p.life / p.maxLife);
      p.mesh.scale.setScalar(scale);
    }
  }

  private spawnAmbientMob(playerPos: THREE.Vector3, isNight: boolean) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 10;
    const spawnX = Math.floor(playerPos.x + Math.cos(angle) * dist);
    const spawnZ = Math.floor(playerPos.z + Math.sin(angle) * dist);
    const spawnY = Math.max(2, Math.floor(playerPos.y));

    const monsters: MobType[] = ['ZOMBIE', 'SKELETON', 'CREEPER', 'ENDERMAN', 'SPIDER'];
    const animals: MobType[] = ['COW', 'PIG', 'SHEEP', 'WOLF'];

    let chosenType: MobType;
    if (isNight) {
      chosenType = Math.random() < 0.8 ? monsters[Math.floor(Math.random() * monsters.length)] : animals[Math.floor(Math.random() * animals.length)];
    } else {
      chosenType = Math.random() < 0.8 ? animals[Math.floor(Math.random() * animals.length)] : monsters[Math.floor(Math.random() * monsters.length)];
    }

    const mob = new MobEntity(chosenType, new THREE.Vector3(spawnX, spawnY, spawnZ));
    this.mobs.push(mob);
    this.scene.add(mob.mesh);
  }

  public attackMobWithRay(camPos: THREE.Vector3, camDir: THREE.Vector3, maxDist = 5.5, dropManager?: DroppedItemManager): boolean {
    let closestMobIdx = -1;
    let minMobDist = maxDist;

    for (let i = 0; i < this.mobs.length; i++) {
      const mob = this.mobs[i];
      const mobCenter = mob.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      const toMob = mobCenter.clone().sub(camPos);

      const projDist = toMob.dot(camDir);
      if (projDist > 0 && projDist < minMobDist) {
        const perpDistSq = toMob.lengthSq() - projDist * projDist;
        if (perpDistSq <= 0.9) {
          minMobDist = projDist;
          closestMobIdx = i;
        }
      }
    }

    if (closestMobIdx !== -1) {
      const mob = this.mobs[closestMobIdx];
      mob.health -= 8;
      mob.onHit(camPos);

      // Knockback
      const kbDir = camDir.clone();
      kbDir.y = 0.15;
      kbDir.normalize();
      mob.position.addScaledVector(kbDir, 0.7);
      mob.mesh.position.copy(mob.position);

      SoundEffects.getInstance().playBreakSound();

      if (mob.health <= 0) {
        if (dropManager) {
          dropManager.spawnMobLoot(mob.type, mob.position);
        }
        this.scene.remove(mob.mesh);
        this.mobs.splice(closestMobIdx, 1);
        SoundEffects.getInstance().playPopSound();
      }
      return true;
    }

    return false;
  }
}
