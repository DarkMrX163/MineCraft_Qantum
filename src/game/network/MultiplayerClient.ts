import { ServerPlayer, ChatMessage } from './types';
import { BlockType } from '../constants';

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  public localPlayerId: string | null = null;
  public roomId = 'default';
  public connected = false;

  private onInitCallback?: (data: { playerId: string; roomId: string; players: ServerPlayer[]; blockChanges: Record<string, number> }) => void;
  private onPlayerJoinedCallback?: (player: ServerPlayer) => void;
  private onPlayerMovedCallback?: (player: { id: string; x: number; y: number; z: number; yaw: number; pitch: number; holdingBlock: number; isMoving: boolean; isJumping: boolean }) => void;
  private onPlayerLeftCallback?: (playerId: string) => void;
  private onBlockUpdateCallback?: (data: { x: number; y: number; z: number; blockId: number; byPlayer: string }) => void;
  private onChatCallback?: (msg: ChatMessage) => void;
  private onErrorCallback?: (errMessage: string) => void;

  constructor() {}

  public connect(roomId: string, playerName: string, playerColor: string) {
    this.roomId = roomId || 'default';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(playerName)}&color=${encodeURIComponent(playerColor)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'init':
            this.localPlayerId = msg.playerId;
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
            if (this.onPlayerJoinedCallback) {
              this.onPlayerJoinedCallback(msg.player);
            }
            break;

          case 'player_moved':
            if (this.onPlayerMovedCallback && msg.id !== this.localPlayerId) {
              this.onPlayerMovedCallback(msg);
            }
            break;

          case 'player_left':
            if (this.onPlayerLeftCallback) {
              this.onPlayerLeftCallback(msg.playerId);
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
      console.error('WebSocket error:', err);
    };
  }

  public sendMove(x: number, y: number, z: number, yaw: number, pitch: number, holdingBlock: BlockType, isMoving: boolean, isJumping: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'move',
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        z: Math.round(z * 100) / 100,
        yaw: Math.round(yaw * 100) / 100,
        pitch: Math.round(pitch * 100) / 100,
        holdingBlock,
        isMoving,
        isJumping
      }));
    }
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockId: BlockType) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'block_update',
        x,
        y,
        z,
        blockId
      }));
    }
  }

  public sendChat(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat',
        text
      }));
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}
