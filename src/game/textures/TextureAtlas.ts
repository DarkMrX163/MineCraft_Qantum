import * as THREE from 'three';
import { BlockType, ItemType } from '../constants';

export interface UVRect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export class TextureManager {
  private static instance: TextureManager;

  public masterAtlasCanvas: HTMLCanvasElement;
  public atlasTexture: THREE.CanvasTexture;
  public masterOpaqueMaterial: THREE.MeshLambertMaterial;
  public masterTransparentMaterial: THREE.MeshLambertMaterial;

  // Map from texture name to grid col (0..7) and row (0..7)
  private tileMap = new Map<string, { col: number; row: number }>();
  private canvasMap = new Map<string, HTMLCanvasElement>();

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  constructor() {
    this.masterAtlasCanvas = document.createElement('canvas');
    this.masterAtlasCanvas.width = 128; // 8 tiles x 16px
    this.masterAtlasCanvas.height = 128; // 8 tiles x 16px
    const ctx = this.masterAtlasCanvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;

    this.registerTilePositions();
    this.drawAllTilesToAtlas(ctx);

    this.atlasTexture = new THREE.CanvasTexture(this.masterAtlasCanvas);
    this.atlasTexture.magFilter = THREE.NearestFilter;
    this.atlasTexture.minFilter = THREE.NearestFilter;
    this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    this.atlasTexture.needsUpdate = true;

    this.masterOpaqueMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      side: THREE.FrontSide,
    });

    this.masterTransparentMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
    });
  }

  private registerTilePositions() {
    const tiles: { [name: string]: [number, number] } = {
      grass_top: [0, 0],
      grass_side: [1, 0],
      dirt: [2, 0],
      stone: [3, 0],
      cobblestone: [4, 0],
      wood_side: [5, 0],
      wood_top: [6, 0],
      planks: [7, 0],

      leaves: [0, 1],
      sand: [1, 1],
      brick: [2, 1],
      glass: [3, 1],
      glowstone: [4, 1],
      diamond_ore: [5, 1],
      gold_ore: [6, 1],
      iron_ore: [7, 1],

      coal_ore: [0, 2],
      bedrock: [1, 2],
      bookshelf: [2, 2],
      tnt_side: [3, 2],
      tnt_top: [4, 2],
      water: [5, 2],
      flower: [6, 2],
      crafting_table_top: [7, 2],

      crafting_table_side: [0, 3],
      chest_front: [1, 3],
      chest_side: [2, 3],
      furnace_front: [3, 3],
      obsidian: [4, 3],
      item_stick: [5, 3],
      item_pickaxe: [6, 3],
      item_sword: [7, 3],

      item_helmet: [0, 4],
      item_chestplate: [1, 4],
      item_leggings: [2, 4],

      snow: [3, 4],
      cactus_top: [4, 4],
      cactus_side: [5, 4],
      ice: [6, 4],
      snow_leaves: [7, 4],
    };

    for (const [name, [col, row]] of Object.entries(tiles)) {
      this.tileMap.set(name, { col, row });
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    name: string,
    drawFn: (tctx: CanvasRenderingContext2D) => void
  ) {
    const pos = this.tileMap.get(name);
    if (!pos) return;

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 16;
    tileCanvas.height = 16;
    const tctx = tileCanvas.getContext('2d', { willReadFrequently: true })!;
    tctx.imageSmoothingEnabled = false;
    drawFn(tctx);

    ctx.drawImage(tileCanvas, pos.col * 16, pos.row * 16);
    this.canvasMap.set(name, tileCanvas);
  }

  private drawAllTilesToAtlas(ctx: CanvasRenderingContext2D) {
    // Dirt
    this.drawTile(ctx, 'dirt', (tctx) => {
      tctx.fillStyle = '#866043';
      tctx.fillRect(0, 0, 16, 16);
      const dirtColors = ['#734f35', '#986d4e', '#61412b', '#7e5a3e'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 7 + y * 13) % 4 === 0) {
            tctx.fillStyle = dirtColors[(x + y) % dirtColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Grass Top
    this.drawTile(ctx, 'grass_top', (tctx) => {
      tctx.fillStyle = '#55a137';
      tctx.fillRect(0, 0, 16, 16);
      const shades = ['#498e2e', '#67b842', '#3e7a27', '#509633'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 11 + y * 17) % 3 === 0) {
            tctx.fillStyle = shades[(x * 3 + y * 7) % shades.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Grass Side
    this.drawTile(ctx, 'grass_side', (tctx) => {
      tctx.fillStyle = '#866043';
      tctx.fillRect(0, 0, 16, 16);
      const dirtColors = ['#734f35', '#986d4e', '#61412b'];
      for (let x = 0; x < 16; x++) {
        for (let y = 3; y < 16; y++) {
          if ((x * 7 + y * 13) % 4 === 0) {
            tctx.fillStyle = dirtColors[(x + y) % dirtColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
      tctx.fillStyle = '#55a137';
      tctx.fillRect(0, 0, 16, 3);
      const overhang = [3, 4, 3, 5, 4, 3, 5, 4, 3, 4, 5, 3, 4, 3, 4, 3];
      for (let x = 0; x < 16; x++) {
        const h = overhang[x % overhang.length];
        tctx.fillStyle = x % 2 === 0 ? '#498e2e' : '#67b842';
        tctx.fillRect(x, 3, 1, h - 2);
      }
    });

    // Stone
    this.drawTile(ctx, 'stone', (tctx) => {
      tctx.fillStyle = '#7a7a7a';
      tctx.fillRect(0, 0, 16, 16);
      const stoneColors = ['#686868', '#8a8a8a', '#5f5f5f', '#919191'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 5 + y * 9) % 3 === 0) {
            tctx.fillStyle = stoneColors[(x * 2 + y * 5) % stoneColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Cobblestone
    this.drawTile(ctx, 'cobblestone', (tctx) => {
      tctx.fillStyle = '#656565';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#444444';
      for (let i = 0; i < 16; i += 4) {
        tctx.fillRect(0, i, 16, 1);
      }
      const pebbles = ['#7c7c7c', '#8a8a8a', '#585858'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y) % 3 === 0) {
            tctx.fillStyle = pebbles[(x + y * 3) % pebbles.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Wood Side
    this.drawTile(ctx, 'wood_side', (tctx) => {
      tctx.fillStyle = '#5c462b';
      tctx.fillRect(0, 0, 16, 16);
      const barkColors = ['#46341e', '#6e5436', '#382815'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if (x % 3 === 0 || (x + y * 2) % 5 === 0) {
            tctx.fillStyle = barkColors[(x + y) % barkColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Wood Top
    this.drawTile(ctx, 'wood_top', (tctx) => {
      tctx.fillStyle = '#5c462b';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#9c7a4c';
      tctx.fillRect(2, 2, 12, 12);
      tctx.fillStyle = '#82633a';
      tctx.fillRect(4, 4, 8, 8);
      tctx.fillStyle = '#9c7a4c';
      tctx.fillRect(6, 6, 4, 4);
      tctx.fillStyle = '#6b4f2c';
      tctx.fillRect(7, 7, 2, 2);
    });

    // Planks
    this.drawTile(ctx, 'planks', (tctx) => {
      tctx.fillStyle = '#a17e4f';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#6e522d';
      tctx.fillRect(0, 3, 16, 1);
      tctx.fillRect(0, 7, 16, 1);
      tctx.fillRect(0, 11, 16, 1);
      tctx.fillRect(0, 15, 16, 1);
      tctx.fillRect(7, 0, 1, 3);
      tctx.fillRect(12, 4, 1, 3);
      tctx.fillRect(4, 8, 1, 3);
      tctx.fillRect(10, 12, 1, 3);
    });

    // Leaves
    this.drawTile(ctx, 'leaves', (tctx) => {
      tctx.fillStyle = '#3a7d23';
      tctx.fillRect(0, 0, 16, 16);
      const leafGreens = ['#46912c', '#2c611a', '#54a337', '#224a14'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 3 + y * 7) % 7 === 0) {
            tctx.clearRect(x, y, 1, 1);
          } else {
            tctx.fillStyle = leafGreens[(x + y * 3) % leafGreens.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Sand
    this.drawTile(ctx, 'sand', (tctx) => {
      tctx.fillStyle = '#d6cd94';
      tctx.fillRect(0, 0, 16, 16);
      const sandGrains = ['#c8be82', '#e2d9a4', '#b8ae74'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 5 + y * 11) % 3 === 0) {
            tctx.fillStyle = sandGrains[(x + y) % sandGrains.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Brick
    this.drawTile(ctx, 'brick', (tctx) => {
      tctx.fillStyle = '#9c4c3b';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#b3aa9d';
      tctx.fillRect(0, 3, 16, 1);
      tctx.fillRect(0, 7, 16, 1);
      tctx.fillRect(0, 11, 16, 1);
      tctx.fillRect(0, 15, 16, 1);
      tctx.fillRect(7, 0, 1, 3);
      tctx.fillRect(15, 4, 1, 3);
    });

    // Glass
    this.drawTile(ctx, 'glass', (tctx) => {
      tctx.clearRect(0, 0, 16, 16);
      tctx.fillStyle = 'rgba(164, 212, 232, 0.4)';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 0, 16, 1);
      tctx.fillRect(0, 15, 16, 1);
      tctx.fillRect(0, 0, 1, 16);
      tctx.fillRect(15, 0, 1, 16);
      tctx.fillStyle = '#e8f6ff';
      tctx.fillRect(3, 3, 2, 2);
      tctx.fillRect(11, 11, 2, 2);
    });

    // Glowstone
    this.drawTile(ctx, 'glowstone', (tctx) => {
      tctx.fillStyle = '#e6bf55';
      tctx.fillRect(0, 0, 16, 16);
      const glowHues = ['#fff199', '#f3d366', '#d6a836'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          tctx.fillStyle = glowHues[(x * 7 + y * 13) % glowHues.length];
          tctx.fillRect(x, y, 1, 1);
        }
      }
    });

    // Diamond Ore
    this.drawTile(ctx, 'diamond_ore', (tctx) => {
      tctx.fillStyle = '#7a7a7a';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#4cf6f3';
      tctx.fillRect(4, 4, 3, 3);
      tctx.fillRect(10, 8, 3, 3);
      tctx.fillStyle = '#bdfdfc';
      tctx.fillRect(5, 5, 1, 1);
    });

    // Gold Ore
    this.drawTile(ctx, 'gold_ore', (tctx) => {
      tctx.fillStyle = '#7a7a7a';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#f7d33b';
      tctx.fillRect(4, 4, 3, 3);
      tctx.fillRect(10, 8, 3, 3);
    });

    // Iron Ore
    this.drawTile(ctx, 'iron_ore', (tctx) => {
      tctx.fillStyle = '#7a7a7a';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#d8af93';
      tctx.fillRect(3, 4, 3, 2);
      tctx.fillRect(10, 8, 3, 2);
    });

    // Coal Ore
    this.drawTile(ctx, 'coal_ore', (tctx) => {
      tctx.fillStyle = '#7a7a7a';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#222222';
      tctx.fillRect(3, 4, 3, 2);
      tctx.fillRect(9, 7, 3, 3);
    });

    // Bedrock
    this.drawTile(ctx, 'bedrock', (tctx) => {
      tctx.fillStyle = '#222222';
      tctx.fillRect(0, 0, 16, 16);
      const greys = ['#1a1a1a', '#444444', '#333333'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 7 + y * 17) % 3 === 0) {
            tctx.fillStyle = greys[(x + y) % greys.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Bookshelf
    this.drawTile(ctx, 'bookshelf', (tctx) => {
      tctx.fillStyle = '#8b5a2b';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#ef4444';
      tctx.fillRect(2, 2, 3, 12);
      tctx.fillStyle = '#3b82f6';
      tctx.fillRect(6, 2, 3, 12);
      tctx.fillStyle = '#10b981';
      tctx.fillRect(10, 2, 3, 12);
    });

    // TNT Side
    this.drawTile(ctx, 'tnt_side', (tctx) => {
      tctx.fillStyle = '#c72d24';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 6, 16, 4);
      tctx.fillStyle = '#000000';
      tctx.font = 'bold 8px sans-serif';
      tctx.fillText('TNT', 0, 10);
    });

    // TNT Top
    this.drawTile(ctx, 'tnt_top', (tctx) => {
      tctx.fillStyle = '#c72d24';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#8b0000';
      tctx.fillRect(4, 4, 8, 8);
    });

    // Water
    this.drawTile(ctx, 'water', (tctx) => {
      tctx.fillStyle = 'rgba(38, 101, 190, 0.7)';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      tctx.fillRect(2, 4, 6, 1);
      tctx.fillRect(8, 11, 5, 1);
    });

    // Flower
    this.drawTile(ctx, 'flower', (tctx) => {
      tctx.clearRect(0, 0, 16, 16);
      tctx.fillStyle = '#15803d';
      tctx.fillRect(7, 8, 2, 8);
      tctx.fillStyle = '#dc2626';
      tctx.fillRect(5, 3, 6, 6);
      tctx.fillStyle = '#fde047';
      tctx.fillRect(7, 5, 2, 2);
    });

    // Crafting Table Top
    this.drawTile(ctx, 'crafting_table_top', (tctx) => {
      tctx.fillStyle = '#a17e4f';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#6e522d';
      tctx.fillRect(2, 2, 12, 12);
      tctx.fillStyle = '#3a2512';
      tctx.fillRect(4, 4, 8, 8);
      tctx.fillStyle = '#3b82f6';
      tctx.fillRect(5, 5, 2, 2);
      tctx.fillStyle = '#ef4444';
      tctx.fillRect(9, 5, 2, 2);
    });

    // Crafting Table Side
    this.drawTile(ctx, 'crafting_table_side', (tctx) => {
      tctx.fillStyle = '#a17e4f';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#6e522d';
      tctx.fillRect(1, 1, 14, 14);
      tctx.fillStyle = '#3a2512';
      tctx.fillRect(3, 4, 10, 2);
      tctx.fillRect(7, 6, 2, 6);
    });

    // Chest Front
    this.drawTile(ctx, 'chest_front', (tctx) => {
      tctx.fillStyle = '#8b5a2b';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#4a2e12';
      tctx.fillRect(0, 0, 16, 1);
      tctx.fillRect(0, 15, 16, 1);
      tctx.fillRect(0, 7, 16, 1);
      tctx.fillStyle = '#e2e8f0';
      tctx.fillRect(7, 6, 2, 3);
    });

    // Chest Side
    this.drawTile(ctx, 'chest_side', (tctx) => {
      tctx.fillStyle = '#8b5a2b';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#4a2e12';
      tctx.fillRect(0, 0, 16, 1);
      tctx.fillRect(0, 15, 16, 1);
      tctx.fillRect(0, 7, 16, 1);
    });

    // Furnace Front
    this.drawTile(ctx, 'furnace_front', (tctx) => {
      tctx.fillStyle = '#686868';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#383838';
      tctx.fillRect(2, 4, 12, 9);
      tctx.fillStyle = '#f97316';
      tctx.fillRect(4, 7, 8, 4);
    });

    // Obsidian
    this.drawTile(ctx, 'obsidian', (tctx) => {
      tctx.fillStyle = '#1a1024';
      tctx.fillRect(0, 0, 16, 16);
      const obsColors = ['#120a1a', '#281838', '#38224d'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 13 + y * 19) % 3 === 0) {
            tctx.fillStyle = obsColors[(x + y) % obsColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Items
    this.drawTile(ctx, 'item_stick', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#7c5a36'; tctx.fillRect(4, 4, 8, 8); });
    this.drawTile(ctx, 'item_pickaxe', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#38bdf8'; tctx.fillRect(4, 2, 8, 4); });
    this.drawTile(ctx, 'item_sword', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#38bdf8'; tctx.fillRect(6, 2, 4, 10); });
    this.drawTile(ctx, 'item_helmet', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#38bdf8'; tctx.fillRect(3, 3, 10, 8); });
    this.drawTile(ctx, 'item_chestplate', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#38bdf8'; tctx.fillRect(2, 2, 12, 12); });
    this.drawTile(ctx, 'item_leggings', (tctx) => { tctx.clearRect(0, 0, 16, 16); tctx.fillStyle = '#38bdf8'; tctx.fillRect(2, 2, 12, 12); });

    // Snow
    this.drawTile(ctx, 'snow', (tctx) => {
      tctx.fillStyle = '#f1f5f9';
      tctx.fillRect(0, 0, 16, 16);
      const snowColors = ['#e2e8f0', '#ffffff', '#cbd5e1', '#f8fafc'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 11 + y * 13) % 4 === 0) {
            tctx.fillStyle = snowColors[(x + y) % snowColors.length];
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    // Cactus Top
    this.drawTile(ctx, 'cactus_top', (tctx) => {
      tctx.fillStyle = '#1e5e23';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#2e8b35';
      tctx.fillRect(2, 2, 12, 12);
      tctx.fillStyle = '#154418';
      tctx.fillRect(6, 6, 4, 4);
    });

    // Cactus Side
    this.drawTile(ctx, 'cactus_side', (tctx) => {
      tctx.fillStyle = '#226827';
      tctx.fillRect(0, 0, 16, 16);
      // Vertical ridges
      tctx.fillStyle = '#17491b';
      for (let x = 0; x < 16; x += 4) {
        tctx.fillRect(x, 0, 1, 16);
      }
      // Spikes
      tctx.fillStyle = '#e2e8f0';
      for (let x = 2; x < 16; x += 4) {
        for (let y = 1; y < 16; y += 4) {
          tctx.fillRect(x, y, 1, 1);
        }
      }
    });

    // Ice
    this.drawTile(ctx, 'ice', (tctx) => {
      tctx.fillStyle = '#90d5ec';
      tctx.fillRect(0, 0, 16, 16);
      tctx.fillStyle = '#bce6f5';
      for (let i = 0; i < 16; i += 3) {
        tctx.fillRect(i, (i * 2) % 16, 2, 2);
      }
    });

    // Snow Leaves
    this.drawTile(ctx, 'snow_leaves', (tctx) => {
      tctx.fillStyle = '#285e23';
      tctx.fillRect(0, 0, 16, 16);
      // Dark needle texture
      tctx.fillStyle = '#1a4216';
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 5 + y * 7) % 3 === 0) tctx.fillRect(x, y, 1, 1);
        }
      }
      // Snow dusting on leaves
      tctx.fillStyle = '#f8fafc';
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * 13 + y * 19) % 5 === 0) {
            tctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });
  }

  public getTileName(blockType: BlockType, faceIndex: number): string {
    switch (blockType) {
      case BlockType.GRASS:
        if (faceIndex === 2) return 'grass_top';
        if (faceIndex === 3) return 'dirt';
        return 'grass_side';
      case BlockType.DIRT: return 'dirt';
      case BlockType.STONE: return 'stone';
      case BlockType.COBBLESTONE: return 'cobblestone';
      case BlockType.WOOD:
        if (faceIndex === 2 || faceIndex === 3) return 'wood_top';
        return 'wood_side';
      case BlockType.PLANKS: return 'planks';
      case BlockType.LEAVES: return 'leaves';
      case BlockType.SAND: return 'sand';
      case BlockType.BRICK: return 'brick';
      case BlockType.GLASS: return 'glass';
      case BlockType.GLOWSTONE: return 'glowstone';
      case BlockType.DIAMOND_ORE: return 'diamond_ore';
      case BlockType.GOLD_ORE: return 'gold_ore';
      case BlockType.IRON_ORE: return 'iron_ore';
      case BlockType.COAL_ORE: return 'coal_ore';
      case BlockType.BEDROCK: return 'bedrock';
      case BlockType.BOOKSHELF:
        if (faceIndex === 2 || faceIndex === 3) return 'planks';
        return 'bookshelf';
      case BlockType.TNT:
        if (faceIndex === 2 || faceIndex === 3) return 'tnt_top';
        return 'tnt_side';
      case BlockType.WATER: return 'water';
      case BlockType.FLOWER: return 'flower';
      case BlockType.CRAFTING_TABLE:
        if (faceIndex === 2) return 'crafting_table_top';
        if (faceIndex === 3) return 'planks';
        return 'crafting_table_side';
      case BlockType.CHEST:
        if (faceIndex === 4) return 'chest_front';
        return 'chest_side';
      case BlockType.FURNACE:
        if (faceIndex === 4) return 'furnace_front';
        return 'stone';
      case BlockType.OBSIDIAN: return 'obsidian';
      case BlockType.SNOW: return 'snow';
      case BlockType.CACTUS:
        if (faceIndex === 2 || faceIndex === 3) return 'cactus_top';
        return 'cactus_side';
      case BlockType.ICE: return 'ice';
      case BlockType.SNOW_LEAVES: return 'snow_leaves';
      default: return 'stone';
    }
  }

  public getTileUVs(blockType: BlockType, faceIndex: number): UVRect {
    const tileName = this.getTileName(blockType, faceIndex);
    const pos = this.tileMap.get(tileName) || { col: 3, row: 0 }; // default stone

    const col = pos.col;
    const row = pos.row;

    const uMin = col / 8.0;
    const uMax = (col + 1) / 8.0;
    const vMin = 1.0 - (row + 1) / 8.0;
    const vMax = 1.0 - row / 8.0;

    const pad = 0.001;
    return {
      u0: uMin + pad,
      u1: uMax - pad,
      v0: vMin + pad,
      v1: vMax - pad,
    };
  }

  public getBlockMaterials(blockType: BlockType): THREE.Material | THREE.Material[] {
    const isTrans = blockType === BlockType.LEAVES || blockType === BlockType.GLASS || blockType === BlockType.FLOWER || blockType === BlockType.WATER;
    return isTrans ? this.masterTransparentMaterial : this.masterOpaqueMaterial;
  }

  public getIconDataUrl(id: number): string {
    let texName = 'stone';

    if (id === ItemType.STICK) texName = 'item_stick';
    else if (id === ItemType.WOODEN_PICKAXE || id === ItemType.STONE_PICKAXE || id === ItemType.DIAMOND_PICKAXE) texName = 'item_pickaxe';
    else if (id === ItemType.WOODEN_SWORD || id === ItemType.DIAMOND_SWORD) texName = 'item_sword';
    else if (id === ItemType.IRON_HELMET || id === ItemType.DIAMOND_HELMET) texName = 'item_helmet';
    else if (id === ItemType.IRON_CHESTPLATE || id === ItemType.DIAMOND_CHESTPLATE) texName = 'item_chestplate';
    else if (id === ItemType.IRON_LEGGINGS || id === ItemType.DIAMOND_LEGGINGS) texName = 'item_leggings';
    else {
      switch (id as BlockType) {
        case BlockType.CRAFTING_TABLE: texName = 'crafting_table_top'; break;
        case BlockType.CHEST: texName = 'chest_front'; break;
        case BlockType.FURNACE: texName = 'furnace_front'; break;
        case BlockType.OBSIDIAN: texName = 'obsidian'; break;
        case BlockType.IRON_ORE: texName = 'iron_ore'; break;
        case BlockType.COAL_ORE: texName = 'coal_ore'; break;
        case BlockType.GRASS: texName = 'grass_side'; break;
        case BlockType.DIRT: texName = 'dirt'; break;
        case BlockType.STONE: texName = 'stone'; break;
        case BlockType.WOOD: texName = 'wood_side'; break;
        case BlockType.PLANKS: texName = 'planks'; break;
        case BlockType.DIAMOND_ORE: texName = 'diamond_ore'; break;
        case BlockType.GOLD_ORE: texName = 'gold_ore'; break;
        case BlockType.TNT: texName = 'tnt_side'; break;
      }
    }

    const canvas = this.canvasMap.get(texName);
    return canvas ? canvas.toDataURL() : '';
  }
}
