import * as THREE from 'three';
import { BlockType } from '../constants';
import { TextureManager } from '../textures/TextureAtlas';

export class Avatar {
  public mesh: THREE.Group;
  private headMesh: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private leftArmMesh: THREE.Group;
  private rightArmMesh: THREE.Group;
  private leftLegMesh: THREE.Group;
  private rightLegMesh: THREE.Group;
  private nameTagSprite: THREE.Sprite;
  private heldItemMesh: THREE.Mesh;

  public targetPosition = new THREE.Vector3(0, 25, 0);
  public targetYaw = 0;
  public targetPitch = 0;
  public isMoving = false;
  public isJumping = false;
  private walkTime = 0;

  constructor(public id: string, public name: string, public colorHex: string) {
    this.mesh = new THREE.Group();

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfcc89b });
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a2e12 });
    const shirtMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(colorHex) });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2b3859 });

    // Head Group
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 16;
    eyeCanvas.height = 16;
    const ctx = eyeCanvas.getContext('2d')!;
    ctx.fillStyle = '#fcc89b';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#4a2e12';
    ctx.fillRect(0, 0, 16, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 7, 3, 2);
    ctx.fillRect(10, 7, 3, 2);
    ctx.fillStyle = '#1b3b82';
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(11, 7, 2, 2);
    ctx.fillStyle = '#a65444';
    ctx.fillRect(6, 11, 4, 1);

    const faceTex = new THREE.CanvasTexture(eyeCanvas);
    faceTex.magFilter = THREE.NearestFilter;
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshLambertMaterial({ map: faceTex });

    const headMats = [skinMat, skinMat, hairMat, skinMat, faceMat, skinMat];
    this.headMesh = new THREE.Mesh(headGeo, headMats);
    this.headMesh.position.set(0, 1.45, 0);
    this.mesh.add(this.headMesh);

    // Torso Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.75, 0.25);
    this.bodyMesh = new THREE.Mesh(bodyGeo, shirtMat);
    this.bodyMesh.position.set(0, 0.825, 0);
    this.mesh.add(this.bodyMesh);

    // Left Arm
    this.leftArmMesh = new THREE.Group();
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const lArm = new THREE.Mesh(armGeo, shirtMat);
    lArm.position.set(0, -0.3, 0);
    this.leftArmMesh.add(lArm);
    this.leftArmMesh.position.set(-0.36, 1.15, 0);
    this.mesh.add(this.leftArmMesh);

    // Right Arm + Held Item
    this.rightArmMesh = new THREE.Group();
    const rArm = new THREE.Mesh(armGeo, shirtMat);
    rArm.position.set(0, -0.3, 0);
    this.rightArmMesh.add(rArm);
    this.rightArmMesh.position.set(0.36, 1.15, 0);

    // Held Voxel Block in Right Hand
    const miniBlockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    this.applyBlockUVs(miniBlockGeo, BlockType.GRASS);

    const texManager = TextureManager.getInstance();
    this.heldItemMesh = new THREE.Mesh(miniBlockGeo, texManager.masterOpaqueMaterial);
    this.heldItemMesh.position.set(0, -0.6, 0.15);
    this.rightArmMesh.add(this.heldItemMesh);

    this.mesh.add(this.rightArmMesh);

    // Left Leg
    this.leftLegMesh = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.22);
    const lLeg = new THREE.Mesh(legGeo, pantsMat);
    lLeg.position.set(0, -0.375, 0);
    this.leftLegMesh.add(lLeg);
    this.leftLegMesh.position.set(-0.13, 0.75, 0);
    this.mesh.add(this.leftLegMesh);

    // Right Leg
    this.rightLegMesh = new THREE.Group();
    const rLeg = new THREE.Mesh(legGeo, pantsMat);
    rLeg.position.set(0, -0.375, 0);
    this.rightLegMesh.add(rLeg);
    this.rightLegMesh.position.set(0.13, 0.75, 0);
    this.mesh.add(this.rightLegMesh);

    // NameTag Sprite
    this.nameTagSprite = this.createNameTagSprite(name, colorHex);
    this.nameTagSprite.position.set(0, 1.95, 0);
    this.mesh.add(this.nameTagSprite);
  }

  private applyBlockUVs(geometry: THREE.BufferGeometry, blockType: BlockType) {
    const texManager = TextureManager.getInstance();
    const uvs: number[] = [];
    for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
      const { u0, u1, v0, v1 } = texManager.getTileUVs(blockType, faceIdx);
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

  private createNameTagSprite(text: string, colorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(10, 10, 236, 44, 8);
    ctx.fill();

    ctx.fillStyle = colorHex;
    ctx.fillRect(16, 18, 12, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 136, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 0.4, 1);
    return sprite;
  }

  public updateHeldBlock(blockType: BlockType) {
    const texManager = TextureManager.getInstance();
    const isTrans = blockType === BlockType.LEAVES || blockType === BlockType.GLASS || blockType === BlockType.FLOWER || blockType === BlockType.WATER;
    this.heldItemMesh.material = isTrans ? texManager.masterTransparentMaterial : texManager.masterOpaqueMaterial;
    this.applyBlockUVs(this.heldItemMesh.geometry as THREE.BufferGeometry, blockType);
  }

  public update(dt: number) {
    // Smooth lerp movement and rotation
    this.mesh.position.lerp(this.targetPosition, Math.min(dt * 15, 1));
    this.mesh.rotation.y = THREE.MathUtils.damp(this.mesh.rotation.y, this.targetYaw, 15, dt);
    this.headMesh.rotation.x = THREE.MathUtils.damp(this.headMesh.rotation.x, this.targetPitch, 15, dt);

    // Limb walking animation
    if (this.isMoving) {
      this.walkTime += dt * 10;
      const angle = Math.sin(this.walkTime) * 0.6;
      this.leftArmMesh.rotation.x = angle;
      this.rightArmMesh.rotation.x = -angle;
      this.leftLegMesh.rotation.x = -angle;
      this.rightLegMesh.rotation.x = angle;
    } else {
      this.leftArmMesh.rotation.x = THREE.MathUtils.damp(this.leftArmMesh.rotation.x, 0, 10, dt);
      this.rightArmMesh.rotation.x = THREE.MathUtils.damp(this.rightArmMesh.rotation.x, 0, 10, dt);
      this.leftLegMesh.rotation.x = THREE.MathUtils.damp(this.leftLegMesh.rotation.x, 0, 10, dt);
      this.rightLegMesh.rotation.x = THREE.MathUtils.damp(this.rightLegMesh.rotation.x, 0, 10, dt);
    }
  }

  public dispose() {
    this.nameTagSprite.material.dispose();
  }
}
