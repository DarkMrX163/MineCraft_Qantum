import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PLAYERS_PER_ROOM = 15; // Upgraded to 15 players as requested
const WORLD_DATA_FILE = path.join(__dirname, 'world-data.json');

interface PlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  holdingBlock: number;
  isMoving: boolean;
  isJumping: boolean;
}

interface RoomData {
  blockChanges: Record<string, number>;
}

const rooms = new Map<string, {
  players: Map<string, { ws: WebSocket; state: PlayerState }>;
  blockChanges: Record<string, number>;
  lastEventTime: number;
}>();

function loadWorldData(): Record<string, RoomData> {
  try {
    if (fs.existsSync(WORLD_DATA_FILE)) {
      const data = fs.readFileSync(WORLD_DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load world data:', err);
  }
  return {};
}

let saveTimeout: NodeJS.Timeout | null = null;
function scheduleWorldSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    try {
      const exportData: Record<string, RoomData> = {};
      for (const [roomId, room] of rooms.entries()) {
        exportData[roomId] = {
          blockChanges: room.blockChanges
        };
      }
      fs.writeFileSync(WORLD_DATA_FILE, JSON.stringify(exportData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save world data:', err);
    }
  }, 2000);
}

const savedWorldData = loadWorldData();

function getOrCreateRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      blockChanges: savedWorldData[roomId]?.blockChanges || {},
      lastEventTime: Date.now()
    };
    rooms.set(roomId, room);
  }
  return room;
}

// Global server-wide event trigger loop (runs every 45-90 seconds per room)
const RANDOM_EVENTS = [
  { id: 'METEOR_SHOWER', title: 'МЕТЕОРИТНЫЙ ДОЖДЬ', desc: 'С неба падают пылающие метеориты с редкой рудой!', duration: 25 },
  { id: 'MOB_INVASION', title: 'ВНЕЗАПНОЕ НАПАДЕНИЕ', desc: 'Орда монстров атаковала мир! Защищайте постройки!', duration: 30 },
  { id: 'TREASURE_DROP', title: 'РЕДКАЯ НАХОДКА', desc: 'Неподалеку упал сундук с сокровищами и золотом!', duration: 35 },
  { id: 'GOLDEN_RUSH', title: 'ЗОЛОТАЯ ЛИХОРАДКА', desc: 'Удвоенный дроп и скорость добычи блоков!', duration: 20 },
];

function checkRoomEvents() {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.size > 0 && now - room.lastEventTime > 50000) { // Every ~50s
      room.lastEventTime = now;
      const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      broadcastToRoom(roomId, null, {
        type: 'world_event',
        event,
        timestamp: now,
        randomSeed: Math.floor(Math.random() * 100000)
      });
    }
  }
}
setInterval(checkRoomEvents, 10000);

function broadcastToRoom(roomId: string, excludePlayerId: string | null, payload: unknown) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const [id, client] of room.players.entries()) {
    if (excludePlayerId && id === excludePlayerId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  app.get('/api/room/:roomId', (req, res) => {
    const roomId = req.params.roomId || 'default';
    const room = rooms.get(roomId);
    res.json({
      roomId,
      playerCount: room ? room.players.size : 0,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      blocksModified: room ? Object.keys(room.blockChanges).length : 0
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = (url.searchParams.get('room') || 'default').trim().toLowerCase().slice(0, 32);
    const playerName = (url.searchParams.get('name') || 'Стив').trim().slice(0, 16);
    const playerColor = (url.searchParams.get('color') || '#00d26a').trim().slice(0, 10);
    const playerId = 'p_' + Math.random().toString(36).substring(2, 9);

    const room = getOrCreateRoom(roomId);

    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      ws.send(JSON.stringify({
        type: 'room_full',
        message: `В комнате "${roomId}" уже максимум 15 игроков. Попробуйте другую комнату!`
      }));
      ws.close(1008, 'Room is full');
      return;
    }

    const initialPlayerState: PlayerState = {
      id: playerId,
      name: playerName,
      color: playerColor,
      x: 0,
      y: 25,
      z: 0,
      yaw: 0,
      pitch: 0,
      holdingBlock: 1,
      isMoving: false,
      isJumping: false
    };

    room.players.set(playerId, { ws, state: initialPlayerState });

    const existingPlayers = Array.from(room.players.values())
      .filter(p => p.state.id !== playerId)
      .map(p => p.state);

    ws.send(JSON.stringify({
      type: 'init',
      playerId,
      roomId,
      maxPlayers: MAX_PLAYERS_PER_ROOM,
      players: existingPlayers,
      blockChanges: room.blockChanges
    }));

    broadcastToRoom(roomId, playerId, {
      type: 'player_joined',
      player: initialPlayerState
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());

        switch (msg.type) {
          case 'move': {
            const playerEntry = room.players.get(playerId);
            if (playerEntry) {
              playerEntry.state.x = Number(msg.x) || 0;
              playerEntry.state.y = Number(msg.y) || 0;
              playerEntry.state.z = Number(msg.z) || 0;
              playerEntry.state.yaw = Number(msg.yaw) || 0;
              playerEntry.state.pitch = Number(msg.pitch) || 0;
              playerEntry.state.holdingBlock = Number(msg.holdingBlock) || 1;
              playerEntry.state.isMoving = !!msg.isMoving;
              playerEntry.state.isJumping = !!msg.isJumping;

              broadcastToRoom(roomId, playerId, {
                type: 'player_moved',
                id: playerId,
                x: playerEntry.state.x,
                y: playerEntry.state.y,
                z: playerEntry.state.z,
                yaw: playerEntry.state.yaw,
                pitch: playerEntry.state.pitch,
                holdingBlock: playerEntry.state.holdingBlock,
                isMoving: playerEntry.state.isMoving,
                isJumping: playerEntry.state.isJumping
              });
            }
            break;
          }

          case 'block_update': {
            const bx = Math.floor(Number(msg.x));
            const by = Math.floor(Number(msg.y));
            const bz = Math.floor(Number(msg.z));
            const blockId = Number(msg.blockId);
            const key = `${bx},${by},${bz}`;

            room.blockChanges[key] = blockId;
            scheduleWorldSave();

            broadcastToRoom(roomId, null, {
              type: 'block_update',
              x: bx,
              y: by,
              z: bz,
              blockId,
              byPlayer: playerId,
              playerName
            });
            break;
          }

          case 'chat': {
            const text = String(msg.text || '').trim().slice(0, 120);
            if (text.length > 0) {
              broadcastToRoom(roomId, null, {
                type: 'chat',
                id: 'm_' + Math.random().toString(36).substring(2, 8),
                senderId: playerId,
                senderName: playerName,
                senderColor: playerColor,
                text,
                timestamp: Date.now()
              });
            }
            break;
          }

          case 'trigger_event': {
            // Player manual event trigger for testing / creative
            const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
            broadcastToRoom(roomId, null, {
              type: 'world_event',
              event,
              timestamp: Date.now(),
              randomSeed: Math.floor(Math.random() * 100000)
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      room.players.delete(playerId);
      broadcastToRoom(roomId, playerId, {
        type: 'player_left',
        playerId
      });
      if (room.players.size === 0) {
        scheduleWorldSave();
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CraftCraft 3D server running on http://0.0.0.0:${PORT} (Max 15 players per room)`);
  });
}

startServer();
