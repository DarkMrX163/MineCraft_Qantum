import React, { useState, useEffect } from 'react';
import { Play, Globe, Settings, User, Palette, KeyRound, Sparkles, Volume2, VolumeX, Shield, Info, Check, Copy } from 'lucide-react';
import { SoundEffects } from '../game/audio/SoundEffects';

interface TitleScreenProps {
  onStartGame: (name: string, color: string, roomId: string, isSinglePlayer: boolean) => void;
}

const SHIRT_COLORS = [
  { id: 'emerald', name: 'Изумрудный', hex: '#00d26a' },
  { id: 'blue', name: 'Лазурный', hex: '#3b82f6' },
  { id: 'pink', name: 'Пурпурный', hex: '#ec4899' },
  { id: 'amber', name: 'Янтарный', hex: '#f59e0b' },
  { id: 'violet', name: 'Фиолетовый', hex: '#8b5cf6' },
  { id: 'red', name: 'Редстоун', hex: '#ef4444' },
  { id: 'teal', name: 'Бирюзовый', hex: '#14b8a6' },
  { id: 'orange', name: 'Медный', hex: '#f97316' },
];

const SPLASH_MESSAGES = [
  '100% Квадратно!',
  'С боем и крафтом!',
  'Мультиплеер до 15 человек!',
  'Сохраняет скин и имя!',
  'Мобы не ходят сквозь стены!',
  'Инвентарь с крафтом 2x2!',
  'CRAFTCRAFT Java Edition!',
  'Пиксели и приключения!',
];

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRoom = urlParams.get('room') || localStorage.getItem('craftcraft_room_id') || 'default';
  const savedName = localStorage.getItem('craftcraft_player_name') || ('Стив_' + Math.floor(Math.random() * 899 + 100));
  const savedColor = localStorage.getItem('craftcraft_player_color') || SHIRT_COLORS[0].hex;

  const [playerName, setPlayerName] = useState(savedName);
  const [selectedColor, setSelectedColor] = useState(savedColor);
  const [roomId, setRoomId] = useState(initialRoom);
  const [splash, setSplash] = useState(SPLASH_MESSAGES[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMultiplayerPrompt, setShowMultiplayerPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundEffects.getInstance().isMuted);

  useEffect(() => {
    // Pick random splash message on mount
    const randomIdx = Math.floor(Math.random() * SPLASH_MESSAGES.length);
    setSplash(SPLASH_MESSAGES[randomIdx]);
  }, []);

  // Sync settings to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('craftcraft_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('craftcraft_player_color', selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    localStorage.setItem('craftcraft_room_id', roomId);
  }, [roomId]);

  const playClick = () => {
    SoundEffects.getInstance().playPopSound();
  };

  const handleStartSinglePlayer = () => {
    playClick();
    if (!playerName.trim()) return;
    onStartGame(playerName.trim(), selectedColor, 'local_world', true);
  };

  const handleStartMultiplayer = () => {
    playClick();
    if (!playerName.trim()) return;
    const room = roomId.trim().toLowerCase() || 'default';
    onStartGame(playerName.trim(), selectedColor, room, false);
  };

  const handleToggleMute = () => {
    playClick();
    const muted = SoundEffects.getInstance().toggleMute();
    setIsMuted(muted);
  };

  const handleCopyRoomCode = () => {
    playClick();
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative w-full h-screen bg-[#140e0a] flex flex-col items-center justify-between p-4 overflow-hidden select-none font-mono">
      {/* Dynamic Dirt Pixel Pattern & Dark Vignette Background */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #3a2b1f 1px, transparent 1px), radial-gradient(circle, #251b13 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px'
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />

      {/* Floating Voxel Clouds effect */}
      <div className="absolute top-10 left-[-100px] w-48 h-12 bg-white/5 rounded-full blur-md animate-[pulse_6s_infinite]" />
      <div className="absolute top-24 right-[-50px] w-64 h-16 bg-white/5 rounded-full blur-md animate-[pulse_8s_infinite]" />

      {/* Header Container */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center pt-8 sm:pt-12 text-center">
        {/* Minecraft Style 3D Logo Header */}
        <div className="relative mb-6 group cursor-default">
          <h1 className="text-4xl sm:text-6xl font-black tracking-widest text-[#dcdcdc] uppercase drop-shadow-[0_6px_0_#2b2b2b] [text-shadow:3px_3px_0_#1b1b1b,-3px_-3px_0_#555]">
            CRAFTCRAFT
          </h1>
          <div className="text-xl sm:text-2xl font-black text-[#55ffff] tracking-widest uppercase drop-shadow-[0_3px_0_#007a7a] -mt-1">
            JAVA EDITION 3D
          </div>

          {/* Yellow Tilted Splash Text */}
          <div className="absolute -top-3 -right-6 sm:-right-12 rotate-[-14deg] animate-[bounce_2s_infinite]">
            <span className="inline-block px-2 py-0.5 text-yellow-300 font-extrabold text-xs sm:text-sm tracking-wide bg-black/60 border border-yellow-400/40 shadow-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">
              {splash}
            </span>
          </div>
        </div>

        {/* Character Profile Quick-Bar (Name, Color, Room Code persistent summary) */}
        <div className="w-full bg-[#241c15] border-2 border-[#5c4a38] border-t-[#8c7055] border-l-[#8c7055] shadow-[0_8px_20px_rgba(0,0,0,0.8)] p-3 mb-6 rounded-none flex flex-wrap items-center justify-between gap-3 text-xs text-[#d0c0b0]">
          {/* Avatar Preview & Name */}
          <div className="flex items-center gap-3">
            {/* 2D Pixel Steve Paperdoll Avatar */}
            <div 
              className="w-10 h-10 border-2 border-[#100b08] bg-[#1a130e] flex flex-col items-center justify-center relative overflow-hidden shadow-inner"
              title="Ваш персонаж"
            >
              {/* Head */}
              <div className="w-5 h-4 bg-[#e2a77c] border border-[#a16843] relative">
                <div className="absolute top-1 left-0.5 w-1 h-1 bg-[#3a2216]" /> {/* Eye left */}
                <div className="absolute top-1 right-0.5 w-1 h-1 bg-[#3a2216]" /> {/* Eye right */}
              </div>
              {/* Shirt Body with Selected Color */}
              <div 
                className="w-6 h-4 transition-colors"
                style={{ backgroundColor: selectedColor }}
              />
            </div>

            <div className="text-left">
              <div className="text-[10px] text-[#8a7563] uppercase tracking-wider font-bold">Имя игрока</div>
              <div className="text-sm font-bold text-white tracking-wide truncate max-w-[140px]">
                {playerName || 'Стив'}
              </div>
            </div>
          </div>

          {/* Room Code Badge */}
          <div className="text-left bg-[#17110c] px-3 py-1.5 border border-[#3d3023] flex items-center gap-2">
            <div>
              <div className="text-[10px] text-[#8a7563] uppercase tracking-wider font-bold">Комната сервера</div>
              <div className="text-xs font-bold text-[#55ff55] tracking-widest truncate max-w-[120px]">
                {roomId}
              </div>
            </div>
            <button
              onClick={handleCopyRoomCode}
              type="button"
              className="p-1 hover:bg-[#34261b] text-stone-400 hover:text-white transition-colors"
              title="Скопировать код"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick Customize Button */}
          <button
            type="button"
            onClick={() => { playClick(); setShowSettings(true); }}
            className="px-3 py-2 bg-[#4a3a2c] hover:bg-[#634e3b] text-white font-bold text-xs uppercase border border-[#85684f] shadow-sm flex items-center gap-1.5 active:translate-y-0.5 transition-all"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Настроить</span>
          </button>
        </div>
      </div>

      {/* Main Minecraft Java Menu Buttons Column */}
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-3.5 my-auto">
        {/* Singleplayer Button */}
        <button
          type="button"
          onClick={handleStartSinglePlayer}
          className="relative w-full py-3.5 px-4 bg-[#6e6e6e] hover:bg-[#858585] active:bg-[#525252] text-white hover:text-[#ffffa0] font-bold text-base tracking-widest uppercase border-t-2 border-l-2 border-[#aaaaaa] border-b-2 border-r-2 border-[#333333] shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2.5 transition-colors select-none active:translate-y-0.5 [text-shadow:2px_2px_0_#242424]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Одиночная игра</span>
        </button>

        {/* Multiplayer Button */}
        <button
          type="button"
          onClick={() => { playClick(); setShowMultiplayerPrompt(true); }}
          className="relative w-full py-3.5 px-4 bg-[#6e6e6e] hover:bg-[#858585] active:bg-[#525252] text-white hover:text-[#ffffa0] font-bold text-base tracking-widest uppercase border-t-2 border-l-2 border-[#aaaaaa] border-b-2 border-r-2 border-[#333333] shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2.5 transition-colors select-none active:translate-y-0.5 [text-shadow:2px_2px_0_#242424]"
        >
          <Globe className="w-5 h-5 text-emerald-400" />
          <span>Сетевая игра</span>
        </button>

        {/* Settings & Character Options */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            type="button"
            onClick={() => { playClick(); setShowSettings(true); }}
            className="py-2.5 px-3 bg-[#5c5c5c] hover:bg-[#737373] text-white hover:text-[#ffffa0] font-bold text-xs uppercase border-t-2 border-l-2 border-[#888888] border-b-2 border-r-2 border-[#2b2b2b] shadow-md flex items-center justify-center gap-1.5 transition-colors [text-shadow:1px_1px_0_#222]"
          >
            <Settings className="w-4 h-4 text-amber-300" />
            <span>Настройки</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className="py-2.5 px-3 bg-[#5c5c5c] hover:bg-[#737373] text-white hover:text-[#ffffa0] font-bold text-xs uppercase border-t-2 border-l-2 border-[#888888] border-b-2 border-r-2 border-[#2b2b2b] shadow-md flex items-center justify-center gap-1.5 transition-colors [text-shadow:1px_1px_0_#222]"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span>Звук: Выкл</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Звук: Вкл</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 w-full max-w-xl flex flex-wrap items-center justify-between text-[11px] text-[#7a6858] border-t border-[#3a2d22] pt-3 pb-2">
        <div>CraftCraft 3D Java Edition v1.8.9</div>
        <div>Не является официальным продуктом Mojang</div>
      </div>

      {/* Settings & Character Customization Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#221a14] border-4 border-[#4a3b2c] border-t-[#78614a] border-l-[#78614a] shadow-[0_12px_32px_rgba(0,0,0,0.95)] p-5 text-white">
            <div className="flex items-center justify-between border-b border-[#3d3023] pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-amber-300 uppercase tracking-wider">
                <User className="w-5 h-5 text-amber-400" />
                <span>Настройки персонажа</span>
              </div>
              <button
                type="button"
                onClick={() => { playClick(); setShowSettings(false); }}
                className="w-7 h-7 bg-[#4a382a] hover:bg-[#614937] text-white font-bold text-sm border border-[#785d46] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Character Name */}
              <div className="space-y-1">
                <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block">
                  Имя персонажа (Скин):
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={18}
                  className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-amber-400 px-3 py-2 text-white font-bold text-sm outline-none transition-colors"
                  placeholder="Введите имя..."
                />
              </div>

              {/* Avatar Shirt Color Swatches */}
              <div className="space-y-1.5">
                <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block flex items-center justify-between">
                  <span>Цвет футболки аватара:</span>
                  <span className="text-amber-400 text-[10px]">
                    {SHIRT_COLORS.find(c => c.hex === selectedColor)?.name || 'Выбран'}
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SHIRT_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => { playClick(); setSelectedColor(c.hex); }}
                      className={`h-9 border-2 flex items-center justify-center transition-all ${
                        selectedColor === c.hex
                          ? 'border-white ring-2 ring-amber-400 shadow-md scale-105'
                          : 'border-[#382b20] hover:border-[#6b533e]'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {selectedColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Code Field */}
              <div className="space-y-1 pt-2 border-t border-[#3d3023]">
                <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block flex items-center justify-between">
                  <span>Код онлайн комнаты:</span>
                  <span className="text-emerald-400 text-[10px]">Сервер до 15 чел</span>
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  maxLength={24}
                  className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-emerald-400 px-3 py-2 text-emerald-300 font-bold text-sm outline-none transition-colors"
                  placeholder="Например: default"
                />
              </div>

              {/* Controls guide summary */}
              <div className="bg-[#120d09] border border-[#382a1d] p-3 text-[11px] text-[#9c8978] space-y-1">
                <div className="font-bold text-stone-300 uppercase">🎮 Управление:</div>
                <div>• WASD — Перемещение | Пробел — Прыжок</div>
                <div>• ЛКМ — Ломать блок / Атака моба</div>
                <div>• ПКМ — Поставить блок / Инвентарь</div>
                <div>• E — Открыть инвентарь & Крафт</div>
                <div>• F5 — Смена вида от 1-го / 3-го лица</div>
              </div>
            </div>

            {/* Save & Close Button */}
            <button
              type="button"
              onClick={() => { playClick(); setShowSettings(false); }}
              className="mt-5 w-full py-2.5 bg-[#525252] hover:bg-[#6b6b6b] text-white hover:text-[#ffffa0] font-bold uppercase border-t-2 border-l-2 border-[#888888] border-b-2 border-r-2 border-[#2b2b2b] shadow-md transition-colors"
            >
              Сохранить и Готово
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Direct Join Modal */}
      {showMultiplayerPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#221a14] border-4 border-[#4a3b2c] border-t-[#78614a] border-l-[#78614a] shadow-[0_12px_32px_rgba(0,0,0,0.95)] p-5 text-white">
            <div className="flex items-center justify-between border-b border-[#3d3023] pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-400 uppercase tracking-wider">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span>Сетевая игра</span>
              </div>
              <button
                type="button"
                onClick={() => { playClick(); setShowMultiplayerPrompt(false); }}
                className="w-7 h-7 bg-[#4a382a] hover:bg-[#614937] text-white font-bold text-sm border border-[#785d46] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="text-[#c0b0a0]">
                Введите код комнаты для подключения к друзьями на общему серверу (до 15 игроков):
              </div>

              <div className="space-y-1">
                <label className="text-[#8a7563] font-bold uppercase tracking-wider block">
                  Код комнаты:
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  maxLength={24}
                  className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-emerald-400 px-3 py-2 text-emerald-300 font-bold text-sm outline-none transition-colors"
                  placeholder="default"
                />
              </div>

              {/* Preset Quick Rooms */}
              <div className="space-y-1.5">
                <div className="text-[#8a7563] font-bold uppercase tracking-wider text-[10px]">
                  Популярные комнаты:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['default', 'world1', 'survival', 'craft-room'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => { playClick(); setRoomId(preset); }}
                      className={`px-2.5 py-1 text-xs border font-mono ${
                        roomId === preset
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold'
                          : 'bg-[#18110b] border-[#3a2d21] text-stone-400 hover:text-white'
                      }`}
                    >
                      #{preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => { playClick(); setShowMultiplayerPrompt(false); }}
                className="py-2.5 bg-[#4a382a] hover:bg-[#614937] text-white font-bold uppercase border-t-2 border-l-2 border-[#785d46] border-b-2 border-r-2 border-[#261c14] transition-colors"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMultiplayerPrompt(false);
                  handleStartMultiplayer();
                }}
                className="py-2.5 bg-[#22632b] hover:bg-[#2e8039] text-white hover:text-[#ffffa0] font-bold uppercase border-t-2 border-l-2 border-[#42a84e] border-b-2 border-r-2 border-[#123817] transition-colors flex items-center justify-center gap-1"
              >
                <span>Подключиться</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

