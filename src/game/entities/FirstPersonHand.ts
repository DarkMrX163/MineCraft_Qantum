import * as THREE from 'three';
import { BlockType } from '../constants';
import { TextureManager } from '../textures/TextureAtlas';

export class FirstPersonHand {
  public group: THREE.Group;
  private blockMesh: THREE.Mesh;
  private handMesh: THREE.Mesh;
  private isSwinging = false;
  private swingProgress = 0;

  constructor() {
    this.group = new THREE.Group();

    // Voxel Block in hand
    const blockGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    this.applyBlockUVs(blockGeo, BlockType.GRASS);

    const texManager = TextureManager.getInstance();
    this.blockMesh = new THREE.Mesh(blockGeo, texManager.masterOpaqueMaterial);
    this.blockMesh.position.set(0.35, -0.3, -0.6);
    this.blockMesh.rotation.set(0.3, -0.4, 0.2);
    this.group.add(this.blockMesh);

    // Character Hand Arm
    const handGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const handMat = new THREE.MeshLambertMaterial({ color: 0xfcc89b });
    this.handMesh = new THREE.Mesh(handGeo, handMat);
    this.handMesh.position.set(0.48, -0.45, -0.5);
    this.handMesh.rotation.set(0.5, -0.2, 0);
    this.group.add(this.handMesh);
  }

  private applyBlockUVs(geometry: THREE.BufferGeometry, blockType: BlockType) {
    const texManager = TextureManager.getInstance();
    const uvs: number[] = [];

    // BoxGeometry face order: 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const { u0, u1, v0, v1 } = texManager.getTileUVs(blockType, faceIdx);
      // Vertices per face in Three.BoxGeometry: Top-Left, Top-Right, Bottom-Left, Bottom-Right
      uvs.push(
        u0, v1,
        u1, v1,
        u0, v0,
        u1, v0
      );
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (geometry.attributes.uv) {
      geometry.attributes.uv.needsUpdate = true;
    }
  }

  public setHeldBlock(blockType: BlockType) {
    const texManager = TextureManager.getInstance();
    const isTrans = blockType === BlockType.LEAVES || blockType === BlockType.GLASS || blockType === BlockType.FLOWER || blockType === BlockType.WATER;
    this.blockMesh.material = isTrans ? texManager.masterTransparentMaterial : texManager.masterOpaqueMaterial;
    this.applyBlockUVs(this.blockMesh.geometry as THREE.BufferGeometry, blockType);
  }

  public triggerSwing() {
    this.isSwinging = true;
    this.swingProgress = 0;
  }

  public update(dt: number, isMoving: boolean) {
    // Subtle idle / walking sway
    const time = Date.now() * 0.005;
    const swayX = isMoving ? Math.sin(time * 2) * 0.04 : Math.sin(time) * 0.01;
    const swayY = isMoving ? Math.abs(Math.cos(time * 2)) * 0.04 : Math.cos(time) * 0.01;

    // Punch swing animation
    let swingOffsetZ = 0;
    let swingRotX = 0;

    if (this.isSwinging) {
      this.swingProgress += dt * 10;
      if (this.swingProgress >= Math.PI) {
        this.isSwinging = false;
        this.swingProgress = 0;
      } else {
        const sinProgress = Math.sin(this.swingProgress);
        swingOffsetZ = -sinProgress * 0.25;
        swingRotX = -sinProgress * 0.8;
      }
    }

    this.group.position.set(swayX, swayY, 0);
    this.blockMesh.position.set(0.35 + swayX, -0.3 + swayY, -0.6 + swingOffsetZ);
    this.blockMesh.rotation.set(0.3 + swingRotX, -0.4, 0.2);

    this.handMesh.position.set(0.48 + swayX, -0.45 + swayY, -0.5 + swingOffsetZ);
    this.handMesh.rotation.set(0.5 + swingRotX, -0.2, 0);
  }
}
