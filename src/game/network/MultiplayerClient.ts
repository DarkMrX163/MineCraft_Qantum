import { ServerPlayer, ChatMessage } from './types';
import { BlockType } from '../constants';

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private httpPollTimer: NodeJS.Timeout | null = null;

  public localPlayerId: string = 'p_' + Math.random().toString(36).substring(2, 9);
  public roomId = 'default';
  public connected = false;
  public playerName = 'Стив';
  public playerColor = '#00d26a';

  private lastLocalState = {
    x: 0,
    y: 25,
    z: 0,
    yaw: 0,
    pitch: 0,
    holdingBlock: 1 as BlockType,
    isMoving: false,
    isJumping: false
  };

  private pendingBlockUpdates: Array<{ x: number; y: number; z: number; blockId: number }> = [];

  private knownPlayersMap = new Map<string, ServerPlayer>();

  private onInitCallback?: (data: { playerId: string; roomId: string; players: ServerPlayer[]; blockChanges: Record<string, number> }) => void;
  private onPlayerJoinedCallback?: (player: ServerPlayer) => void;
  private onPlayerMovedCallback?: (player: { id: string; x: number; y: number; z: number; yaw: number; pitch: number; holdingBlock: number; isMoving: boolean; isJumping: boolean }) => void;
  private onPlayerLeftCallback?: (playerId: string) => void;
  private onBlockUpdateCallback?: (data: { x: number; y: number; z: number; blockId: number; byPlayer: string }) => void;
  private onChatCallback?: (msg: ChatMessage) => void;
  private onErrorCallback?: (errMessage: string) => void;

  constructor() {}

  public connect(roomId: string, playerName: string, playerColor: string) {
    this.roomId = (roomId || 'default').trim().toLowerCase();
    this.playerName = playerName || 'Стив';
    this.playerColor = playerColor || '#00d26a';

    // 1. Set up BroadcastChannel for instant local multi-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`craftcraft_bc_${this.roomId}`);
        this.bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === this.localPlayerId) return;

          if (msg.type === 'move') {
            if (this.onPlayerMovedCallback) {
              this.onPlayerMovedCallback({
                id: msg.senderId,
                x: msg.x,
                y: msg.y,
                z: msg.z,
                yaw: msg.yaw,
                pitch: msg.pitch,
                holdingBlock: msg.holdingBlock,
                isMoving: msg.isMoving,
                isJumping: msg.isJumping
              });
            }
          } else if (msg.type === 'block_update') {
            if (this.onBlockUpdateCallback) {
              this.onBlockUpdateCallback({
                x: msg.x,
                y: msg.y,
                z: msg.z,
                blockId: msg.blockId,
                byPlayer: msg.senderId
              });
            }
          } else if (msg.type === 'chat') {
            if (this.onChatCallback) {
              this.onChatCallback(msg.chat);
            }
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. Try WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(this.playerName)}&color=${encodeURIComponent(this.playerColor)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'init':
              if (msg.playerId) {
                this.localPlayerId = msg.playerId;
              }
              this.connected = true;
              if (this.onInitCallback) {
                this.onInitCallback(msg);
              }
              break;

            case 'room_full':
              if (this.onErrorCallback) {
                this.onErrorCallback(msg.message);
              }
              break;

            case 'player_joined':
              if (msg.player && msg.player.id !== this.localPlayerId) {
                this.knownPlayersMap.set(msg.player.id, msg.player);
                if (this.onPlayerJoinedCallback) {
                  this.onPlayerJoinedCallback(msg.player);
                }
              }
              break;

            case 'player_moved':
              if (this.onPlayerMovedCallback && msg.id !== this.localPlayerId) {
                this.onPlayerMovedCallback(msg);
              }
              break;

            case 'player_left':
              if (msg.playerId) {
                this.knownPlayersMap.delete(msg.playerId);
                if (this.onPlayerLeftCallback) {
                  this.onPlayerLeftCallback(msg.playerId);
                }
              }
              break;

            case 'block_update':
              if (this.onBlockUpdateCallback) {
                this.onBlockUpdateCallback(msg);
              }
              break;

            case 'chat':
              if (this.onChatCallback) {
                this.onChatCallback(msg);
              }
              break;
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error, falling back to HTTP sync:', err);
        this.connected = false;
      };
    } catch {
      this.connected = false;
    }

    // 3. Start HTTP Polling loop (guarantees sync even if WebSockets are blocked)
    this.startHttpPolling();
  }

  private startHttpPolling() {
    if (this.httpPollTimer) clearInterval(this.httpPollTimer);

    let initialSynced = false;

    this.httpPollTimer = setInterval(async () => {
      // If WS is open and active, HTTP sync runs less frequently (every 1.5s as heartbeat/room state sync)
      // If WS is down, HTTP sync runs every 150ms for position updates
      if (this.ws && this.ws.readyState === WebSocket.OPEN && initialSynced) {
        return;
      }

      try {
        const blocksToSend = [...this.pendingBlockUpdates];
        this.pendingBlockUpdates = [];

        const res = await fetch(`/api/room/${encodeURIComponent(this.roomId)}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: this.localPlayerId,
            name: this.playerName,
            color: this.playerColor,
            x: this.lastLocalState.x,
            y: this.lastLocalState.y,
            z: this.lastLocalState.z,
            yaw: this.lastLocalState.yaw,
            pitch: this.lastLocalState.pitch,
            holdingBlock: this.lastLocalState.holdingBlock,
            isMoving: this.lastLocalState.isMoving,
            isJumping: this.lastLocalState.isJumping,
            blockUpdates: blocksToSend
          })
        });

        if (res.ok) {
          this.connected = true;
          const data = await res.json();

          if (!initialSynced) {
            initialSynced = true;
            if (this.onInitCallback) {
              this.onInitCallback({
                playerId: this.localPlayerId,
                roomId: this.roomId,
                players: data.players || [],
                blockChanges: data.blockChanges || {}
              });
            }
          }

          const currentPeerIds = new Set<string>();
          const serverPlayers: ServerPlayer[] = data.players || [];

          for (const sp of serverPlayers) {
            currentPeerIds.add(sp.id);

            if (!this.knownPlayersMap.has(sp.id)) {
              this.knownPlayersMap.set(sp.id, sp);
              if (this.onPlayerJoinedCallback) {
                this.onPlayerJoinedCallback(sp);
              }
            } else if (this.onPlayerMovedCallback) {
              this.onPlayerMovedCallback({
                id: sp.id,
                x: sp.x,
                y: sp.y,
                z: sp.z,
                yaw: sp.yaw,
                pitch: sp.pitch,
                holdingBlock: sp.holdingBlock,
                isMoving: sp.isMoving,
                isJumping: sp.isJumping
              });
            }
          }

          // Check left players
          for (const [knownId] of this.knownPlayersMap.entries()) {
            if (!currentPeerIds.has(knownId)) {
              this.knownPlayersMap.delete(knownId);
              if (this.onPlayerLeftCallback) {
                this.onPlayerLeftCallback(knownId);
              }
            }
          }
        }
      } catch {
        // Retry silently
      }
    }, 150);
  }

  public sendMove(x: number, y: number, z: number, yaw: number, pitch: number, holdingBlock: BlockType, isMoving: boolean, isJumping: boolean) {
    this.lastLocalState = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      z: Math.round(z * 100) / 100,
      yaw: Math.round(yaw * 100) / 100,
      pitch: Math.round(pitch * 100) / 100,
      holdingBlock,
      isMoving,
      isJumping
    };

    // Broadcast to local tabs instantly
    if (this.bc) {
      try {
        this.bc.postMessage({
          type: 'move',
          senderId: this.localPlayerId,
          ...this.lastLocalState
        });
      } catch {
        // Ignore
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'move',
        ...this.lastLocalState
      }));
    }
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockId: BlockType) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    this.pendingBlockUpdates.push({ x: bx, y: by, z: bz, blockId });

    if (this.bc) {
      try {
        this.bc.postMessage({
          type: 'block_update',
          senderId: this.localPlayerId,
          x: bx,
          y: by,
          z: bz,
          blockId
        });
      } catch {
        // Ignore
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'block_update',
        x: bx,
        y: by,
        z: bz,
        blockId
      }));
    }
  }

  public sendChat(text: string) {
    const msg: ChatMessage = {
      id: 'm_' + Math.random().toString(36).substring(2, 8),
      senderId: this.localPlayerId,
      senderName: this.playerName,
      senderColor: this.playerColor,
      text: text.trim().slice(0, 120),
      timestamp: Date.now()
    };

    if (this.bc) {
      try {
        this.bc.postMessage({
          type: 'chat',
          senderId: this.localPlayerId,
          chat: msg
        });
      } catch {
        // Ignore
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat',
        text
      }));
    } else if (this.onChatCallback) {
      this.onChatCallback(msg);
    }
  }

  public onInit(cb: NonNullable<MultiplayerClient['onInitCallback']>) { this.onInitCallback = cb; }
  public onPlayerJoined(cb: NonNullable<MultiplayerClient['onPlayerJoinedCallback']>) { this.onPlayerJoinedCallback = cb; }
  public onPlayerMoved(cb: NonNullable<MultiplayerClient['onPlayerMovedCallback']>) { this.onPlayerMovedCallback = cb; }
  public onPlayerLeft(cb: NonNullable<MultiplayerClient['onPlayerLeftCallback']>) { this.onPlayerLeftCallback = cb; }
  public onBlockUpdate(cb: NonNullable<MultiplayerClient['onBlockUpdateCallback']>) { this.onBlockUpdateCallback = cb; }
  public onChat(cb: NonNullable<MultiplayerClient['onChatCallback']>) { this.onChatCallback = cb; }
  public onError(cb: NonNullable<MultiplayerClient['onErrorCallback']>) { this.onErrorCallback = cb; }

  public disconnect() {
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
    this.connected = false;
  }
}
