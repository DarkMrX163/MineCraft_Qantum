import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockType, ItemType, BLOCK_DEFS } from '../constants';
import { TextureManager } from '../textures/TextureAtlas';
import { SoundEffects } from '../audio/SoundEffects';

export interface ItemStack {
  itemId: number;
  count: number;
}

export class DroppedItemEntity {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public item: ItemStack;
  public isGrounded = false;
  public lifeTime = 0;
  public isPickedUp = false;

  private floatOffset = Math.random() * Math.PI * 2;
  private innerMesh: THREE.Mesh;

  constructor(item: ItemStack, startPos: THREE.Vector3) {
    this.item = { ...item };
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2.5,
      Math.random() * 3.5 + 2.0,
      (Math.random() - 0.5) * 2.5
    );

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Build miniature 3D rotating drop representation
    const texManager = TextureManager.getInstance();
    const isBlock = item.itemId in BLOCK_DEFS && item.itemId !== BlockType.AIR;

    if (isBlock) {
      const geo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
      const mats = texManager.getBlockMaterials(item.itemId as BlockType);
      this.innerMesh = new THREE.Mesh(geo, mats);
    } else {
      // Flat item sprite box or small sphere
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.05);
      const iconUrl = texManager.getIconDataUrl(item.itemId);
      const canvasTex = iconUrl ? new THREE.CanvasTexture(Object.assign(document.createElement('img'), { src: iconUrl })) : null;
      
      const mat = new THREE.MeshLambertMaterial({
        color: item.itemId === ItemType.DIAMOND ? 0x38bdf8 : item.itemId === ItemType.IRON_INGOT ? 0xe2e8f0 : 0xf59e0b,
      });
      this.innerMesh = new THREE.Mesh(geo, mat);
    }

    this.innerMesh.castShadow = true;
    this.mesh.add(this.innerMesh);
  }

  public update(dt: number, world: VoxelWorld, playerPos: THREE.Vector3, onPickup: (item: ItemStack) => boolean) {
    if (this.isPickedUp) return;

    this.lifeTime += dt;

    // Apply gravity if not grounded
    if (!this.isGrounded) {
      this.velocity.y -= 18.0 * dt;
      this.position.addScaledVector(this.velocity, dt);

      // Check ground collision
      const checkX = Math.floor(this.position.x);
      const checkY = Math.floor(this.position.y);
      const checkZ = Math.floor(this.position.z);

      const blockBelow = world.getBlock(checkX, checkY, checkZ);
      const def = BLOCK_DEFS[blockBelow];

      if (def && def.solid) {
        this.position.y = checkY + 1.0;
        this.velocity.set(0, 0, 0);
        this.isGrounded = true;
      }
    } else {
      // Floating animation when sitting on ground
      this.innerMesh.position.y = Math.sin(this.lifeTime * 4 + this.floatOffset) * 0.08 + 0.15;
    }

    // Spin mesh
    this.innerMesh.rotation.y += dt * 2.8;

    // Check player proximity & magnet pickup
    const distToPlayer = this.position.distanceTo(playerPos);

    if (distToPlayer < 2.8 && this.lifeTime > 0.4) {
      // Magnetically pull toward player feet/center
      const pullTarget = playerPos.clone().add(new THREE.Vector3(0, 0.8, 0));
      const pullDir = pullTarget.sub(this.position).normalize();
      const pullSpeed = Math.max(6.0, (3.0 - distToPlayer) * 8.0);
      this.position.addScaledVector(pullDir, dt * pullSpeed);

      if (distToPlayer < 0.95) {
        const added = onPickup(this.item);
        if (added) {
          this.isPickedUp = true;
          SoundEffects.getInstance().playPopSound();
        }
      }
    }

    this.mesh.position.copy(this.position);
  }
}

export class DroppedItemManager {
  public items: DroppedItemEntity[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnDrop(itemId: number, count: number, position: THREE.Vector3) {
    if (itemId === BlockType.AIR) return;
    const drop = new DroppedItemEntity({ itemId, count }, position);
    this.items.push(drop);
    this.scene.add(drop.mesh);
  }

  public spawnMobLoot(mobType: string, position: THREE.Vector3) {
    const pos = position.clone().add(new THREE.Vector3(0, 0.5, 0));

    if (mobType === 'ZOMBIE') {
      this.spawnDrop(ItemType.RAW_MEAT, Math.floor(Math.random() * 2) + 1, pos);
      if (Math.random() < 0.3) this.spawnDrop(ItemType.COAL, 1, pos);
    } else if (mobType === 'SKELETON') {
      this.spawnDrop(ItemType.BONE, Math.floor(Math.random() * 2) + 1, pos);
      if (Math.random() < 0.25) this.spawnDrop(ItemType.STICK, 2, pos);
    } else if (mobType === 'CREEPER') {
      this.spawnDrop(BlockType.TNT, 1, pos);
    } else if (mobType === 'COW') {
      this.spawnDrop(ItemType.RAW_MEAT, Math.floor(Math.random() * 3) + 1, pos);
    } else if (mobType === 'PIG') {
      this.spawnDrop(ItemType.RAW_MEAT, Math.floor(Math.random() * 2) + 1, pos);
    } else if (mobType === 'SHEEP') {
      this.spawnDrop(BlockType.GRASS, 1, pos);
      this.spawnDrop(ItemType.RAW_MEAT, 1, pos);
    } else if (mobType === 'ENDERMAN') {
      this.spawnDrop(ItemType.DIAMOND, 1, pos);
    } else {
      this.spawnDrop(ItemType.BONE, 1, pos);
    }
  }

  public update(dt: number, world: VoxelWorld, playerPos: THREE.Vector3, onPickup: (item: ItemStack) => boolean) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(dt, world, playerPos, onPickup);

      if (item.isPickedUp || item.lifeTime > 300) { // Despawn after 5 mins or pickup
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }
}
