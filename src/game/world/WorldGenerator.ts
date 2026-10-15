import { BlockType, CHUNK_HEIGHT, SEA_LEVEL } from '../constants';
import { SimplexNoise } from './noise';

export class WorldGenerator {
  private noise: SimplexNoise;
  private treeNoise: SimplexNoise;

  constructor(seed = 42) {
    this.noise = new SimplexNoise(seed);
    this.treeNoise = new SimplexNoise(seed + 999);
  }

  // Calculate terrain surface height at global (x, z)
  public getHeight(x: number, z: number): number {
    const scale = 0.008;
    const n = this.noise.fbm2D(x * scale, z * scale, 4, 0.5, 2.0);
    const baseHeight = Math.floor(18 + n * 12);
    
    const mountainNoise = this.noise.noise2D(x * 0.02, z * 0.02);
    const extra = mountainNoise > 0.4 ? Math.floor((mountainNoise - 0.4) * 20) : 0;

    return Math.max(2, Math.min(CHUNK_HEIGHT - 10, baseHeight + extra));
  }

  // Check if an oak tree trunk base should spawn at global (x, z)
  public isTreeBase(x: number, z: number): boolean {
    const height = this.getHeight(x, z);
    if (height <= SEA_LEVEL + 1) return false; // No trees in water or sand

    const val = this.treeNoise.noise2D(x * 0.1, z * 0.1);
    const hash = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    return val > 0.3 && hash < 0.04;
  }

  // Generate block at specific world coordinate (x, y, z)
  public getBlockTypeAt(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
    if (y === 0) return BlockType.BEDROCK;

    const height = this.getHeight(x, z);

    // Above terrain (check for trees, flowers, or water)
    if (y > height) {
      // 1. Check for Oak Trees around this position
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const tx = x + dx;
          const tz = z + dz;
          if (this.isTreeBase(tx, tz)) {
            const treeHeight = this.getHeight(tx, tz);
            const relY = y - treeHeight;

            // Trunk (Wood Log)
            if (dx === 0 && dz === 0 && relY >= 1 && relY <= 5) {
              return BlockType.WOOD;
            }

            // Leaves Crown
            if (relY >= 3 && relY <= 6) {
              const maxR = relY >= 5 ? 1 : 2;
              if (Math.abs(dx) <= maxR && Math.abs(dz) <= maxR) {
                // Avoid corners on top layer for rounded crown
                if (relY === 6 && Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
                return BlockType.LEAVES;
              }
            }
          }
        }
      }

      // Flowers on grass
      if (y === height + 1 && height > SEA_LEVEL + 1) {
        const flowerHash = Math.abs(Math.sin(x * 43.1 + z * 91.7) * 43758.5453) % 1;
        if (flowerHash < 0.03) {
          return BlockType.FLOWER;
        }
      }

      // Water body up to sea level
      if (y <= SEA_LEVEL && height <= SEA_LEVEL) {
        return BlockType.WATER;
      }

      return BlockType.AIR;
    }

    // At terrain surface
    if (y === height) {
      if (height <= SEA_LEVEL + 1) {
        return BlockType.SAND; // Beach
      }
      return BlockType.GRASS;
    }

    // Dirt layer (1-3 blocks below surface)
    if (y >= height - 3) {
      return height <= SEA_LEVEL + 1 ? BlockType.SAND : BlockType.DIRT;
    }

    // Underground Stone with ores
    const oreHash = Math.abs(Math.sin(x * 31.1 + y * 17.3 + z * 59.7) * 43758.5453) % 1;
    if (y < 10 && oreHash < 0.015) return BlockType.DIAMOND_ORE;
    if (y < 18 && oreHash < 0.03) return BlockType.GOLD_ORE;
    if (y < 28 && oreHash < 0.05) return BlockType.IRON_ORE;
    if (y < 35 && oreHash < 0.08) return BlockType.COAL_ORE;

    return BlockType.STONE;
  }
}
