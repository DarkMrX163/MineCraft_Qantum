import React, { useRef, useEffect, useState } from 'react';
import { VoxelWorld } from '../game/world/VoxelWorld';
import { BLOCK_DEFS, BlockType } from '../game/constants';
import { Avatar } from '../game/entities/Avatar';
import { Compass, MapPin, ChevronUp, ChevronDown } from 'lucide-react';

interface MinimapProps {
  world: VoxelWorld | null;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  otherAvatars: Map<string, Avatar>;
}

export const Minimap: React.FC<MinimapProps> = ({
  world,
  playerPos,
  playerYaw,
  otherAvatars,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !world) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = 28; // 57x57 blocks rendered
    const size = canvas.width;
    const center = size / 2;
    const scale = size / (radius * 2);

    ctx.clearRect(0, 0, size, size);

    const px = Math.floor(playerPos.x);
    const pz = Math.floor(playerPos.z);
    const py = Math.floor(playerPos.y);

    // 1. Render Top-Down Voxel Blocks
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const gx = px + dx;
        const gz = pz + dz;

        // Find highest solid surface block at (gx, gz)
        let blockType = BlockType.AIR;
        for (let y = Math.min(63, py + 15); y >= 0; y--) {
          const b = world.getBlock(gx, y, gz);
          if (b !== BlockType.AIR) {
            blockType = b;
            break;
          }
        }

        const def = BLOCK_DEFS[blockType];
        ctx.fillStyle = def ? def.color : '#262626';

        const screenX = center + dx * scale;
        const screenY = center + dz * scale;
        ctx.fillRect(screenX, screenY, scale + 0.5, scale + 0.5);
      }
    }

    // 2. Circular Mask Clipping Frame
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 3. Render Other Online Players (Peers)
    otherAvatars.forEach((avatar) => {
      const adx = avatar.mesh.position.x - playerPos.x;
      const adz = avatar.mesh.position.z - playerPos.z;

      if (Math.abs(adx) < radius && Math.abs(adz) < radius) {
        const aX = center + adx * scale;
        const aY = center + adz * scale;

        ctx.fillStyle = avatar.colorHex || '#ff0055';
        ctx.beginPath();
        ctx.arc(aX, aY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // 4. Render Local Player Indicator at Center with Direction Cone
    ctx.save();
    ctx.translate(center, center);

    // Direction Vision Cone
    ctx.fillStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Note: playerYaw angle offset
    const visionAngle = -playerYaw - Math.PI / 2;
    ctx.arc(0, 0, 18, visionAngle - 0.4, visionAngle + 0.4);
    ctx.closePath();
    ctx.fill();

    // Player Direction Arrow
    ctx.rotate(visionAngle);
    ctx.fillStyle = '#34d199';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }, [world, playerPos.x, playerPos.z, playerPos.y, playerYaw, otherAvatars]);

  return (
    <div className="fixed top-16 right-4 z-40 pointer-events-auto flex flex-col items-end gap-1.5 animate-in fade-in duration-200">
      {/* Minimap Card Header */}
      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 text-white text-[11px] font-bold shadow-lg">
        <Compass className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-mono text-amber-300">
          X: {Math.floor(playerPos.x)} Y: {Math.floor(playerPos.y)} Z: {Math.floor(playerPos.z)}
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Canvas Top-Down Radar View */}
      {isExpanded && (
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 bg-stone-900/80 rounded-full border-2 border-white/30 p-1 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            className="w-full h-full rounded-full"
          />

          {/* North Direction Marker */}
          <div className="absolute top-1 text-[9px] font-black text-amber-400 drop-shadow-md">
            N
          </div>
        </div>
      )}
    </div>
  );
};
