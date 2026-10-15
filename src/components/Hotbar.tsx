import React, { useState } from 'react';
import { BlockType, SELECTABLE_BLOCKS, BLOCK_DEFS } from '../game/constants';
import { TextureManager } from '../game/textures/TextureAtlas';
import { Grid, X } from 'lucide-react';

interface HotbarProps {
  selectedBlock: BlockType;
  onSelectBlock: (block: BlockType) => void;
  isInventoryOpen: boolean;
  setIsInventoryOpen: (open: boolean) => void;
}

export const Hotbar: React.FC<HotbarProps> = ({
  selectedBlock,
  onSelectBlock,
  isInventoryOpen,
  setIsInventoryOpen,
}) => {
  const texManager = TextureManager.getInstance();

  return (
    <>
      {/* Quick Access Hotbar (Bottom Center) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border-2 border-white/20 shadow-2xl pointer-events-auto">
        {SELECTABLE_BLOCKS.slice(0, 8).map((blockType, idx) => {
          const isSelected = selectedBlock === blockType;
          const def = BLOCK_DEFS[blockType];
          const iconUrl = texManager.getIconDataUrl(blockType);

          return (
            <button
              key={blockType}
              onClick={() => onSelectBlock(blockType)}
              className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl transition-all duration-150 flex items-center justify-center border-2 ${
                isSelected
                  ? 'bg-amber-500/30 border-amber-400 scale-105 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-stone-900/80 border-white/10 hover:border-white/40 hover:bg-stone-800'
              }`}
            >
              <img
                src={iconUrl}
                alt={def.nameRu}
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain image-rendering-pixelated drop-shadow-md"
              />
              <span className="absolute top-0.5 left-1 text-[10px] font-extrabold text-white/70">
                {idx + 1}
              </span>
            </button>
          );
        })}

        {/* More Blocks Button */}
        <button
          onClick={() => setIsInventoryOpen(!isInventoryOpen)}
          className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 border-2 border-indigo-400 flex flex-col items-center justify-center text-white hover:scale-105 transition-transform"
          title="Открыть все блоки"
        >
          <Grid className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] font-bold mt-0.5">Все</span>
        </button>
      </div>

      {/* Full Inventory Picker Modal */}
      {isInventoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200">
          <div className="bg-stone-900/95 border-2 border-amber-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <Grid className="w-6 h-6" />
                Инвентарь строителя
              </h2>
              <button
                onClick={() => setIsInventoryOpen(false)}
                className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-stone-400 my-3">
              Выберите любой блок для строительства в вашей горячей панели:
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 overflow-y-auto p-1 max-h-[50vh]">
              {SELECTABLE_BLOCKS.map((blockType) => {
                const isSelected = selectedBlock === blockType;
                const def = BLOCK_DEFS[blockType];
                const iconUrl = texManager.getIconDataUrl(blockType);

                return (
                  <button
                    key={blockType}
                    onClick={() => {
                      onSelectBlock(blockType);
                      setIsInventoryOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-2 ring-amber-400'
                        : 'bg-stone-800/80 border-stone-700 hover:border-amber-400/50 hover:bg-stone-700'
                    }`}
                  >
                    <img
                      src={iconUrl}
                      alt={def.nameRu}
                      className="w-12 h-12 object-contain image-rendering-pixelated mb-2"
                    />
                    <span className="text-xs font-bold text-stone-200 text-center line-clamp-1">
                      {def.nameRu}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-stone-800 flex justify-end">
              <button
                onClick={() => setIsInventoryOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-black hover:bg-amber-400 transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
