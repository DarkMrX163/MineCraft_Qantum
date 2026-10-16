import React, { useState, useEffect } from 'react';
import { Play, Globe, Settings, User, Palette, KeyRound, Sparkles, Volume2, VolumeX, Shield, Info, Check, Copy, Share2 } from 'lucide-react';
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
  const inviteRoom = urlParams.get('room');
  const initialRoom = inviteRoom || localStorage.getItem('craftcraft_room_id') || 'default';
  const savedName = localStorage.getItem('craftcraft_player_name') || ('Стив_' + Math.floor(Math.random() * 899 + 100));
  const savedColor = localStorage.getItem('craftcraft_player_color') || SHIRT_COLORS[0].hex;

  const [playerName, setPlayerName] = useState(savedName);
  const [selectedColor, setSelectedColor] = useState(savedColor);
  const [roomId, setRoomId] = useState(initialRoom);
  const [splash, setSplash] = useState(SPLASH_MESSAGES[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMultiplayerPrompt, setShowMultiplayerPrompt] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundEffects.getInstance().isMuted);

  const [multiplayerTab, setMultiplayerTab] = useState<'LIST' | 'CREATE'>('CREATE');
  const [newServerName, setNewServerName] = useState(`Мир ${savedName}`);
  const [newServerPin, setNewServerPin] = useState(String(Math.floor(Math.random() * 8999 + 1000)));
  const [newServerMaxPlayers, setNewServerMaxPlayers] = useState(10);

  const [activeRooms, setActiveRooms] = useState<Array<{ roomId: string; serverName?: string; hostName?: string; playerCount: number; maxPlayers: number; players: Array<{ id: string; name: string; color: string }> }>>([]);

  const fetchActiveRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data);
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleCreateAndStartWorld = async () => {
    playClick();
    if (!playerName.trim()) return;

    const pin = (newServerPin || '1234').trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || '1234';
    const serverName = (newServerName || `Мир ${playerName}`).trim();

    try {
      await fetch('/api/worlds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: pin,
          name: serverName,
          hostName: playerName,
          maxPlayers: newServerMaxPlayers
        })
      });
    } catch {
      // Ignore
    }

    setRoomId(pin);
    setShowMultiplayerPrompt(false);
    onStartGame(playerName.trim(), selectedColor, pin, false);
  };

  useEffect(() => {
    // Pick random splash message on mount
    const randomIdx = Math.floor(Math.random() * SPLASH_MESSAGES.length);
    setSplash(SPLASH_MESSAGES[randomIdx]);
    fetchActiveRooms();
  }, []);

  useEffect(() => {
    if (!showMultiplayerPrompt) return;
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 3500);
    return () => clearInterval(interval);
  }, [showMultiplayerPrompt]);

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

  const handleStartMultiplayer = (targetRoom?: string) => {
    playClick();
    if (!playerName.trim()) return;
    const finalRoom = (targetRoom || roomId).trim().toLowerCase() || 'default';
    setRoomId(finalRoom);
    onStartGame(playerName.trim(), selectedColor, finalRoom, false);
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

  const handleCopyShareLink = (targetRoom?: string) => {
    playClick();
    const r = targetRoom || roomId || 'default';
    const link = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(r)}&join=true`;
    navigator.clipboard.writeText(link);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2200);
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

      {/* Invite Banner if URL contains ?room=... */}
      {inviteRoom && (
        <div className="relative z-10 w-full max-w-sm mb-3 bg-emerald-950/90 border-2 border-emerald-400 p-3 text-center text-xs text-emerald-200 shadow-xl animate-pulse">
          <div className="font-bold text-emerald-300 uppercase flex items-center justify-center gap-1.5 mb-1">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Вас пригласили в онлайн комнату #{inviteRoom}!</span>
          </div>
          <button
            type="button"
            onClick={() => handleStartMultiplayer(inviteRoom)}
            className="w-full mt-1.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black uppercase text-xs border border-emerald-300 shadow-md active:translate-y-0.5 transition-all"
          >
            🎮 Играть вместе в #{inviteRoom}
          </button>
        </div>
      )}

      {/* Main Minecraft Java Menu Buttons Column */}
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-3 my-auto">
        {/* Quick Play Public Global Server Button */}
        <button
          type="button"
          onClick={() => handleStartMultiplayer('default')}
          className="relative w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white hover:text-yellow-200 font-black text-base tracking-widest uppercase border-t-2 border-l-2 border-emerald-400 border-b-2 border-r-2 border-emerald-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2.5 transition-all select-none active:translate-y-0.5 [text-shadow:2px_2px_0_#113a17] animate-in fade-in"
        >
          <Globe className="w-5 h-5 text-yellow-300 animate-pulse" />
          <span>🔥 БЫСТРАЯ ИГРА (Общий мир)</span>
        </button>

        {/* Singleplayer Button */}
        <button
          type="button"
          onClick={handleStartSinglePlayer}
          className="relative w-full py-3 px-4 bg-[#6e6e6e] hover:bg-[#858585] active:bg-[#525252] text-white hover:text-[#ffffa0] font-bold text-sm tracking-widest uppercase border-t-2 border-l-2 border-[#aaaaaa] border-b-2 border-r-2 border-[#333333] shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2.5 transition-colors select-none active:translate-y-0.5 [text-shadow:2px_2px_0_#242424]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Одиночная игра</span>
        </button>

        {/* Multiplayer Server Browser Button */}
        <button
          type="button"
          onClick={() => { playClick(); setShowMultiplayerPrompt(true); }}
          className="relative w-full py-3 px-4 bg-[#6e6e6e] hover:bg-[#858585] active:bg-[#525252] text-white hover:text-[#ffffa0] font-bold text-sm tracking-widest uppercase border-t-2 border-l-2 border-[#aaaaaa] border-b-2 border-r-2 border-[#333333] shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2.5 transition-colors select-none active:translate-y-0.5 [text-shadow:2px_2px_0_#242424]"
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Выбор комнаты / Ввести PIN {activeRooms.length > 0 && `(${activeRooms.reduce((acc, r) => acc + r.playerCount, 0)} онлайн)`}</span>
        </button>

        {/* Live Active Server Worlds directly on main menu */}
        {activeRooms.length > 0 && (
          <div className="w-full bg-[#1b140e]/90 border border-emerald-500/50 p-2.5 rounded-none shadow-lg text-left text-xs space-y-1.5">
            <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>🟢 Кто-то сейчас играет online:</span>
              <span className="text-emerald-400 font-mono">1 клик войти</span>
            </div>
            {activeRooms.slice(0, 3).map((r) => (
              <div key={r.roomId} className="flex items-center justify-between bg-[#100b07] p-2 border border-[#3d2e20]">
                <div className="truncate pr-2">
                  <span className="text-emerald-400 font-bold font-mono">#{r.roomId}</span>
                  <span className="text-[#a89582] text-[10px] ml-1">({r.playerCount} чел)</span>
                  <div className="text-[9px] text-[#7a6858] truncate">{r.players.map(p => p.name).join(', ')}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartMultiplayer(r.roomId)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-[10px] uppercase shrink-0"
                >
                  Войти
                </button>
              </div>
            ))}
          </div>
        )}

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

      {/* Multiplayer Direct Join & Active Rooms Server Browser Modal */}
      {showMultiplayerPrompt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#221a14] border-4 border-[#4a3b2c] border-t-[#78614a] border-l-[#78614a] shadow-[0_12px_32px_rgba(0,0,0,0.95)] p-5 text-white">
            <div className="flex items-center justify-between border-b border-[#3d3023] pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-400 uppercase tracking-wider">
                <Globe className="w-5 h-5 text-emerald-400" />
                <span>Сетевая игра — Серверы мира</span>
              </div>
              <button
                type="button"
                onClick={() => { playClick(); setShowMultiplayerPrompt(false); }}
                className="w-7 h-7 bg-[#4a382a] hover:bg-[#614937] text-white font-bold text-sm border border-[#785d46] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => { playClick(); setMultiplayerTab('CREATE'); }}
                className={`py-2 px-3 text-xs font-bold uppercase border transition-all ${
                  multiplayerTab === 'CREATE'
                    ? 'bg-emerald-800 text-yellow-200 border-emerald-400 shadow-md'
                    : 'bg-[#1a130d] text-stone-400 border-[#3d2e20] hover:text-white'
                }`}
              >
                🚀 Создать свой мир
              </button>
              <button
                type="button"
                onClick={() => { playClick(); setMultiplayerTab('LIST'); fetchActiveRooms(); }}
                className={`py-2 px-3 text-xs font-bold uppercase border transition-all ${
                  multiplayerTab === 'LIST'
                    ? 'bg-emerald-800 text-yellow-200 border-emerald-400 shadow-md'
                    : 'bg-[#1a130d] text-stone-400 border-[#3d2e20] hover:text-white'
                }`}
              >
                🌐 Список серверов ({activeRooms.length})
              </button>
            </div>

            {multiplayerTab === 'CREATE' ? (
              /* CREATE NEW WORLD FORM */
              <div className="space-y-3.5 text-xs">
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 leading-relaxed">
                  Создайте свой мир! После создания сервер появится в общедоступном списке, и друзья смогут подключиться к вам в 1 клик.
                </div>

                <div className="space-y-1">
                  <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block">
                    Название сервера / мира:
                  </label>
                  <input
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    maxLength={30}
                    className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-emerald-400 px-3 py-2 text-white font-bold text-sm outline-none transition-colors"
                    placeholder="Например: Замок Стива"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block">
                      PIN-код мира (Код):
                    </label>
                    <input
                      type="text"
                      value={newServerPin}
                      onChange={(e) => setNewServerPin(e.target.value)}
                      maxLength={12}
                      className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-emerald-400 px-3 py-2 text-emerald-300 font-bold text-sm outline-none transition-colors font-mono"
                      placeholder="1234"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#c0b0a0] font-bold uppercase tracking-wider block">
                      Макс. игроков:
                    </label>
                    <select
                      value={newServerMaxPlayers}
                      onChange={(e) => setNewServerMaxPlayers(Number(e.target.value))}
                      className="w-full bg-[#120d09] border-2 border-[#473729] focus:border-emerald-400 px-3 py-2 text-white font-bold text-sm outline-none transition-colors"
                    >
                      <option value={5}>5 игроков</option>
                      <option value={10}>10 игроков</option>
                      <option value={15}>15 игроков</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateAndStartWorld}
                  className="w-full mt-3 py-3 bg-emerald-700 hover:bg-emerald-600 text-yellow-200 font-black text-sm uppercase tracking-wider border-t-2 border-l-2 border-emerald-400 border-b-2 border-r-2 border-emerald-950 shadow-xl transition-all active:translate-y-0.5"
                >
                  🚀 Запустить мир и открыть вход друзьям
                </button>
              </div>
            ) : (
              /* BROWSE EXISTING ACTIVE WORLDS LIST */
              <div className="space-y-3.5 text-xs">
                <div className="text-amber-300 font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>🔥 Активные созданные сервера онлайн:</span>
                  <button
                    type="button"
                    onClick={fetchActiveRooms}
                    className="text-[#8a7563] hover:text-white underline text-[10px]"
                  >
                    Обновить список
                  </button>
                </div>

                {activeRooms.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeRooms.map((r) => (
                      <div
                        key={r.roomId}
                        className={`p-3 border flex items-center justify-between transition-all ${
                          roomId === r.roomId
                            ? 'bg-emerald-950/90 border-emerald-400 shadow-md'
                            : 'bg-[#17110c] border-[#3a2d21] hover:border-[#6b533e]'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{r.serverName || `Мир #${r.roomId}`}</span>
                            <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono">
                              {r.playerCount}/{r.maxPlayers} игроков
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9c8978] mt-0.5 flex items-center gap-2">
                            <span>Создатель: <strong className="text-stone-300">{r.hostName || 'Игрок'}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-400 font-mono">Код PIN: #{r.roomId}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowMultiplayerPrompt(false);
                            handleStartMultiplayer(r.roomId);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black uppercase text-xs shadow-md shrink-0 active:scale-95 transition-transform"
                        >
                          Подключиться
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#17110c] border border-[#3a2d21] text-center text-[#8a7563] space-y-2">
                    <div>Сейчас созданных серверов нет.</div>
                    <button
                      type="button"
                      onClick={() => setMultiplayerTab('CREATE')}
                      className="px-3 py-1.5 bg-emerald-800 text-yellow-200 font-bold uppercase text-xs border border-emerald-400"
                    >
                      + Создать первый мир
                    </button>
                  </div>
                )}

                {/* Direct PIN Input Fallback */}
                <div className="pt-2 border-t border-[#3d3023] space-y-1">
                  <label className="text-[#8a7563] font-bold uppercase tracking-wider block text-[10px]">
                    Или введите PIN-код напрямую:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      maxLength={16}
                      className="flex-1 bg-[#120d09] border border-[#473729] focus:border-emerald-400 px-3 py-1.5 text-emerald-300 font-bold text-xs outline-none font-mono"
                      placeholder="Например: 1234"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMultiplayerPrompt(false);
                        handleStartMultiplayer();
                      }}
                      className="px-3 py-1.5 bg-[#4a382a] hover:bg-[#614937] text-white font-bold uppercase text-xs border border-[#785d46]"
                    >
                      Войти по PIN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

