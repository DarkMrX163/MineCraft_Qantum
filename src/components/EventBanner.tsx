import React from 'react';
import { WorldEvent } from '../game/events/WorldEventManager';
import { Flame, ShieldAlert, Gift, Zap } from 'lucide-react';

interface EventBannerProps {
  event: WorldEvent | null;
  timeRemaining: number;
}

export const EventBanner: React.FC<EventBannerProps> = ({ event, timeRemaining }) => {
  if (!event || timeRemaining <= 0) return null;

  const getIcon = () => {
    switch (event.id) {
      case 'METEOR_SHOWER': return <Flame className="w-6 h-6 text-amber-400 animate-bounce" />;
      case 'MOB_INVASION': return <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />;
      case 'TREASURE_DROP': return <Gift className="w-6 h-6 text-yellow-300 animate-bounce" />;
      case 'GOLDEN_RUSH': return <Zap className="w-6 h-6 text-amber-300 animate-pulse" />;
      default: return <Flame className="w-6 h-6 text-amber-400" />;
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 pointer-events-none animate-in slide-in-from-top duration-300">
      <div className="bg-stone-900/95 border-2 border-amber-500/80 rounded-2xl p-3.5 backdrop-blur-xl shadow-2xl flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-400 tracking-wide uppercase truncate">
              Событие: {event.title}
            </h3>
            <span className="text-xs font-mono font-bold text-amber-300 shrink-0 ml-2">
              {Math.ceil(timeRemaining)}s
            </span>
          </div>
          <p className="text-[11px] font-semibold text-stone-300 leading-tight truncate mt-0.5">
            {event.desc}
          </p>
        </div>
      </div>
    </div>
  );
};
