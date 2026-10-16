import * as THREE from 'three';
import { BlockType, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_HEIGHT, CHUNK_RADIUS } from '../constants';
import { WorldGenerator } from './WorldGenerator';
import { ChunkMesh } from './ChunkMesh';

export interface RaycastResult {
  hitPoint: THREE.Vector3;
  blockPos: THREE.Vector3;
  faceNormal: THREE.Vector3;
  blockType: BlockType;
}

export class VoxelWorld {
  public sceneGroup: THREE.Group;
  private generator: WorldGenerator;
  private loadedChunks = new Map<string, { x: number; z: number; mesh: ChunkMesh }>();
  private modifiedBlocks = new Map<string, BlockType>(); // key: "x,y,z"

  constructor(seed = 42) {
    this.sceneGroup = new THREE.Group();
    this.generator = new WorldGenerator(seed);
  }

  public getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getBlockKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  // Get block type at world position (check modified blocks first, then procedural generator)
  public getBlock(x: number, y: number, z: number): BlockType {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    if (by < 0 || by >= CHUNK_HEIGHT) return BlockType.AIR;

    const key = this.getBlockKey(bx, by, bz);
    if (this.modifiedBlocks.has(key)) {
      return this.modifiedBlocks.get(key)!;
    }

    return this.generator.getBlockTypeAt(bx, by, bz);
  }

  // Set block and update chunk mesh instantly
  public setBlock(x: number, y: number, z: number, blockType: BlockType, notify = true) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    // Water + Lava -> Obsidian reaction check
    let finalBlock = blockType;
    if (blockType === BlockType.WATER) {
      const neighbors = [
        this.getBlock(bx + 1, by, bz),
        this.getBlock(bx - 1, by, bz),
        this.getBlock(bx, by + 1, bz),
        this.getBlock(bx, by - 1, bz),
        this.getBlock(bx, by, bz + 1),
        this.getBlock(bx, by, bz - 1),
      ];
      if (neighbors.includes(BlockType.LAVA)) {
        finalBlock = BlockType.OBSIDIAN;
      }
    } else if (blockType === BlockType.LAVA) {
      const neighbors = [
        this.getBlock(bx + 1, by, bz),
        this.getBlock(bx - 1, by, bz),
        this.getBlock(bx, by + 1, bz),
        this.getBlock(bx, by - 1, bz),
        this.getBlock(bx, by, bz + 1),
        this.getBlock(bx, by, bz - 1),
      ];
      if (neighbors.includes(BlockType.WATER)) {
        finalBlock = BlockType.OBSIDIAN;
      }
    }

    const key = this.getBlockKey(bx, by, bz);
    this.modifiedBlocks.set(key, finalBlock);

    if (!notify) return;

    // Determine affected chunk(s)
    const cx = Math.floor(bx / CHUNK_SIZE_X);
    const cz = Math.floor(bz / CHUNK_SIZE_Z);

    this.rebuildChunk(cx, cz);

    // If block is on chunk boundary, rebuild neighbor chunk too
    const lx = ((bx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((bz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    if (lx === 0) this.rebuildChunk(cx - 1, cz);
    if (lx === CHUNK_SIZE_X - 1) this.rebuildChunk(cx + 1, cz);
    if (lz === 0) this.rebuildChunk(cx, cz - 1);
    if (lz === CHUNK_SIZE_Z - 1) this.rebuildChunk(cx, cz + 1);
  }

  // Bulk load server-side persistent block modifications
  public applyServerBlockChanges(changes: Record<string, number>) {
    for (const [key, blockId] of Object.entries(changes)) {
      this.modifiedBlocks.set(key, blockId as BlockType);
    }
    // Rebuild all active chunks
    for (const [key, chunk] of this.loadedChunks.entries()) {
      chunk.mesh.buildMesh(chunk.x, chunk.z, (gx, gy, gz) => this.getBlock(gx, gy, gz));
    }
  }

  private lastCenterCX: number | null = null;
  private lastCenterCZ: number | null = null;

  // Infinite procedural chunk streaming around player
  public updateChunksAroundPlayer(playerX: number, playerZ: number) {
    const centerCX = Math.floor(playerX / CHUNK_SIZE_X);
    const centerCZ = Math.floor(playerZ / CHUNK_SIZE_Z);

    if (centerCX === this.lastCenterCX && centerCZ === this.lastCenterCZ) {
      return;
    }

    this.lastCenterCX = centerCX;
    this.lastCenterCZ = centerCZ;

    const neededKeys = new Set<string>();

    for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
      for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        const key = this.getChunkKey(cx, cz);
        neededKeys.add(key);

        if (!this.loadedChunks.has(key)) {
          this.loadChunk(cx, cz);
        }
      }
    }

    // Unload chunks out of view distance
    for (const [key, chunk] of this.loadedChunks.entries()) {
      if (!neededKeys.has(key)) {
        chunk.mesh.dispose();
        this.sceneGroup.remove(chunk.mesh.mesh);
        this.loadedChunks.delete(key);
      }
    }
  }

  private loadChunk(cx: number, cz: number) {
    const chunkMesh = new ChunkMesh();
    chunkMesh.buildMesh(cx, cz, (gx, gy, gz) => this.getBlock(gx, gy, gz));
    this.sceneGroup.add(chunkMesh.mesh);

    const key = this.getChunkKey(cx, cz);
    this.loadedChunks.set(key, { x: cx, z: cz, mesh: chunkMesh });
  }

  public rebuildChunk(cx: number, cz: number) {
    const key = this.getChunkKey(cx, cz);
    const chunk = this.loadedChunks.get(key);
    if (chunk) {
      chunk.mesh.buildMesh(cx, cz, (gx, gy, gz) => this.getBlock(gx, gy, gz));
    }
  }

  // Rebuild a batch of chunks specified by a set of chunk keys ("cx,cz")
  public rebuildChunks(chunkKeys: Set<string>) {
    for (const key of chunkKeys) {
      const chunk = this.loadedChunks.get(key);
      if (chunk) {
        chunk.mesh.buildMesh(chunk.x, chunk.z, (gx, gy, gz) => this.getBlock(gx, gy, gz));
      }
    }
  }

  // Fast DDA Voxel Raycaster for mining and placing blocks
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDist = 6.0): RaycastResult | null {
    const dir = direction.clone().normalize();
    
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = dir.x >= 0 ? 1 : -1;
    const stepY = dir.y >= 0 ? 1 : -1;
    const stepZ = dir.z >= 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / dir.x);
    const tDeltaY = Math.abs(1 / dir.y);
    const tDeltaZ = Math.abs(1 / dir.z);

    let tMaxX = dir.x >= 0 ? (Math.floor(origin.x) + 1 - origin.x) * tDeltaX : (origin.x - Math.floor(origin.x)) * tDeltaX;
    let tMaxY = dir.y >= 0 ? (Math.floor(origin.y) + 1 - origin.y) * tDeltaY : (origin.y - Math.floor(origin.y)) * tDeltaY;
    let tMaxZ = dir.z >= 0 ? (Math.floor(origin.z) + 1 - origin.z) * tDeltaZ : (origin.z - Math.floor(origin.z)) * tDeltaZ;

    let dist = 0;
    const faceNorm = new THREE.Vector3();

    while (dist < maxDist) {
      const blockType = this.getBlock(x, y, z);
      if (blockType !== BlockType.AIR && blockType !== BlockType.WATER && blockType !== BlockType.FLOWER) {
        return {
          hitPoint: origin.clone().add(dir.clone().multiplyScalar(dist)),
          blockPos: new THREE.Vector3(x, y, z),
          faceNormal: faceNorm.clone(),
          blockType,
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          dist = tMaxX;
          tMaxX += tDeltaX;
          faceNorm.set(-stepX, 0, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          faceNorm.set(0, 0, -stepZ);
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          dist = tMaxY;
          tMaxY += tDeltaY;
          faceNorm.set(0, -stepY, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          faceNorm.set(0, 0, -stepZ);
        }
      }
    }

    return null;
  }
}
