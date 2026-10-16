import { BlockType, CHUNK_HEIGHT, SEA_LEVEL } from '../constants';
import { SimplexNoise } from './noise';

export enum BiomeType {
  PLAINS_FOREST = 'PLAINS_FOREST',
  DESERT = 'DESERT',
  SNOWY_TAIGA = 'SNOWY_TAIGA',
  MOUNTAINS = 'MOUNTAINS',
  DENSE_FOREST = 'DENSE_FOREST',
}

export class WorldGenerator {
  private noise: SimplexNoise;
  private treeNoise: SimplexNoise;
  private tempNoise: SimplexNoise;
  private humidNoise: SimplexNoise;
  private continentalNoise: SimplexNoise;

  constructor(seed = 42) {
    this.noise = new SimplexNoise(seed);
    this.treeNoise = new SimplexNoise(seed + 999);
    this.tempNoise = new SimplexNoise(seed + 2024);
    this.humidNoise = new SimplexNoise(seed + 3033);
    this.continentalNoise = new SimplexNoise(seed + 4042);
  }

  // Get biome type at global (x, z) coordinates using temperature, humidity and continentalness noise
  public getBiome(x: number, z: number): BiomeType {
    const temp = this.tempNoise.noise2D(x * 0.0018, z * 0.0018);
    const humid = this.humidNoise.noise2D(x * 0.0018 + 500, z * 0.0018 + 500);
    const continental = this.continentalNoise.noise2D(x * 0.0012 + 1000, z * 0.0012 + 1000);

    if (continental > 0.38) {
      return BiomeType.MOUNTAINS;
    }
    if (temp > 0.32 && humid < 0.1) {
      return BiomeType.DESERT;
    }
    if (temp < -0.22) {
      return BiomeType.SNOWY_TAIGA;
    }
    if (humid > 0.35) {
      return BiomeType.DENSE_FOREST;
    }
    return BiomeType.PLAINS_FOREST;
  }

  // Calculate terrain surface height at global (x, z) based on biome parameters
  public getHeight(x: number, z: number): number {
    const biome = this.getBiome(x, z);
    const scale = 0.008;
    const n = this.noise.fbm2D(x * scale, z * scale, 3, 0.5, 2.0);

    switch (biome) {
      case BiomeType.MOUNTAINS: {
        const peak = Math.max(0, this.noise.noise2D(x * 0.015, z * 0.015));
        const mountainH = Math.floor(26 + n * 10 + peak * 24);
        return Math.min(CHUNK_HEIGHT - 6, Math.max(12, mountainH));
      }
      case BiomeType.DESERT: {
        const dune = Math.sin(x * 0.025) * Math.cos(z * 0.025);
        return Math.floor(18 + dune * 5 + n * 4);
      }
      case BiomeType.SNOWY_TAIGA: {
        return Math.floor(20 + n * 8);
      }
      case BiomeType.DENSE_FOREST: {
        return Math.floor(20 + n * 10);
      }
      case BiomeType.PLAINS_FOREST:
      default: {
        return Math.floor(18 + n * 8);
      }
    }
  }

  // Check if a tree or cactus should spawn at global (x, z)
  public isTreeBase(x: number, z: number): boolean {
    const val = this.treeNoise.noise2D(x * 0.1, z * 0.1);
    if (val <= 0.28) return false;

    const hash = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    if (hash >= 0.05) return false;

    const height = this.getHeight(x, z);
    return height > SEA_LEVEL + 1;
  }

  public isCactusBase(x: number, z: number): boolean {
    const val = this.treeNoise.noise2D(x * 0.12 + 200, z * 0.12 + 200);
    if (val <= 0.32) return false;

    const hash = Math.abs(Math.sin(x * 17.15 + z * 53.91) * 43758.5453) % 1;
    if (hash >= 0.04) return false;

    const height = this.getHeight(x, z);
    return height > SEA_LEVEL + 1;
  }

  // Generate block at specific world coordinate (x, y, z)
  public getBlockTypeAt(x: number, y: number, z: number): BlockType {
    if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
    if (y === 0) return BlockType.BEDROCK;

    const biome = this.getBiome(x, z);
    const height = this.getHeight(x, z);

    // Above terrain surface
    if (y > height) {
      if (y > height + 9) return BlockType.AIR;

      // 1. Desert Cacti
      if (biome === BiomeType.DESERT) {
        if (this.isCactusBase(x, z)) {
          const cactusH = this.getHeight(x, z);
          const relY = y - cactusH;
          if (relY >= 1 && relY <= 3) {
            return BlockType.CACTUS;
          }
        }
        if (y <= SEA_LEVEL && height <= SEA_LEVEL) {
          return BlockType.WATER;
        }
        return BlockType.AIR;
      }

      // 2. Trees in Forest, Snowy Taiga, Dense Forest
      if (biome === BiomeType.PLAINS_FOREST || biome === BiomeType.SNOWY_TAIGA || biome === BiomeType.DENSE_FOREST) {
        const isTaiga = biome === BiomeType.SNOWY_TAIGA;
        const isDense = biome === BiomeType.DENSE_FOREST;
        const leafBlock = isTaiga ? BlockType.SNOW_LEAVES : BlockType.LEAVES;
        const maxTrunk = isDense ? 7 : 5;
        const minLeaves = isDense ? 4 : 3;
        const maxLeaves = isDense ? 8 : 6;

        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const tx = x + dx;
            const tz = z + dz;
            if (this.isTreeBase(tx, tz)) {
              const treeHeight = this.getHeight(tx, tz);
              const relY = y - treeHeight;

              // Trunk (Wood Log)
              if (dx === 0 && dz === 0 && relY >= 1 && relY <= maxTrunk) {
                return BlockType.WOOD;
              }

              // Leaf Crown
              if (relY >= minLeaves && relY <= maxLeaves) {
                const maxR = relY >= maxLeaves - 1 ? 1 : 2;
                if (Math.abs(dx) <= maxR && Math.abs(dz) <= maxR) {
                  if (relY === maxLeaves && Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
                  return leafBlock;
                }
              }
            }
          }
        }
      }

      // Flowers in temperate biomes
      if (y === height + 1 && height > SEA_LEVEL + 1 && (biome === BiomeType.PLAINS_FOREST || biome === BiomeType.DENSE_FOREST)) {
        const flowerHash = Math.abs(Math.sin(x * 43.1 + z * 91.7) * 43758.5453) % 1;
        if (flowerHash < 0.04) {
          return BlockType.FLOWER;
        }
      }

      // Water or Ice surface at SEA_LEVEL
      if (y <= SEA_LEVEL && height <= SEA_LEVEL) {
        if (biome === BiomeType.SNOWY_TAIGA && y === SEA_LEVEL) {
          return BlockType.ICE;
        }
        return BlockType.WATER;
      }

      return BlockType.AIR;
    }

    // At terrain surface (y === height)
    if (y === height) {
      if (height <= SEA_LEVEL + 1) {
        return BlockType.SAND; // Sandy shoreline
      }
      if (biome === BiomeType.DESERT) return BlockType.SAND;
      if (biome === BiomeType.SNOWY_TAIGA) return BlockType.SNOW;
      if (biome === BiomeType.MOUNTAINS) {
        return height >= 38 ? BlockType.SNOW : BlockType.STONE;
      }
      return BlockType.GRASS;
    }

    // Subsurface layer (1 to 3 blocks below top)
    if (y >= height - 3) {
      if (biome === BiomeType.DESERT) return BlockType.SAND;
      if (biome === BiomeType.SNOWY_TAIGA) return BlockType.DIRT;
      if (biome === BiomeType.MOUNTAINS) return BlockType.STONE;
      return height <= SEA_LEVEL + 1 ? BlockType.SAND : BlockType.DIRT;
    }

    // Underground Stone with mineral ores
    const oreHash = Math.abs(Math.sin(x * 31.1 + y * 17.3 + z * 59.7) * 43758.5453) % 1;
    if (y < 10 && oreHash < 0.015) return BlockType.DIAMOND_ORE;
    if (y < 18 && oreHash < 0.03) return BlockType.GOLD_ORE;
    if (y < 28 && oreHash < 0.05) return BlockType.IRON_ORE;
    if (y < 35 && oreHash < 0.08) return BlockType.COAL_ORE;

    return BlockType.STONE;
  }
}
