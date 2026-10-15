export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_HEIGHT = 64;
export const SEA_LEVEL = 16;
export const CHUNK_RADIUS = 3;

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  COBBLESTONE = 7,
  PLANKS = 8,
  BRICK = 9,
  GLASS = 10,
  GLOWSTONE = 11,
  DIAMOND_ORE = 12,
  GOLD_ORE = 13,
  BEDROCK = 14,
  BOOKSHELF = 15,
  TNT = 16,
  WATER = 17,
  FLOWER = 18,
  CRAFTING_TABLE = 19,
  CHEST = 20,
  FURNACE = 21,
  OBSIDIAN = 22,
  IRON_ORE = 23,
  COAL_ORE = 24,
}

export enum ItemType {
  STICK = 101,
  WOODEN_PICKAXE = 102,
  STONE_PICKAXE = 103,
  IRON_PICKAXE = 104,
  DIAMOND_PICKAXE = 105,
  WOODEN_SWORD = 106,
  DIAMOND_SWORD = 107,
  COAL = 108,
  IRON_INGOT = 109,
  GOLD_INGOT = 110,
  DIAMOND = 111,

  // Armor Equipment
  IRON_HELMET = 112,
  DIAMOND_HELMET = 113,
  IRON_CHESTPLATE = 114,
  DIAMOND_CHESTPLATE = 115,
  IRON_LEGGINGS = 116,
  DIAMOND_LEGGINGS = 117,
}

export interface BlockDefinition {
  id: BlockType;
  name: string;
  nameRu: string;
  color: string;
  solid: boolean;
  transparent: boolean;
  emissive?: boolean;
  soundType: 'grass' | 'dirt' | 'stone' | 'wood' | 'glass' | 'sand';
}

export const BLOCK_DEFS: Record<BlockType, BlockDefinition> = {
  [BlockType.AIR]: { id: BlockType.AIR, name: 'Air', nameRu: 'Воздух', color: '#000000', solid: false, transparent: true, soundType: 'dirt' },
  [BlockType.GRASS]: { id: BlockType.GRASS, name: 'Grass Block', nameRu: 'Блок травы', color: '#55a137', solid: true, transparent: false, soundType: 'grass' },
  [BlockType.DIRT]: { id: BlockType.DIRT, name: 'Dirt', nameRu: 'Земля', color: '#866043', solid: true, transparent: false, soundType: 'dirt' },
  [BlockType.STONE]: { id: BlockType.STONE, name: 'Stone', nameRu: 'Камень', color: '#7b7b7b', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.WOOD]: { id: BlockType.WOOD, name: 'Oak Log', nameRu: 'Древесина дуба', color: '#675232', solid: true, transparent: false, soundType: 'wood' },
  [BlockType.LEAVES]: { id: BlockType.LEAVES, name: 'Oak Leaves', nameRu: 'Листва', color: '#387322', solid: true, transparent: true, soundType: 'grass' },
  [BlockType.SAND]: { id: BlockType.SAND, name: 'Sand', nameRu: 'Песок', color: '#d6cd94', solid: true, transparent: false, soundType: 'sand' },
  [BlockType.COBBLESTONE]: { id: BlockType.COBBLESTONE, name: 'Cobblestone', nameRu: 'Булыжник', color: '#616161', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.PLANKS]: { id: BlockType.PLANKS, name: 'Oak Planks', nameRu: 'Дубовые доски', color: '#9c7a4c', solid: true, transparent: false, soundType: 'wood' },
  [BlockType.BRICK]: { id: BlockType.BRICK, name: 'Bricks', nameRu: 'Кирпичи', color: '#944b3c', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.GLASS]: { id: BlockType.GLASS, name: 'Glass', nameRu: 'Стекло', color: '#aed8f2', solid: true, transparent: true, soundType: 'glass' },
  [BlockType.GLOWSTONE]: { id: BlockType.GLOWSTONE, name: 'Glowstone', nameRu: 'Светящийся камень', color: '#ffe066', solid: true, transparent: false, emissive: true, soundType: 'glass' },
  [BlockType.DIAMOND_ORE]: { id: BlockType.DIAMOND_ORE, name: 'Diamond Ore', nameRu: 'Алмазная руда', color: '#4dedf4', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.GOLD_ORE]: { id: BlockType.GOLD_ORE, name: 'Gold Ore', nameRu: 'Золотая руда', color: '#fcee4b', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.BEDROCK]: { id: BlockType.BEDROCK, name: 'Bedrock', nameRu: 'Коренная порода', color: '#2e2e2e', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.BOOKSHELF]: { id: BlockType.BOOKSHELF, name: 'Bookshelf', nameRu: 'Книжная полка', color: '#8b5a2b', solid: true, transparent: false, soundType: 'wood' },
  [BlockType.TNT]: { id: BlockType.TNT, name: 'TNT', nameRu: 'Динамит', color: '#db3224', solid: true, transparent: false, soundType: 'grass' },
  [BlockType.WATER]: { id: BlockType.WATER, name: 'Water', nameRu: 'Вода', color: '#2e75d3', solid: false, transparent: true, soundType: 'sand' },
  [BlockType.FLOWER]: { id: BlockType.FLOWER, name: 'Red Poppy', nameRu: 'Красный цветок', color: '#e62424', solid: false, transparent: true, soundType: 'grass' },
  [BlockType.CRAFTING_TABLE]: { id: BlockType.CRAFTING_TABLE, name: 'Crafting Table', nameRu: 'Верстак', color: '#a17e4f', solid: true, transparent: false, soundType: 'wood' },
  [BlockType.CHEST]: { id: BlockType.CHEST, name: 'Chest', nameRu: 'Сундук', color: '#8b5a2b', solid: true, transparent: false, soundType: 'wood' },
  [BlockType.FURNACE]: { id: BlockType.FURNACE, name: 'Furnace', nameRu: 'Печь', color: '#686868', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.OBSIDIAN]: { id: BlockType.OBSIDIAN, name: 'Obsidian', nameRu: 'Обсидиан', color: '#1a1024', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.IRON_ORE]: { id: BlockType.IRON_ORE, name: 'Iron Ore', nameRu: 'Железная руда', color: '#d8af93', solid: true, transparent: false, soundType: 'stone' },
  [BlockType.COAL_ORE]: { id: BlockType.COAL_ORE, name: 'Coal Ore', nameRu: 'Угольная руда', color: '#333333', solid: true, transparent: false, soundType: 'stone' },
};

export const SELECTABLE_BLOCKS: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.COBBLESTONE,
  BlockType.WOOD,
  BlockType.PLANKS,
  BlockType.CRAFTING_TABLE,
  BlockType.CHEST,
  BlockType.LEAVES,
  BlockType.BRICK,
  BlockType.GLASS,
  BlockType.GLOWSTONE,
  BlockType.DIAMOND_ORE,
  BlockType.GOLD_ORE,
  BlockType.IRON_ORE,
  BlockType.OBSIDIAN,
  BlockType.BOOKSHELF,
  BlockType.TNT,
  BlockType.SAND,
  BlockType.FLOWER,
];

export interface CraftingRecipe {
  id: string;
  nameRu: string;
  gridSize: 2 | 3;
  pattern: (number | null)[];
  result: { itemId: number; count: number };
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'planks_from_wood',
    nameRu: 'Дубовые доски (x4)',
    gridSize: 2,
    pattern: [BlockType.WOOD, null, null, null],
    result: { itemId: BlockType.PLANKS, count: 4 },
  },
  {
    id: 'sticks_from_planks',
    nameRu: 'Палочки (x4)',
    gridSize: 2,
    pattern: [BlockType.PLANKS, null, BlockType.PLANKS, null],
    result: { itemId: ItemType.STICK, count: 4 },
  },
  {
    id: 'crafting_table',
    nameRu: 'Верстак',
    gridSize: 2,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS,
      BlockType.PLANKS, BlockType.PLANKS
    ],
    result: { itemId: BlockType.CRAFTING_TABLE, count: 1 },
  },
  {
    id: 'furnace',
    nameRu: 'Печь',
    gridSize: 3,
    pattern: [
      BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE,
      BlockType.COBBLESTONE, null,                 BlockType.COBBLESTONE,
      BlockType.COBBLESTONE, BlockType.COBBLESTONE, BlockType.COBBLESTONE
    ],
    result: { itemId: BlockType.FURNACE, count: 1 },
  },
  {
    id: 'chest',
    nameRu: 'Сундук',
    gridSize: 3,
    pattern: [
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS,
      BlockType.PLANKS, null,             BlockType.PLANKS,
      BlockType.PLANKS, BlockType.PLANKS, BlockType.PLANKS
    ],
    result: { itemId: BlockType.CHEST, count: 1 },
  },
  {
    id: 'diamond_pickaxe',
    nameRu: 'Алмазная кирка',
    gridSize: 3,
    pattern: [
      ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND,
      null,             ItemType.STICK,   null,
      null,             ItemType.STICK,   null
    ],
    result: { itemId: ItemType.DIAMOND_PICKAXE, count: 1 },
  },
  {
    id: 'diamond_sword',
    nameRu: 'Алмазный меч',
    gridSize: 3,
    pattern: [
      null, ItemType.DIAMOND, null,
      null, ItemType.DIAMOND, null,
      null, ItemType.STICK,   null
    ],
    result: { itemId: ItemType.DIAMOND_SWORD, count: 1 },
  },

  // Armor Recipes
  {
    id: 'diamond_helmet',
    nameRu: 'Алмазный шлем',
    gridSize: 3,
    pattern: [
      ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND,
      ItemType.DIAMOND, null,             ItemType.DIAMOND,
      null,             null,             null
    ],
    result: { itemId: ItemType.DIAMOND_HELMET, count: 1 },
  },
  {
    id: 'diamond_chestplate',
    nameRu: 'Алмазный нагрудник',
    gridSize: 3,
    pattern: [
      ItemType.DIAMOND, null,             ItemType.DIAMOND,
      ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND,
      ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND
    ],
    result: { itemId: ItemType.DIAMOND_CHESTPLATE, count: 1 },
  },
  {
    id: 'diamond_leggings',
    nameRu: 'Алмазные поножи',
    gridSize: 3,
    pattern: [
      ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND,
      ItemType.DIAMOND, null,             ItemType.DIAMOND,
      ItemType.DIAMOND, null,             ItemType.DIAMOND
    ],
    result: { itemId: ItemType.DIAMOND_LEGGINGS, count: 1 },
  },
];
