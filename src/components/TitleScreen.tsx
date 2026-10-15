import React, { useState } from 'react';
import { Play, Users, Sparkles, User, Palette, Globe, Compass } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: (name: string, color: string, roomId: string, isSinglePlayer: boolean) => void;
}

const SHIRT_COLORS = [
  '#00d26a', '#3b82f6', '#ec4899', '#f59e0b',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'
];

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoom = urlParams.get('room') || 'default';

  const [mode, setMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [playerName, setPlayerName] = useState('Стив_' + Math.floor(Math.random() * 90 + 10));
  const [selectedColor, setSelectedColor] = useState(SHIRT_COLORS[0]);
  const [roomId, setRoomId] = useState(initialRoom);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const isSingle = mode === 'SINGLE';
    onStartGame(playerName.trim(), selectedColor, isSingle ? 'local_world' : (roomId.trim().toLowerCase() || 'default'), isSingle);
  };

  return (
    <div className="relative w-full h-screen bg-stone-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Voxel Sky / Mesh Background Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-stone-950 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full flex flex-col items-center text-center">
        {/* Title */}
        <div className="mb-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            3D Мир Блоков с Крафтом и Событиями
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)] font-sans">
            CRAFTCRAFT 3D
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-1 font-bold">
            Одиночный режим & Сервер до 15 человек
          </p>
        </div>

        {/* Card Form */}
        <form onSubmit={handleStart} className="w-full bg-stone-900/90 border-2 border-stone-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
            <button
              type="button"
              onClick={() => setMode('SINGLE')}
              className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                mode === 'SINGLE' ? 'bg-amber-500 text-stone-950 shadow-md' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Одиночная игра</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('MULTI')}
              className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                mode === 'MULTI' ? 'bg-emerald-500 text-stone-950 shadow-md' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Мультиплеер (15 чел)</span>
            </button>
          </div>

          {/* Player Name */}
          <div className="text-left space-y-1">
            <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
              <span>Имя персонажа</span>
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={16}
              required
              className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-amber-400 transition-colors"
              placeholder="Введите имя..."
            />
          </div>

          {/* Shirt Color */}
          <div className="text-left space-y-1.5">
            <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Цвет аватара</span>
            </label>
            <div className="flex gap-2 justify-between">
              {SHIRT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-9 h-9 rounded-2xl border-2 transition-transform ${
                    selectedColor === c ? 'scale-110 border-white ring-2 ring-amber-400 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Room ID (if multiplayer) */}
          {mode === 'MULTI' && (
            <div className="text-left space-y-1 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Код онлайн комнаты
                </span>
                <span className="text-[10px] text-emerald-400">Сервер на 15 чел</span>
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                maxLength={20}
                className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-400 transition-colors"
                placeholder="Например: default или world1"
              />
            </div>
          )}

          {/* Start Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 text-stone-950 font-black text-lg tracking-wide hover:brightness-110 transition-all shadow-xl active:scale-98 flex items-center justify-center gap-2 mt-2"
          >
            <Play className="w-6 h-6 fill-stone-950" />
            <span>{mode === 'SINGLE' ? 'НАЧАТЬ ИГРУ' : 'ПОДКЛЮЧИТЬСЯ К СЕРВЕРУ'}</span>
          </button>
        </form>

        {/* Hints */}
        <div className="mt-6 text-stone-500 text-xs font-semibold flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>🎮 ПК: WASD Ходьба · ЛКМ Ломать · ПКМ Строить / Открыть Верстак</span>
          <span>📱 Телефон: Сенсорный джойстик + Кнопки действий</span>
        </div>
      </div>
    </div>
  );
};
