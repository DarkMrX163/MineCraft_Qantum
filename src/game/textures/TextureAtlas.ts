import * as THREE from 'three';
import { BlockType, ItemType } from '../constants';

export class TextureManager {
  private static instance: TextureManager;
  private canvasMap = new Map<string, HTMLCanvasElement>();
  private textureMap = new Map<string, THREE.CanvasTexture>();
  public masterMaterials: THREE.Material[] = [];
  private materialIndexMap = new Map<string, number>();

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  constructor() {
    this.generateAllTextures();
    this.buildMasterMaterials();
  }

  private createPixelCanvas(drawFn: (ctx: CanvasRenderingContext2D) => void, size = 16): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return canvas;
  }

  private getOrCreateTexture(name: string, drawFn: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    let texture = this.textureMap.get(name);
    if (!texture) {
      const canvas = this.createPixelCanvas(drawFn);
      this.canvasMap.set(name, canvas);
      texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textureMap.set(name, texture);
    }
    return texture;
  }

  private registerMaterial(name: string, transparent = false, opacity = 1.0, emissive = false): number {
    if (this.materialIndexMap.has(name)) {
      return this.materialIndexMap.get(name)!;
    }
    const tex = this.getTexture(name);
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent,
      opacity,
      emissive: emissive ? new THREE.Color(0xffe066) : new THREE.Color(0x000000),
      emissiveIntensity: emissive ? 0.6 : 0,
      alphaTest: transparent && opacity === 1.0 ? 0.5 : 0,
      side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    const idx = this.masterMaterials.length;
    this.masterMaterials.push(mat);
    this.materialIndexMap.set(name, idx);
    return idx;
  }

  private buildMasterMaterials() {
    this.registerMaterial('grass_top');
    this.registerMaterial('grass_side');
    this.registerMaterial('dirt');
    this.registerMaterial('stone');
    this.registerMaterial('cobblestone');
    this.registerMaterial('wood_side');
    this.registerMaterial('wood_top');
    this.registerMaterial('planks');
    this.registerMaterial('leaves', true, 1.0);
    this.registerMaterial('sand');
    this.registerMaterial('brick');
    this.registerMaterial('glass', true, 0.65);
    this.registerMaterial('glowstone', false, 1.0, true);
    this.registerMaterial('diamond_ore');
    this.registerMaterial('gold_ore');
    this.registerMaterial('iron_ore');
    this.registerMaterial('coal_ore');
    this.registerMaterial('bedrock');
    this.registerMaterial('bookshelf');
    this.registerMaterial('tnt_side');
    this.registerMaterial('tnt_top');
    this.registerMaterial('water', true, 0.7);
    this.registerMaterial('flower', true, 1.0);
    this.registerMaterial('crafting_table_top');
    this.registerMaterial('crafting_table_side');
    this.registerMaterial('chest_front');
    this.registerMaterial('chest_side');
    this.registerMaterial('furnace_front');
    this.registerMaterial('obsidian');
  }

  public getMaterialIndex(blockType: BlockType, faceIndex: number): number {
    switch (blockType) {
      case BlockType.GRASS:
        if (faceIndex === 2) return this.materialIndexMap.get('grass_top')!;
        if (faceIndex === 3) return this.materialIndexMap.get('dirt')!;
        return this.materialIndexMap.get('grass_side')!;

      case BlockType.DIRT: return this.materialIndexMap.get('dirt')!;
      case BlockType.STONE: return this.materialIndexMap.get('stone')!;
      case BlockType.COBBLESTONE: return this.materialIndexMap.get('cobblestone')!;
      case BlockType.WOOD:
        if (faceIndex === 2 || faceIndex === 3) return this.materialIndexMap.get('wood_top')!;
        return this.materialIndexMap.get('wood_side')!;
      case BlockType.PLANKS: return this.materialIndexMap.get('planks')!;
      case BlockType.LEAVES: return this.materialIndexMap.get('leaves')!;
      case BlockType.SAND: return this.materialIndexMap.get('sand')!;
      case BlockType.BRICK: return this.materialIndexMap.get('brick')!;
      case BlockType.GLASS: return this.materialIndexMap.get('glass')!;
      case BlockType.GLOWSTONE: return this.materialIndexMap.get('glowstone')!;
      case BlockType.DIAMOND_ORE: return this.materialIndexMap.get('diamond_ore')!;
      case BlockType.GOLD_ORE: return this.materialIndexMap.get('gold_ore')!;
      case BlockType.IRON_ORE: return this.materialIndexMap.get('iron_ore')!;
      case BlockType.COAL_ORE: return this.materialIndexMap.get('coal_ore')!;
      case BlockType.BEDROCK: return this.materialIndexMap.get('bedrock')!;
      case BlockType.BOOKSHELF:
        if (faceIndex === 2 || faceIndex === 3) return this.materialIndexMap.get('planks')!;
        return this.materialIndexMap.get('bookshelf')!;
      case BlockType.TNT:
        if (faceIndex === 2 || faceIndex === 3) return this.materialIndexMap.get('tnt_top')!;
        return this.materialIndexMap.get('tnt_side')!;
      case BlockType.WATER: return this.materialIndexMap.get('water')!;
      case BlockType.FLOWER: return this.materialIndexMap.get('flower')!;
      case BlockType.CRAFTING_TABLE:
        if (faceIndex === 2) return this.materialIndexMap.get('crafting_table_top')!;
        if (faceIndex === 3) return this.materialIndexMap.get('planks')!;
        return this.materialIndexMap.get('crafting_table_side')!;
      case BlockType.CHEST:
        if (faceIndex === 4) return this.materialIndexMap.get('chest_front')!;
        return this.materialIndexMap.get('chest_side')!;
      case BlockType.FURNACE:
        if (faceIndex === 4) return this.materialIndexMap.get('furnace_front')!;
        return this.materialIndexMap.get('stone')!;
      case BlockType.OBSIDIAN: return this.materialIndexMap.get('obsidian')!;
      default: return this.materialIndexMap.get('stone')!;
    }
  }

  private generateAllTextures() {
    this.getOrCreateTexture('dirt', (ctx) => { ctx.fillStyle = '#866043'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('grass_top', (ctx) => { ctx.fillStyle = '#55a137'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('grass_side', (ctx) => { ctx.fillStyle = '#866043'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#55a137'; ctx.fillRect(0, 0, 16, 3); });
    this.getOrCreateTexture('stone', (ctx) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('cobblestone', (ctx) => { ctx.fillStyle = '#656565'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('wood_side', (ctx) => { ctx.fillStyle = '#5c462b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('wood_top', (ctx) => { ctx.fillStyle = '#5c462b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('planks', (ctx) => { ctx.fillStyle = '#a17e4f'; ctx.fillRect(0, 0, 16, 16); });

    // Armor Textures
    this.getOrCreateTexture('item_helmet', (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#38bdf8'; // Diamond helmet color
      ctx.fillRect(3, 3, 10, 8);
      ctx.fillRect(2, 6, 12, 5);
      ctx.clearRect(6, 8, 4, 3);
    });

    this.getOrCreateTexture('item_chestplate', (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#38bdf8'; // Diamond chestplate color
      ctx.fillRect(2, 2, 4, 12);
      ctx.fillRect(10, 2, 4, 12);
      ctx.fillRect(4, 5, 8, 9);
      ctx.clearRect(6, 2, 4, 3);
    });

    this.getOrCreateTexture('item_leggings', (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#38bdf8'; // Diamond leggings color
      ctx.fillRect(2, 2, 12, 5);
      ctx.fillRect(2, 7, 4, 8);
      ctx.fillRect(10, 7, 4, 8);
    });

    this.getOrCreateTexture('crafting_table_top', (ctx) => { ctx.fillStyle = '#a17e4f'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('crafting_table_side', (ctx) => { ctx.fillStyle = '#a17e4f'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('chest_front', (ctx) => { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('chest_side', (ctx) => { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('furnace_front', (ctx) => { ctx.fillStyle = '#686868'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('obsidian', (ctx) => { ctx.fillStyle = '#1a1024'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('iron_ore', (ctx) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('coal_ore', (ctx) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('item_stick', (ctx) => { ctx.clearRect(0, 0, 16, 16); ctx.fillStyle = '#7c5a36'; ctx.fillRect(4, 4, 8, 8); });
    this.getOrCreateTexture('item_pickaxe', (ctx) => { ctx.clearRect(0, 0, 16, 16); ctx.fillStyle = '#38bdf8'; ctx.fillRect(4, 2, 8, 4); });
    this.getOrCreateTexture('item_sword', (ctx) => { ctx.clearRect(0, 0, 16, 16); ctx.fillStyle = '#38bdf8'; ctx.fillRect(6, 2, 4, 10); });
    this.getOrCreateTexture('leaves', (ctx) => { ctx.fillStyle = '#3a7d23'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('sand', (ctx) => { ctx.fillStyle = '#d6cd94'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('brick', (ctx) => { ctx.fillStyle = '#9c4c3b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('glass', (ctx) => { ctx.fillStyle = '#a4d4e8'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('glowstone', (ctx) => { ctx.fillStyle = '#e6bf55'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('diamond_ore', (ctx) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('gold_ore', (ctx) => { ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('bedrock', (ctx) => { ctx.fillStyle = '#222222'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('bookshelf', (ctx) => { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('tnt_side', (ctx) => { ctx.fillStyle = '#c72d24'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('tnt_top', (ctx) => { ctx.fillStyle = '#c72d24'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('water', (ctx) => { ctx.fillStyle = '#2665be'; ctx.fillRect(0, 0, 16, 16); });
    this.getOrCreateTexture('flower', (ctx) => { ctx.fillStyle = '#e62222'; ctx.fillRect(6, 4, 4, 4); });
  }

  public getTexture(name: string): THREE.CanvasTexture {
    return this.textureMap.get(name) || this.textureMap.get('stone')!;
  }

  public getBlockMaterials(blockType: BlockType): THREE.Material[] {
    const createMat = (name: string) => {
      const idx = this.materialIndexMap.get(name) || 0;
      return this.masterMaterials[idx];
    };
    const mat = createMat('stone');
    return [mat, mat, mat, mat, mat, mat];
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
