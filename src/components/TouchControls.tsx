import React, { useRef, useEffect, useState } from 'react';
import { Pickaxe, Box, ArrowUp, Feather, Eye, Package } from 'lucide-react';

interface TouchControlsProps {
  onMoveInput: (move: { x: number; z: number }) => void;
  onLookInput: (dx: number, dy: number) => void;
  onMine: () => void;
  onPlace: () => void;
  onJump: () => void;
  onToggleFly: () => void;
  onToggleCamera: () => void;
  onOpenInventory: () => void;
  isFlying: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveInput,
  onLookInput,
  onMine,
  onPlace,
  onJump,
  onToggleFly,
  onToggleCamera,
  onOpenInventory,
  isFlying
}) => {
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  const joystickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

        // If touch started on an interactive button, skip registering joystick/look
        if (targetEl && targetEl.closest('button')) {
          continue;
        }

        // Left half of screen -> Joystick
        if (touch.clientX < window.innerWidth / 2 && joystickTouchId.current === null) {
          joystickTouchId.current = touch.identifier;
          updateJoystick(touch.clientX, touch.clientY);
        }
        // Right half of screen -> Camera Look
        else if (touch.clientX >= window.innerWidth / 2 && lookTouchId.current === null) {
          lookTouchId.current = touch.identifier;
          lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === joystickTouchId.current) {
          updateJoystick(touch.clientX, touch.clientY);
        } else if (touch.identifier === lookTouchId.current && lastLookPos.current) {
          const dx = touch.clientX - lastLookPos.current.x;
          const dy = touch.clientY - lastLookPos.current.y;
          // Smooth look sensitivity without camera tilt
          onLookInput(dx * 0.0035, dy * 0.0035);
          lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          setJoystickPos({ x: 0, y: 0 });
          onMoveInput({ x: 0, z: 0 });
        } else if (touch.identifier === lookTouchId.current) {
          lookTouchId.current = null;
          lastLookPos.current = null;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMoveInput, onLookInput]);

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickAreaRef.current) return;
    const rect = joystickAreaRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = 50;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const jx = Math.cos(angle) * clampedDist;
    const jy = Math.sin(angle) * clampedDist;

    setJoystickPos({ x: jx, y: jy });

    // Normalize input [-1, 1]
    const normX = jx / maxRadius;
    const normZ = -jy / maxRadius; // Up is forward
    onMoveInput({ x: normX, z: normZ });
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-30">
      {/* Joystick Touch Base (Bottom-Left) */}
      <div
        ref={joystickAreaRef}
        className="absolute bottom-16 left-8 w-32 h-32 rounded-full bg-black/40 border-2 border-white/20 backdrop-blur-xs flex items-center justify-center pointer-events-auto touch-none"
      >
        <div
          className="w-14 h-14 rounded-full bg-emerald-500/80 shadow-lg border border-white/40 transition-transform duration-75"
          style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
        />
      </div>

      {/* Tactile Action Buttons (Bottom-Right) */}
      <div className="absolute bottom-12 right-6 flex flex-col gap-3 pointer-events-auto">
        <div className="flex gap-3 justify-end">
          {/* Mine Button */}
          <button
            onTouchStart={(e) => { e.stopPropagation(); onMine(); }}
            onClick={onMine}
            className="w-16 h-16 rounded-2xl bg-gradient-to-b from-red-500 to-red-700 active:scale-95 border-2 border-white/40 shadow-xl flex flex-col items-center justify-center text-white active:bg-red-800 touch-none"
          >
            <Pickaxe className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">ЛОМАТЬ</span>
          </button>

          {/* Place Button */}
          <button
            onTouchStart={(e) => { e.stopPropagation(); onPlace(); }}
            onClick={onPlace}
            className="w-16 h-16 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 active:scale-95 border-2 border-white/40 shadow-xl flex flex-col items-center justify-center text-white active:bg-emerald-800 touch-none"
          >
            <Box className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">СТАВИТЬ</span>
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          {/* Jump Button */}
          <button
            onTouchStart={(e) => { e.stopPropagation(); onJump(); }}
            onClick={onJump}
            className="w-14 h-14 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 active:scale-95 border-2 border-white/40 shadow-xl flex flex-col items-center justify-center text-white touch-none"
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[9px] font-bold">ПРЫЖОК</span>
          </button>

          {/* Fly Toggle */}
          <button
            onClick={onToggleFly}
            className={`w-14 h-14 rounded-2xl border-2 border-white/40 shadow-xl flex flex-col items-center justify-center text-white transition-colors touch-none ${
              isFlying ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-slate-700/80'
            }`}
          >
            <Feather className="w-5 h-5" />
            <span className="text-[9px] font-bold">{isFlying ? 'ПОЛЁТ' : 'ХОДЬБА'}</span>
          </button>

          {/* Camera View Toggle */}
          <button
            onClick={onToggleCamera}
            className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/20 flex flex-col items-center justify-center text-white touch-none"
          >
            <Eye className="w-5 h-5" />
            <span className="text-[8px] font-bold">ВИД</span>
          </button>

          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/20 flex flex-col items-center justify-center text-white touch-none"
          >
            <Package className="w-5 h-5" />
            <span className="text-[8px] font-bold">БЛОКИ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
