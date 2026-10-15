import React, { useState } from 'react';
import { BlockType, ItemType, CRAFTING_RECIPES } from '../game/constants';
import { TextureManager } from '../game/textures/TextureAtlas';
import { Hammer, X, ArrowRight, Sparkles, Shield } from 'lucide-react';

interface CraftingModalProps {
  gridSize: 2 | 3;
  equippedArmor: { helmet: number | null; chestplate: number | null; leggings: number | null };
  onClose: () => void;
  onCraftItem: (itemId: number, count: number) => void;
  onEquipArmor: (itemId: number) => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  gridSize,
  equippedArmor,
  onClose,
  onCraftItem,
  onEquipArmor,
}) => {
  const texManager = TextureManager.getInstance();
  const numSlots = gridSize * gridSize;

  const [gridSlots, setGridSlots] = useState<(number | null)[]>(Array(numSlots).fill(null));
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<number | null>(BlockType.WOOD);

  const availableInventory = [
    BlockType.WOOD,
    BlockType.PLANKS,
    BlockType.COBBLESTONE,
    BlockType.SAND,
    ItemType.STICK,
    ItemType.DIAMOND,
  ];

  const handleSlotClick = (index: number) => {
    const newGrid = [...gridSlots];
    newGrid[index] = selectedInventoryItem;
    setGridSlots(newGrid);
  };

  const handleClearGrid = () => {
    setGridSlots(Array(numSlots).fill(null));
  };

  const checkRecipe = () => {
    for (const recipe of CRAFTING_RECIPES) {
      if (recipe.gridSize === gridSize) {
        let match = true;
        for (let i = 0; i < numSlots; i++) {
          if (gridSlots[i] !== recipe.pattern[i]) {
            match = false;
            break;
          }
        }
        if (match) return recipe;
      }
    }
    return null;
  };

  const matchedRecipe = checkRecipe();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Hammer className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-amber-400">
              {gridSize === 3 ? 'Крафт на Верстаке (3x3)' : 'Инвентарь & Снаряжение (2x2)'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Equipped Armor Display */}
        <div className="my-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
            <Shield className="w-5 h-5 fill-sky-400" />
            <span>Экипированная броня:</span>
          </div>

          <div className="flex gap-2">
            {/* Helmet */}
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center relative" title="Шлем">
              {equippedArmor.helmet ? (
                <img src={texManager.getIconDataUrl(equippedArmor.helmet)} alt="helmet" className="w-7 h-7 object-contain image-rendering-pixelated" />
              ) : (
                <span className="text-[10px] text-stone-600 font-bold">Шлем</span>
              )}
            </div>

            {/* Chestplate */}
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center relative" title="Нагрудник">
              {equippedArmor.chestplate ? (
                <img src={texManager.getIconDataUrl(equippedArmor.chestplate)} alt="chestplate" className="w-7 h-7 object-contain image-rendering-pixelated" />
              ) : (
                <span className="text-[10px] text-stone-600 font-bold">Броня</span>
              )}
            </div>

            {/* Leggings */}
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center relative" title="Поножи">
              {equippedArmor.leggings ? (
                <img src={texManager.getIconDataUrl(equippedArmor.leggings)} alt="leggings" className="w-7 h-7 object-contain image-rendering-pixelated" />
              ) : (
                <span className="text-[10px] text-stone-600 font-bold">Ноги</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Helper Chips */}
        <div className="mb-2">
          <p className="text-[11px] font-bold text-stone-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Быстрый рецепт:
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {gridSize === 3 && (
              <>
                <button
                  onClick={() => setGridSlots([ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, null, ItemType.DIAMOND, null, null, null])}
                  className="text-[11px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 px-2.5 py-1 rounded-lg shrink-0 hover:bg-sky-500/30"
                >
                  🛡️ Алмазный Шлем
                </button>

                <button
                  onClick={() => setGridSlots([ItemType.DIAMOND, null, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND])}
                  className="text-[11px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 px-2.5 py-1 rounded-lg shrink-0 hover:bg-sky-500/30"
                >
                  🛡️ Алмазный Нагрудник
                </button>

                <button
                  onClick={() => setGridSlots([ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, ItemType.DIAMOND, null, ItemType.DIAMOND, ItemType.DIAMOND, null, ItemType.DIAMOND])}
                  className="text-[11px] font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300 px-2.5 py-1 rounded-lg shrink-0 hover:bg-sky-500/30"
                >
                  🛡️ Алмазные Поножи
                </button>
              </>
            )}
          </div>
        </div>

        {/* Crafting Grid */}
        <div className="flex items-center justify-center gap-6 my-3 bg-stone-950/80 p-4 rounded-2xl border border-stone-800">
          <div className={`grid gap-2 ${gridSize === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {gridSlots.map((slotItem, idx) => (
              <button
                key={idx}
                onClick={() => handleSlotClick(idx)}
                className="w-14 h-14 bg-stone-800 border-2 border-stone-700 hover:border-amber-400 rounded-xl flex items-center justify-center transition-colors relative"
              >
                {slotItem !== null && (
                  <img src={texManager.getIconDataUrl(slotItem)} alt="item" className="w-10 h-10 object-contain image-rendering-pixelated" />
                )}
              </button>
            ))}
          </div>

          <ArrowRight className="w-8 h-8 text-amber-400 shrink-0 animate-pulse" />

          {/* Output Slot */}
          <div className="flex flex-col items-center">
            <div className="w-18 h-18 bg-amber-500/20 border-2 border-amber-400 rounded-2xl flex items-center justify-center relative shadow-lg shadow-amber-500/20">
              {matchedRecipe ? (
                <>
                  <img src={texManager.getIconDataUrl(matchedRecipe.result.itemId)} alt="result" className="w-12 h-12 object-contain image-rendering-pixelated" />
                  <span className="absolute bottom-1 right-2 text-xs font-black text-amber-300">x{matchedRecipe.result.count}</span>
                </>
              ) : (
                <span className="text-xs text-stone-600 font-bold">Пусто</span>
              )}
            </div>

            {matchedRecipe && (
              <div className="flex flex-col gap-1 mt-2">
                <button
                  onClick={() => {
                    onCraftItem(matchedRecipe.result.itemId, matchedRecipe.result.count);
                    handleClearGrid();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-transform active:scale-95 shadow-md"
                >
                  СБРАФТИТЬ!
                </button>

                {matchedRecipe.result.itemId >= 112 && matchedRecipe.result.itemId <= 117 && (
                  <button
                    onClick={() => {
                      onEquipArmor(matchedRecipe.result.itemId);
                      handleClearGrid();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-black text-xs transition-transform active:scale-95 shadow-md"
                  >
                    НАДЕТЬ БРОНЮ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Item Selection Palette */}
        <div className="mt-2 pt-2 border-t border-stone-800">
          <p className="text-xs font-bold text-stone-400 mb-2">Предметы для установки в сетку:</p>
          <div className="flex gap-2 justify-center">
            {availableInventory.map((item) => (
              <button
                key={item}
                onClick={() => setSelectedInventoryItem(item)}
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${
                  selectedInventoryItem === item ? 'bg-amber-500/30 border-amber-400 scale-105' : 'bg-stone-800 border-stone-700'
                }`}
              >
                <img src={texManager.getIconDataUrl(item)} alt="item" className="w-8 h-8 object-contain image-rendering-pixelated" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
