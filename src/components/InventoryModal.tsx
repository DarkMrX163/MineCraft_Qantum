import React, { useState } from 'react';
import { BlockType, ItemType, BLOCK_DEFS, CRAFTING_RECIPES } from '../game/constants';
import { TextureManager } from '../game/textures/TextureAtlas';
import { ItemStack } from '../game/entities/DroppedItemEntity';
import { X, Shield, ArrowRight, Trash2, Box, Sparkles } from 'lucide-react';
import { PlayerStats } from '../game/player/PlayerStats';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryGrid: (ItemStack | null)[]; // 27 slots (0..26)
  hotbarGrid: (ItemStack | null)[];    // 9 slots (0..8)
  selectedHotbarIdx: number;
  onSelectHotbarIdx: (idx: number) => void;
  onUpdateInventory: (newInv: (ItemStack | null)[], newHotbar: (ItemStack | null)[]) => void;
  onThrowItem: (item: ItemStack) => void;
  playerStats: PlayerStats;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventoryGrid,
  hotbarGrid,
  selectedHotbarIdx,
  onSelectHotbarIdx,
  onUpdateInventory,
  onThrowItem,
  playerStats,
}) => {
  const [heldItem, setHeldItem] = useState<ItemStack | null>(null);
  const [craftingGrid, setCraftingGrid] = useState<(ItemStack | null)[]>([null, null, null, null]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const texManager = TextureManager.getInstance();

  const getItemName = (id: number): string => {
    if (id in BLOCK_DEFS && id !== BlockType.AIR) {
      return BLOCK_DEFS[id as BlockType].nameRu;
    }
    switch (id) {
      case ItemType.STICK: return 'Палочка';
      case ItemType.WOODEN_PICKAXE: return 'Деревянная кирка';
      case ItemType.STONE_PICKAXE: return 'Каменная кирка';
      case ItemType.IRON_PICKAXE: return 'Железная кирка';
      case ItemType.DIAMOND_PICKAXE: return 'Алмазная кирка';
      case ItemType.WOODEN_SWORD: return 'Деревянный меч';
      case ItemType.DIAMOND_SWORD: return 'Алмазный меч';
      case ItemType.COAL: return 'Уголь';
      case ItemType.IRON_INGOT: return 'Железный слиток';
      case ItemType.GOLD_INGOT: return 'Золотой слиток';
      case ItemType.DIAMOND: return 'Алмаз';
      case ItemType.IRON_HELMET: return 'Железный шлем';
      case ItemType.DIAMOND_HELMET: return 'Алмазный шлем';
      case ItemType.IRON_CHESTPLATE: return 'Железный нагрудник';
      case ItemType.DIAMOND_CHESTPLATE: return 'Алмазный нагрудник';
      case ItemType.IRON_LEGGINGS: return 'Железные поножи';
      case ItemType.DIAMOND_LEGGINGS: return 'Алмазные поножи';
      case ItemType.RAW_MEAT: return 'Сырое мясо';
      case ItemType.COOKED_MEAT: return 'Жареное мясо';
      case ItemType.BONE: return 'Кость';
      default: return 'Предмет';
    }
  };

  // Check 2x2 Crafting Recipe
  const checkCraftingRecipe = (grid: (ItemStack | null)[]): ItemStack | null => {
    const pattern = grid.map((slot) => (slot ? slot.itemId : null));
    for (const recipe of CRAFTING_RECIPES) {
      if (recipe.gridSize === 2) {
        let match = true;
        for (let i = 0; i < 4; i++) {
          if (pattern[i] !== recipe.pattern[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          return { itemId: recipe.result.itemId, count: recipe.result.count };
        }
      }
    }
    return null;
  };

  const craftResult = checkCraftingRecipe(craftingGrid);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Slot Click Handler
  const handleSlotClick = (
    location: 'inv' | 'hotbar' | 'craft' | 'helmet' | 'chest' | 'leggings',
    index: number,
    isRightClick = false
  ) => {
    const newInv = [...inventoryGrid];
    const newHotbar = [...hotbarGrid];
    const newCraft = [...craftingGrid];

    if (location === 'inv') {
      const current = newInv[index];
      if (!heldItem) {
        if (current) {
          if (isRightClick && current.count > 1) {
            const takeCount = Math.ceil(current.count / 2);
            setHeldItem({ itemId: current.itemId, count: takeCount });
            newInv[index] = { itemId: current.itemId, count: current.count - takeCount };
          } else {
            setHeldItem(current);
            newInv[index] = null;
          }
        }
      } else {
        if (!current) {
          if (isRightClick) {
            newInv[index] = { itemId: heldItem.itemId, count: 1 };
            if (heldItem.count > 1) {
              setHeldItem({ ...heldItem, count: heldItem.count - 1 });
            } else {
              setHeldItem(null);
            }
          } else {
            newInv[index] = heldItem;
            setHeldItem(null);
          }
        } else if (current.itemId === heldItem.itemId) {
          const maxStack = 64;
          if (isRightClick) {
            if (current.count < maxStack) {
              newInv[index] = { ...current, count: current.count + 1 };
              if (heldItem.count > 1) {
                setHeldItem({ ...heldItem, count: heldItem.count - 1 });
              } else {
                setHeldItem(null);
              }
            }
          } else {
            const space = maxStack - current.count;
            if (space >= heldItem.count) {
              newInv[index] = { ...current, count: current.count + heldItem.count };
              setHeldItem(null);
            } else {
              newInv[index] = { ...current, count: maxStack };
              setHeldItem({ ...heldItem, count: heldItem.count - space });
            }
          }
        } else {
          // Swap
          newInv[index] = heldItem;
          setHeldItem(current);
        }
      }
    } else if (location === 'hotbar') {
      const current = newHotbar[index];
      if (!heldItem) {
        if (current) {
          setHeldItem(current);
          newHotbar[index] = null;
        }
      } else {
        if (!current) {
          newHotbar[index] = heldItem;
          setHeldItem(null);
        } else if (current.itemId === heldItem.itemId) {
          const space = 64 - current.count;
          if (space >= heldItem.count) {
            newHotbar[index] = { ...current, count: current.count + heldItem.count };
            setHeldItem(null);
          } else {
            newHotbar[index] = { ...current, count: 64 };
            setHeldItem({ ...heldItem, count: heldItem.count - space });
          }
        } else {
          newHotbar[index] = heldItem;
          setHeldItem(current);
        }
      }
    } else if (location === 'craft') {
      const current = newCraft[index];
      if (!heldItem) {
        if (current) {
          setHeldItem(current);
          newCraft[index] = null;
        }
      } else {
        newCraft[index] = { itemId: heldItem.itemId, count: 1 };
        if (heldItem.count > 1) {
          setHeldItem({ ...heldItem, count: heldItem.count - 1 });
        } else {
          setHeldItem(null);
        }
      }
      setCraftingGrid(newCraft);
    }

    onUpdateInventory(newInv, newHotbar);
  };

  // Collect Craft Result
  const handleTakeCraftResult = () => {
    if (!craftResult) return;

    if (!heldItem) {
      setHeldItem(craftResult);
    } else if (heldItem.itemId === craftResult.itemId) {
      setHeldItem({ ...heldItem, count: heldItem.count + craftResult.count });
    } else {
      return; // Cannot pick up if holding different item
    }

    // Deduct 1 from each crafting grid slot
    const newCraft = craftingGrid.map((slot) => {
      if (!slot) return null;
      if (slot.count > 1) return { ...slot, count: slot.count - 1 };
      return null;
    });
    setCraftingGrid(newCraft);
  };

  // Throw Held Item Out
  const handleThrowHeldItem = () => {
    if (heldItem) {
      onThrowItem(heldItem);
      setHeldItem(null);
    }
  };

  const renderSlot = (item: ItemStack | null, onClick: (e: React.MouseEvent) => void, extraClasses = '') => {
    const iconUrl = item ? texManager.getIconDataUrl(item.itemId) : '';
    const name = item ? getItemName(item.itemId) : '';

    return (
      <button
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onClick(e);
        }}
        title={name}
        className={`relative w-12 h-12 sm:w-14 sm:h-14 bg-stone-950/80 border-2 border-stone-700/80 hover:border-amber-400 rounded-xl flex items-center justify-center transition-all ${extraClasses}`}
      >
        {item && (
          <>
            <img
              src={iconUrl}
              alt={name}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain image-rendering-pixelated drop-shadow-md"
            />
            {item.count > 1 && (
              <span className="absolute bottom-1 right-1 text-xs font-black text-white bg-black/80 px-1 py-0.2 rounded text-[11px] leading-tight">
                {item.count}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 pointer-events-auto select-none animate-in fade-in duration-200"
    >
      <div className="bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-5 max-w-2xl w-full shadow-2xl flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Box className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-amber-400">Инвентарь Майнкрафт</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 hidden sm:inline">Клавиша E для входа/выхода</span>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Top Section: Armor / Character & 2x2 Crafting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-950/50 p-4 rounded-2xl border border-stone-800">
          {/* Armor & Character */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              {/* Helmet Slot */}
              <div
                onClick={() => {
                  if (playerStats.helmet) {
                    onThrowItem({ itemId: playerStats.helmet, count: 1 });
                    playerStats.helmet = null;
                  }
                }}
                className="w-12 h-12 bg-stone-900 border-2 border-amber-500/30 rounded-xl flex items-center justify-center relative cursor-pointer hover:border-amber-400"
                title="Шлем"
              >
                {playerStats.helmet ? (
                  <img
                    src={texManager.getIconDataUrl(playerStats.helmet)}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Shield className="w-6 h-6 text-stone-600" />
                )}
              </div>
              {/* Chestplate Slot */}
              <div
                onClick={() => {
                  if (playerStats.chestplate) {
                    onThrowItem({ itemId: playerStats.chestplate, count: 1 });
                    playerStats.chestplate = null;
                  }
                }}
                className="w-12 h-12 bg-stone-900 border-2 border-amber-500/30 rounded-xl flex items-center justify-center relative cursor-pointer hover:border-amber-400"
                title="Нагрудник"
              >
                {playerStats.chestplate ? (
                  <img
                    src={texManager.getIconDataUrl(playerStats.chestplate)}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Shield className="w-6 h-6 text-stone-600" />
                )}
              </div>
              {/* Leggings Slot */}
              <div
                onClick={() => {
                  if (playerStats.leggings) {
                    onThrowItem({ itemId: playerStats.leggings, count: 1 });
                    playerStats.leggings = null;
                  }
                }}
                className="w-12 h-12 bg-stone-900 border-2 border-amber-500/30 rounded-xl flex items-center justify-center relative cursor-pointer hover:border-amber-400"
                title="Поножи"
              >
                {playerStats.leggings ? (
                  <img
                    src={texManager.getIconDataUrl(playerStats.leggings)}
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <Shield className="w-6 h-6 text-stone-600" />
                )}
              </div>
            </div>

            {/* Character Info */}
            <div className="flex flex-col gap-1.5 text-xs">
              <span className="font-bold text-amber-300">Стив (Персонаж)</span>
              <span className="text-stone-400">Защита: +{playerStats.getTotalArmorPoints()} брони</span>
              <span className="text-stone-400">Здоровье: {playerStats.health}/20 HP</span>
            </div>
          </div>

          {/* 2x2 Crafting Grid */}
          <div className="flex items-center justify-end gap-3 bg-stone-900/60 p-3 rounded-2xl border border-stone-800">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-stone-400 mb-0.5">Крафт 2x2</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[0, 1, 2, 3].map((idx) =>
                  renderSlot(craftingGrid[idx], (e) => handleSlotClick('craft', idx, e.button === 2))
                )}
              </div>
            </div>

            <ArrowRight className="w-6 h-6 text-amber-500 animate-pulse" />

            {/* Craft Result Slot */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-stone-400 mb-1">Готово</span>
              <button
                onClick={handleTakeCraftResult}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                  craftResult
                    ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 animate-bounce'
                    : 'bg-stone-950 border-stone-800 opacity-60'
                }`}
              >
                {craftResult && (
                  <img
                    src={texManager.getIconDataUrl(craftResult.itemId)}
                    alt={getItemName(craftResult.itemId)}
                    className="w-10 h-10 object-contain image-rendering-pixelated"
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 27 Main Inventory Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold text-stone-400 uppercase tracking-wider">
            Главный инвентарь (27 слотов)
          </span>
          <div className="grid grid-cols-9 gap-1.5 bg-stone-950/70 p-3 rounded-2xl border border-stone-800 max-h-[38vh] overflow-y-auto">
            {inventoryGrid.map((item, idx) =>
              renderSlot(item, (e) => handleSlotClick('inv', idx, e.button === 2))
            )}
          </div>
        </div>

        {/* 9 Hotbar Grid */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Быстрый доступ (Горячая панель 1-9)
            </span>
            {heldItem && (
              <button
                onClick={handleThrowHeldItem}
                className="text-xs px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Выбросить в мир
              </button>
            )}
          </div>
          <div className="grid grid-cols-9 gap-1.5 bg-amber-950/20 p-3 rounded-2xl border-2 border-amber-500/30">
            {hotbarGrid.map((item, idx) => {
              const isSelected = selectedHotbarIdx === idx;
              return renderSlot(
                item,
                (e) => {
                  onSelectHotbarIdx(idx);
                  handleSlotClick('hotbar', idx, e.button === 2);
                },
                isSelected ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-500/20 scale-105' : ''
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Cursor Item Stack */}
      {heldItem && (
        <div
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
          className="fixed z-50 pointer-events-none flex items-center gap-1 bg-black/90 p-1.5 rounded-xl border border-amber-400 shadow-2xl"
        >
          <img
            src={texManager.getIconDataUrl(heldItem.itemId)}
            alt=""
            className="w-9 h-9 object-contain image-rendering-pixelated"
          />
          <span className="text-xs font-black text-amber-300 pr-1">{heldItem.count}x</span>
        </div>
      )}
    </div>
  );
};
