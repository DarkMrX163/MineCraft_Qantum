import React, { useState } from 'react';
import { ItemType } from '../game/constants';
import { TextureManager } from '../game/textures/TextureAtlas';
import { FlaskConical, X, Sparkles, Zap, Eye, Shield, Droplets } from 'lucide-react';

interface BrewingModalProps {
  onClose: () => void;
  onDrinkPotion: (itemId: number) => void;
}

export const BrewingModal: React.FC<BrewingModalProps> = ({ onClose, onDrinkPotion }) => {
  const texManager = TextureManager.getInstance();
  const [brewingStatus, setBrewingStatus] = useState<string | null>(null);

  const potions = [
    {
      id: ItemType.POTION_HEAL,
      nameRu: 'Зелье Здоровья',
      desc: 'Мгновенно восстанавливает +8 единиц Здоровья',
      color: 'bg-red-500/20 border-red-500/50 text-red-300',
      icon: <Sparkles className="w-5 h-5 text-red-400" />,
    },
    {
      id: ItemType.POTION_SPEED,
      nameRu: 'Зелье Скорости',
      desc: 'Увеличивает скорость бега на +60% на 45 секунд',
      color: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
    },
    {
      id: ItemType.POTION_NIGHT_VISION,
      nameRu: 'Зелье Ночного Зрения',
      desc: 'Освещает всю ночь и тёмные пещеры ярким светом на 60 сек',
      color: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
      icon: <Eye className="w-5 h-5 text-purple-400" />,
    },
    {
      id: ItemType.POTION_OXYGEN,
      nameRu: 'Подводное Дыхание',
      desc: 'Защищает от удушья в воде — кислород не тратится (60 сек)',
      color: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
      icon: <Droplets className="w-5 h-5 text-cyan-400" />,
    },
  ];

  const handleBrewAndDrink = (potionId: number, nameRu: string) => {
    setBrewingStatus(`Варится ${nameRu}...`);
    setTimeout(() => {
      onDrinkPotion(potionId);
      setBrewingStatus(`Вы выпили ${nameRu}! Эффект применён!`);
      setTimeout(() => {
        setBrewingStatus(null);
      }, 2000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200">
      <div className="bg-stone-900 border-2 border-purple-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-black text-purple-400">Лаборатория Алхимии</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {brewingStatus && (
          <div className="my-3 p-3 rounded-2xl bg-purple-950/80 border border-purple-500/50 text-purple-200 font-bold text-xs text-center animate-pulse">
            ✨ {brewingStatus}
          </div>
        )}

        <div className="my-3 space-y-3">
          {potions.map((p) => (
            <div
              key={p.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${p.color}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-950/80 rounded-xl border border-stone-800 shrink-0">
                  {p.icon}
                </div>
                <div>
                  <h4 className="text-sm font-black">{p.nameRu}</h4>
                  <p className="text-[11px] opacity-80 font-medium leading-tight">{p.desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleBrewAndDrink(p.id, p.nameRu)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shrink-0 transition-transform active:scale-95 shadow-md shadow-purple-600/30"
              >
                СВАРИТЬ И ВЫПИТЬ
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
