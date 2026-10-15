import * as THREE from 'three';
import { BlockType, BLOCK_DEFS } from '../constants';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class BlockBreakParticles {
  private particles: Particle[] = [];
  private particleGroup: THREE.Group;
  private particleGeo: THREE.BoxGeometry;

  constructor(scene: THREE.Scene) {
    this.particleGroup = new THREE.Group();
    scene.add(this.particleGroup);
    this.particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  }

  // Spawn particle burst when block at (bx, by, bz) of blockType is mined
  public spawnBreakBurst(bx: number, by: number, bz: number, blockType: BlockType) {
    const def = BLOCK_DEFS[blockType];
    const colorHex = def ? def.color : '#888888';
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
    });

    const count = 14;
    const centerX = bx + 0.5;
    const centerY = by + 0.5;
    const centerZ = bz + 0.5;

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(
        centerX + (Math.random() - 0.5) * 0.6,
        centerY + (Math.random() - 0.5) * 0.6,
        centerZ + (Math.random() - 0.5) * 0.6
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5,
        Math.random() * 3.5 + 2.0,
        (Math.random() - 0.5) * 4.5
      );

      const rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        rotVelocity,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.25, // 400ms - 650ms lifetime
      });
    }
  }

  public update(dt: number) {
    const gravity = 18.0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        // Dispose and remove particle
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics movement
      p.velocity.y -= gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      // Rotation tumble
      p.mesh.rotation.x += p.rotVelocity.x * dt;
      p.mesh.rotation.y += p.rotVelocity.y * dt;
      p.mesh.rotation.z += p.rotVelocity.z * dt;

      // Shrink scale over lifetime
      const progress = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, progress));
    }
  }
}
