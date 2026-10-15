import React from 'react';
import { Heart, Utensils, Skull, RotateCcw, Apple, Shield } from 'lucide-react';

interface PlayerStatsBarProps {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  armorPoints: number;
  isDead: boolean;
  damageFlash: boolean;
  onEatFood: () => void;
  onRespawn: () => void;
}

export const PlayerStatsBar: React.FC<PlayerStatsBarProps> = ({
  health,
  maxHealth,
  hunger,
  maxHunger,
  armorPoints,
  isDead,
  damageFlash,
  onEatFood,
  onRespawn,
}) => {
  const renderHearts = () => {
    const hearts = [];
    const totalHearts = 10;
    const currentHealthInHearts = health / 2;

    for (let i = 0; i < totalHearts; i++) {
      if (currentHealthInHearts >= i + 1) {
        hearts.push(
          <Heart key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 fill-red-500 drop-shadow-md animate-in fade-in" />
        );
      } else if (currentHealthInHearts >= i + 0.5) {
        hearts.push(
          <Heart key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 fill-red-400/50 drop-shadow-md" />
        );
      } else {
        hearts.push(
          <Heart key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700/80 fill-stone-900" />
        );
      }
    }
    return hearts;
  };

  const renderHunger = () => {
    const drumsticks = [];
    const totalDrumsticks = 10;
    const currentHungerInUnits = hunger / 2;

    for (let i = 0; i < totalDrumsticks; i++) {
      if (currentHungerInUnits >= i + 1) {
        drumsticks.push(
          <Utensils key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500 drop-shadow-md" />
        );
      } else {
        drumsticks.push(
          <Utensils key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700/80 fill-stone-900" />
        );
      }
    }
    return drumsticks;
  };

  const renderArmorShields = () => {
    const shields = [];
    const totalShields = 8;
    const currentArmor = Math.min(8, Math.ceil(armorPoints / 2));

    for (let i = 0; i < totalShields; i++) {
      if (i < currentArmor) {
        shields.push(
          <Shield key={i} className="w-4 h-4 text-sky-400 fill-sky-400 drop-shadow-md animate-in fade-in" />
        );
      }
    }
    return shields;
  };

  return (
    <>
      {damageFlash && (
        <div className="fixed inset-0 pointer-events-none z-50 bg-red-600/30 border-[16px] border-red-600/60 transition-opacity duration-150 animate-pulse" />
      )}

      {!isDead && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center gap-1 bg-stone-950/80 border-2 border-stone-800 px-4 py-2 rounded-2xl backdrop-blur-md shadow-2xl">
          {/* Armor Bar (if equipped) */}
          {armorPoints > 0 && (
            <div className="flex items-center gap-1 text-sky-400 font-bold text-xs pb-1 border-b border-stone-800 w-full justify-center">
              <Shield className="w-4 h-4 text-sky-400 fill-sky-400" />
              <span>Защита брони: +{armorPoints}</span>
              <div className="flex items-center gap-0.5 ml-2">
                {renderArmorShields()}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-0.5" title={`Здоровье: ${health}/${maxHealth}`}>
              {renderHearts()}
            </div>

            <span className="text-stone-700 font-bold">|</span>

            <div className="flex items-center gap-0.5" title={`Сытость: ${hunger}/${maxHunger}`}>
              {renderHunger()}
            </div>

            <button
              onClick={onEatFood}
              className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-[11px] px-2.5 py-1 rounded-xl transition-all active:scale-95 ml-1"
              title="Покушать (+5 сытости)"
            >
              <Apple className="w-4 h-4 text-red-400" />
              <span>Еда</span>
            </button>
          </div>
        </div>
      )}

      {isDead && (
        <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-center pointer-events-auto animate-in zoom-in-95 duration-200">
          <div className="p-4 rounded-full bg-red-600/20 border-2 border-red-500 mb-4 animate-bounce">
            <Skull className="w-16 h-16 text-red-500" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-red-500 tracking-wider drop-shadow-lg mb-2">
            ВЫ ПОГИБЛИ!
          </h1>
          <p className="text-stone-300 text-sm sm:text-base font-bold mb-8 max-w-sm">
            Ваше здоровье закончилось. Все построенные миры и сооружения сохранены!
          </p>

          <button
            onClick={onRespawn}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:brightness-110 text-white font-black text-lg shadow-2xl flex items-center gap-3 transition-all active:scale-95"
          >
            <RotateCcw className="w-6 h-6" />
            <span>ВОЗРОДИТЬСЯ</span>
          </button>
        </div>
      )}
    </>
  );
};
