import React, { useState } from 'react';
import { Users, Share2, Volume2, VolumeX, Eye, Feather, HelpCircle, Check, Copy, X, Pause } from 'lucide-react';
import { SoundEffects } from '../game/audio/SoundEffects';

interface GameUIProps {
  playerCount: number;
  maxPlayers: number;
  roomId: string;
  isFlying: boolean;
  onToggleFly: () => void;
  onToggleCamera: () => void;
  onExitGame: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  playerCount,
  maxPlayers,
  roomId,
  isFlying,
  onToggleFly,
  onToggleCamera,
  onExitGame,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundEffects.getInstance().isMuted);

  const handleToggleMute = () => {
    const muted = SoundEffects.getInstance().toggleMute();
    setIsMuted(muted);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20">
      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
        <div className="w-4 h-0.5 bg-white/80 shadow-xs" />
        <div className="absolute h-4 w-0.5 bg-white/80 shadow-xs" />
      </div>

      {/* Top Left Status Bar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-white text-xs font-bold shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <Users className="w-4 h-4 text-emerald-400" />
          <span>{playerCount} / {maxPlayers} игроков</span>
          <span className="text-white/40">|</span>
          <span className="text-amber-300">Мир: {roomId}</span>
        </div>

        <button
          onClick={() => setIsShareOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black px-3 py-1.5 rounded-2xl text-xs shadow-lg transition-transform active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Пригласить</span>
        </button>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleToggleMute}
          className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-colors"
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>

        <button
          onClick={() => setIsPaused(true)}
          className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-colors"
          title="Пауза / Меню"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>

      {/* Share Link Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-stone-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-stone-800">
              <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Пригласить друзей
              </h3>
              <button onClick={() => setIsShareOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-stone-300 my-4 leading-relaxed">
              Отправьте эту ссылку друзьям! До <strong className="text-emerald-400">10 игроков</strong> могут строить вместе в реальном времени. Все постройки автоматически сохраняются!
            </p>

            <div className="flex items-center gap-2 bg-stone-950 p-3 rounded-2xl border border-stone-800 my-2">
              <input
                type="text"
                readOnly
                value={window.location.href}
                className="bg-transparent text-xs text-stone-300 flex-1 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-stone-900 border-2 border-amber-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <h2 className="text-2xl font-black text-amber-400 mb-1">МЕНЮ ИГРЫ</h2>
            <p className="text-xs text-stone-400 mb-6">Мир: {roomId} | Игроков: {playerCount}/{maxPlayers}</p>

            <div className="w-full space-y-3">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-stone-950 font-black text-sm hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg"
              >
                ПРОДОЛЖИТЬ ИГРУ
              </button>

              <button
                onClick={onToggleFly}
                className="w-full py-3 rounded-2xl bg-stone-800 border border-stone-700 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
              >
                <Feather className="w-4 h-4 text-amber-400" />
                <span>Режим полёта: {isFlying ? 'ВКЛ' : 'ВЫКЛ'}</span>
              </button>

              <button
                onClick={onToggleCamera}
                className="w-full py-3 rounded-2xl bg-stone-800 border border-stone-700 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Переключить вид камере</span>
              </button>

              <button
                onClick={() => { setIsPaused(false); setIsShareOpen(true); }}
                className="w-full py-3 rounded-2xl bg-stone-800 border border-stone-700 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Ссылка для друзей</span>
              </button>

              <button
                onClick={onExitGame}
                className="w-full py-3 rounded-2xl bg-red-900/40 border border-red-700/50 text-red-300 font-bold text-xs hover:bg-red-800/60 transition-colors mt-4"
              >
                ВЫЙТИ В МЕНЮ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
