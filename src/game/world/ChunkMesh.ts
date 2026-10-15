import * as THREE from 'three';
import { BlockType, BLOCK_DEFS, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_HEIGHT } from '../constants';
import { TextureManager } from '../textures/TextureAtlas';

export class ChunkMesh {
  public mesh: THREE.Group;
  private opaqueMesh: THREE.Mesh | null = null;
  private transparentMesh: THREE.Mesh | null = null;

  constructor() {
    this.mesh = new THREE.Group();
  }

  public buildMesh(
    chunkX: number,
    chunkZ: number,
    getBlock: (gx: number, gy: number, gz: number) => BlockType
  ) {
    if (this.opaqueMesh) {
      this.opaqueMesh.geometry.dispose();
      this.mesh.remove(this.opaqueMesh);
      this.opaqueMesh = null;
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.mesh.remove(this.transparentMesh);
      this.transparentMesh = null;
    }

    const startX = chunkX * CHUNK_SIZE_X;
    const startZ = chunkZ * CHUNK_SIZE_Z;

    const opaquePositions: number[] = [];
    const opaqueNormals: number[] = [];
    const opaqueUvs: number[] = [];
    const opaqueIndices: number[] = [];
    const opaqueGroups: { start: number; count: number; materialIndex: number }[] = [];

    const transparentPositions: number[] = [];
    const transparentNormals: number[] = [];
    const transparentUvs: number[] = [];
    const transparentIndices: number[] = [];
    const transparentGroups: { start: number; count: number; materialIndex: number }[] = [];

    // Face definitions
    // 0: +X (Right), 1: -X (Left), 2: +Y (Top), 3: -Y (Bottom), 4: +Z (Front), 5: -Z (Back)
    const faces = [
      { dir: [1, 0, 0], norm: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], matIdx: 0 },
      { dir: [-1, 0, 0], norm: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], matIdx: 1 },
      { dir: [0, 1, 0], norm: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], matIdx: 2 },
      { dir: [0, -1, 0], norm: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], matIdx: 3 },
      { dir: [0, 0, 1], norm: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], matIdx: 4 },
      { dir: [0, 0, -1], norm: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], matIdx: 5 },
    ];

    let opaqueVertCount = 0;
    let transparentVertCount = 0;
    const texManager = TextureManager.getInstance();

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          const gx = startX + lx;
          const gy = ly;
          const gz = startZ + lz;

          const blockType = getBlock(gx, gy, gz);
          if (blockType === BlockType.AIR) continue;

          const def = BLOCK_DEFS[blockType];
          if (!def) continue;

          // Special cross-quad for flowers
          if (blockType === BlockType.FLOWER) {
            const matIndex = texManager.getMaterialIndex(BlockType.FLOWER, 0);
            const indexStart = transparentIndices.length;

            this.addFlowerCrossQuad(
              gx, gy, gz,
              transparentPositions,
              transparentNormals,
              transparentUvs,
              transparentIndices,
              transparentVertCount
            );
            transparentVertCount += 8;
            transparentGroups.push({ start: indexStart, count: 12, materialIndex: matIndex });
            continue;
          }

          for (const face of faces) {
            const nx = gx + face.dir[0];
            const ny = gy + face.dir[1];
            const nz = gz + face.dir[2];

            const neighborType = getBlock(nx, ny, nz);
            const neighborDef = BLOCK_DEFS[neighborType];

            let drawFace = false;
            if (neighborType === BlockType.AIR) {
              drawFace = true;
            } else if (def.transparent && !neighborDef.transparent) {
              drawFace = false;
            } else if (!def.transparent && neighborDef.transparent) {
              drawFace = true;
            } else if (def.transparent && neighborDef.transparent && blockType !== neighborType) {
              drawFace = true;
            }

            if (!drawFace) continue;

            const isTrans = def.transparent;
            const positions = isTrans ? transparentPositions : opaquePositions;
            const normals = isTrans ? transparentNormals : opaqueNormals;
            const uvs = isTrans ? transparentUvs : opaqueUvs;
            const indices = isTrans ? transparentIndices : opaqueIndices;
            const groups = isTrans ? transparentGroups : opaqueGroups;
            const vertOffset = isTrans ? transparentVertCount : opaqueVertCount;

            const matIndex = texManager.getMaterialIndex(blockType, face.matIdx);
            const indexStart = indices.length;

            // Add 4 corners
            for (const c of face.corners) {
              positions.push(gx + c[0], gy + c[1], gz + c[2]);
              normals.push(...face.norm);
            }
            // UVs
            uvs.push(0, 1, 1, 1, 1, 0, 0, 0);

            // 2 Triangles
            indices.push(
              vertOffset, vertOffset + 1, vertOffset + 2,
              vertOffset, vertOffset + 2, vertOffset + 3
            );

            groups.push({ start: indexStart, count: 6, materialIndex: matIndex });

            if (isTrans) {
              transparentVertCount += 4;
            } else {
              opaqueVertCount += 4;
            }
          }
        }
      }
    }

    // Create opaque mesh
    if (opaquePositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(opaquePositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
      geo.setIndex(opaqueIndices);

      for (const group of opaqueGroups) {
        geo.addGroup(group.start, group.count, group.materialIndex);
      }
      geo.computeBoundingSphere();

      this.opaqueMesh = new THREE.Mesh(geo, texManager.masterMaterials);
      this.opaqueMesh.castShadow = true;
      this.opaqueMesh.receiveShadow = true;
      this.mesh.add(this.opaqueMesh);
    }

    // Create transparent mesh
    if (transparentPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(transparentPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(transparentNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(transparentUvs, 2));
      geo.setIndex(transparentIndices);

      for (const group of transparentGroups) {
        geo.addGroup(group.start, group.count, group.materialIndex);
      }
      geo.computeBoundingSphere();

      this.transparentMesh = new THREE.Mesh(geo, texManager.masterMaterials);
      this.transparentMesh.renderOrder = 1;
      this.mesh.add(this.transparentMesh);
    }
  }

  private addFlowerCrossQuad(
    gx: number, gy: number, gz: number,
    positions: number[], normals: number[], uvs: number[], indices: number[], vertOffset: number
  ) {
    positions.push(
      gx, gy, gz,
      gx, gy + 1, gz,
      gx + 1, gy + 1, gz + 1,
      gx + 1, gy, gz + 1
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    indices.push(
      vertOffset, vertOffset + 1, vertOffset + 2,
      vertOffset, vertOffset + 2, vertOffset + 3
    );

    const o2 = vertOffset + 4;
    positions.push(
      gx + 1, gy, gz,
      gx + 1, gy + 1, gz,
      gx, gy + 1, gz + 1,
      gx, gy, gz + 1
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
    indices.push(
      o2, o2 + 1, o2 + 2,
      o2, o2 + 2, o2 + 3
    );
  }

  public dispose() {
    if (this.opaqueMesh) {
      this.opaqueMesh.geometry.dispose();
      this.mesh.remove(this.opaqueMesh);
    }
    if (this.transparentMesh) {
      this.transparentMesh.geometry.dispose();
      this.mesh.remove(this.transparentMesh);
    }
  }
}
