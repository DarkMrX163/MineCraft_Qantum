import mqtt, { MqttClient } from 'mqtt';
import { ServerPlayer, ChatMessage } from './types';
import { BlockType } from '../constants';

export class MultiplayerClient {
  private mqttClient: MqttClient | null = null;
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;

  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  public localPlayerId: string = 'p_' + Math.random().toString(36).substring(2, 9);
  public roomId = 'default';
  public connected = false;
  public connectionStatusText = 'Подключение...';

  public playerName = 'Стив';
  public playerColor = '#00d26a';

  private roomBlockChanges: Record<string, number> = {};

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

  private knownPlayersMap = new Map<string, ServerPlayer & { lastSeen: number }>();

  private onInitCallback?: (data: { playerId: string; roomId: string; players: ServerPlayer[]; blockChanges: Record<string, number> }) => void;
  private onPlayerJoinedCallback?: (player: ServerPlayer) => void;
  private onPlayerMovedCallback?: (player: { id: string; x: number; y: number; z: number; yaw: number; pitch: number; holdingBlock: number; isMoving: boolean; isJumping: boolean }) => void;
  private onPlayerLeftCallback?: (playerId: string) => void;
  private onBlockUpdateCallback?: (data: { x: number; y: number; z: number; blockId: number; byPlayer: string }) => void;
  private onChatCallback?: (msg: ChatMessage) => void;
  private onErrorCallback?: (errMessage: string) => void;

  constructor() {}

  public connect(roomId: string, playerName: string, playerColor: string) {
    const rawRoom = (roomId || 'default').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    this.roomId = rawRoom || 'default';

    this.playerName = playerName || 'Стив';
    this.playerColor = playerColor || '#00d26a';

    const topic = `craftcraft/v5/room/${this.roomId}`;

    // 1. Set up BroadcastChannel for instant local multi-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`craftcraft_bc_${this.roomId}`);
        this.bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === this.localPlayerId) return;
          this.handleIncomingPayload(msg);
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. Connect to Global Public MQTT WebSocket Relay (Works on GitHub Pages, Vercel, Netlify, AI Studio, Everywhere!)
    try {
      const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';
      const client = mqtt.connect(brokerUrl, {
        keepalive: 20,
        clientId: `cc3d_${this.localPlayerId}_${Math.floor(Math.random() * 1000)}`,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 2000
      });

      this.mqttClient = client;

      client.on('connect', () => {
        this.connected = true;
        this.connectionStatusText = 'Подключено к глобальному серверу (MQTT)';

        client.subscribe(topic, { qos: 0 }, (err) => {
          if (!err) {
            // Send presence request to ask existing players in room for state
            this.publishMQTT({
              type: 'presence_request',
              senderId: this.localPlayerId,
              playerName: this.playerName,
              playerColor: this.playerColor,
              state: this.lastLocalState
            });
          }
        });

        if (this.onInitCallback) {
          this.onInitCallback({
            playerId: this.localPlayerId,
            roomId: this.roomId,
            players: Array.from(this.knownPlayersMap.values()),
            blockChanges: this.roomBlockChanges
          });
        }
      });

      client.on('message', (_top, message) => {
        try {
          const msg = JSON.parse(message.toString());
          if (!msg || msg.senderId === this.localPlayerId) return;
          this.handleIncomingPayload(msg);
        } catch (err) {
          console.error('Error parsing MQTT message:', err);
        }
      });

      client.on('error', (err) => {
        console.warn('MQTT Connection Warning:', err);
        this.connected = false;
        this.connectionStatusText = 'Переподключение...';
      });

      client.on('offline', () => {
        this.connected = false;
      });
    } catch (err) {
      console.warn('MQTT Init Error:', err);
    }

    // 3. Optional Node Express WebSocket sync for AI Studio environment
    this.initLocalWebSocketServer();

    // 4. Start Heartbeat & Stale Player Cleanup
    this.startTimers();
  }

  private initLocalWebSocketServer() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(this.playerName)}&color=${encodeURIComponent(this.playerColor)}`;

      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { this.connected = true; };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.senderId !== this.localPlayerId) {
            this.handleIncomingPayload(msg);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore if on static hosting without Express WS server
    }
  }

  private startTimers() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Heartbeat every 2.5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.publishMQTT({
        type: 'heartbeat',
        senderId: this.localPlayerId,
        playerName: this.playerName,
        playerColor: this.playerColor,
        state: this.lastLocalState
      });
    }, 2500);

    // Cleanup stale players (inactive > 8s)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, player] of this.knownPlayersMap.entries()) {
        if (now - player.lastSeen > 8500) {
          this.knownPlayersMap.delete(id);
          if (this.onPlayerLeftCallback) {
            this.onPlayerLeftCallback(id);
          }
        }
      }
    }, 3000);
  }

  private publishMQTT(payload: Record<string, unknown>) {
    if (this.mqttClient && this.mqttClient.connected) {
      const topic = `craftcraft/v5/room/${this.roomId}`;
      try {
        this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 0 });
      } catch {
        // Ignore publish error
      }
    }
  }

  private handleIncomingPayload(msg: Record<string, unknown>) {
    const type = msg.type as string;
    const senderId = (msg.senderId as string) || (msg.id as string);

    if (!senderId || senderId === this.localPlayerId) return;

    const now = Date.now();

    switch (type) {
      case 'presence_request': {
        const pName = (msg.playerName as string) || 'Стив';
        const pColor = (msg.playerColor as string) || '#00d26a';

        if (!this.knownPlayersMap.has(senderId)) {
          const newPlayer: ServerPlayer & { lastSeen: number } = {
            id: senderId,
            name: pName,
            color: pColor,
            x: 0, y: 25, z: 0, yaw: 0, pitch: 0,
            holdingBlock: 1, isMoving: false, isJumping: false,
            lastSeen: now
          };
          this.knownPlayersMap.set(senderId, newPlayer);
          if (this.onPlayerJoinedCallback) {
            this.onPlayerJoinedCallback(newPlayer);
          }
        }

        // Send presence_response back to answer the requester
        this.publishMQTT({
          type: 'presence_response',
          senderId: this.localPlayerId,
          playerName: this.playerName,
          playerColor: this.playerColor,
          state: this.lastLocalState,
          blockChanges: this.roomBlockChanges
        });
        break;
      }

      case 'presence_response': {
        const pName = (msg.playerName as string) || 'Стив';
        const pColor = (msg.playerColor as string) || '#00d26a';
        const st = (msg.state as ServerPlayer) || {};
        const blockChanges = (msg.blockChanges as Record<string, number>) || {};

        Object.assign(this.roomBlockChanges, blockChanges);

        if (!this.knownPlayersMap.has(senderId)) {
          const newPlayer: ServerPlayer & { lastSeen: number } = {
            id: senderId,
            name: pName,
            color: pColor,
            x: Number(st.x) || 0,
            y: Number(st.y) || 25,
            z: Number(st.z) || 0,
            yaw: Number(st.yaw) || 0,
            pitch: Number(st.pitch) || 0,
            holdingBlock: Number(st.holdingBlock) || 1,
            isMoving: !!st.isMoving,
            isJumping: !!st.isJumping,
            lastSeen: now
          };
          this.knownPlayersMap.set(senderId, newPlayer);
          if (this.onPlayerJoinedCallback) {
            this.onPlayerJoinedCallback(newPlayer);
          }
        } else {
          const existing = this.knownPlayersMap.get(senderId)!;
          existing.lastSeen = now;
        }

        if (this.onInitCallback) {
          this.onInitCallback({
            playerId: this.localPlayerId,
            roomId: this.roomId,
            players: Array.from(this.knownPlayersMap.values()),
            blockChanges: this.roomBlockChanges
          });
        }
        break;
      }

      case 'heartbeat': {
        const pName = (msg.playerName as string) || 'Стив';
        const pColor = (msg.playerColor as string) || '#00d26a';
        const st = (msg.state as ServerPlayer) || {};

        if (!this.knownPlayersMap.has(senderId)) {
          const newPlayer: ServerPlayer & { lastSeen: number } = {
            id: senderId,
            name: pName,
            color: pColor,
            x: Number(st.x) || 0,
            y: Number(st.y) || 25,
            z: Number(st.z) || 0,
            yaw: Number(st.yaw) || 0,
            pitch: Number(st.pitch) || 0,
            holdingBlock: Number(st.holdingBlock) || 1,
            isMoving: !!st.isMoving,
            isJumping: !!st.isJumping,
            lastSeen: now
          };
          this.knownPlayersMap.set(senderId, newPlayer);
          if (this.onPlayerJoinedCallback) {
            this.onPlayerJoinedCallback(newPlayer);
          }
        } else {
          const existing = this.knownPlayersMap.get(senderId)!;
          existing.lastSeen = now;
        }
        break;
      }

      case 'move': {
        const moveData = {
          id: senderId,
          x: Number(msg.x) || 0,
          y: Number(msg.y) || 0,
          z: Number(msg.z) || 0,
          yaw: Number(msg.yaw) || 0,
          pitch: Number(msg.pitch) || 0,
          holdingBlock: Number(msg.holdingBlock) || 1,
          isMoving: !!msg.isMoving,
          isJumping: !!msg.isJumping
        };

        if (this.knownPlayersMap.has(senderId)) {
          const existing = this.knownPlayersMap.get(senderId)!;
          existing.lastSeen = now;
          existing.x = moveData.x;
          existing.y = moveData.y;
          existing.z = moveData.z;
          existing.yaw = moveData.yaw;
          existing.pitch = moveData.pitch;
          existing.holdingBlock = moveData.holdingBlock;
          existing.isMoving = moveData.isMoving;
          existing.isJumping = moveData.isJumping;
        } else {
          const newPlayer: ServerPlayer & { lastSeen: number } = {
            name: (msg.senderName as string) || 'Стив',
            color: (msg.senderColor as string) || '#00d26a',
            ...moveData,
            lastSeen: now
          };
          this.knownPlayersMap.set(senderId, newPlayer);
          if (this.onPlayerJoinedCallback) {
            this.onPlayerJoinedCallback(newPlayer);
          }
        }

        if (this.onPlayerMovedCallback) {
          this.onPlayerMovedCallback(moveData);
        }
        break;
      }

      case 'block_update': {
        const bx = Number(msg.x);
        const by = Number(msg.y);
        const bz = Number(msg.z);
        const bId = Number(msg.blockId);
        const key = `${bx},${by},${bz}`;
        this.roomBlockChanges[key] = bId;

        if (this.onBlockUpdateCallback) {
          this.onBlockUpdateCallback({
            x: bx,
            y: by,
            z: bz,
            blockId: bId,
            byPlayer: senderId
          });
        }
        break;
      }

      case 'chat': {
        if (this.onChatCallback && msg.chat) {
          this.onChatCallback(msg.chat as ChatMessage);
        }
        break;
      }

      case 'player_left': {
        this.knownPlayersMap.delete(senderId);
        if (this.onPlayerLeftCallback) {
          this.onPlayerLeftCallback(senderId);
        }
        break;
      }
    }
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

    const payload = {
      type: 'move',
      senderId: this.localPlayerId,
      senderName: this.playerName,
      senderColor: this.playerColor,
      ...this.lastLocalState
    };

    // 1. Publish via Global MQTT WebSocket Relay
    this.publishMQTT(payload);

    // 2. Publish via BroadcastChannel
    if (this.bc) {
      try { this.bc.postMessage(payload); } catch {}
    }

    // 3. Publish via Express WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(payload)); } catch {}
    }
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockId: BlockType) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    const key = `${bx},${by},${bz}`;
    this.roomBlockChanges[key] = blockId;

    const payload = {
      type: 'block_update',
      senderId: this.localPlayerId,
      x: bx,
      y: by,
      z: bz,
      blockId
    };

    this.publishMQTT(payload);

    if (this.bc) {
      try { this.bc.postMessage(payload); } catch {}
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify(payload)); } catch {}
    }
  }

  public sendChat(text: string) {
    const chatMsg: ChatMessage = {
      id: 'm_' + Math.random().toString(36).substring(2, 8),
      senderId: this.localPlayerId,
      senderName: this.playerName,
      senderColor: this.playerColor,
      text: text.trim().slice(0, 120),
      timestamp: Date.now()
    };

    const payload = {
      type: 'chat',
      senderId: this.localPlayerId,
      chat: chatMsg
    };

    this.publishMQTT(payload);

    if (this.bc) {
      try { this.bc.postMessage(payload); } catch {}
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'chat', text })); } catch {}
    } else if (this.onChatCallback) {
      this.onChatCallback(chatMsg);
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
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.mqttClient) {
      try {
        this.publishMQTT({ type: 'player_left', senderId: this.localPlayerId });
        this.mqttClient.end(true);
      } catch {}
      this.mqttClient = null;
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
