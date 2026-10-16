import Peer, { DataConnection } from 'peerjs';
import { ServerPlayer, ChatMessage } from './types';
import { BlockType } from '../constants';

export class MultiplayerClient {
  private peer: Peer | null = null;
  private peerConns: Map<string, DataConnection> = new Map();
  private hostConn: DataConnection | null = null;
  public isHost = false;

  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private httpPollTimer: NodeJS.Timeout | null = null;

  public localPlayerId: string = 'p_' + Math.random().toString(36).substring(2, 9);
  public roomId = 'default';
  public connected = false;
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
    this.roomId = (roomId || 'default').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!this.roomId) this.roomId = 'default';

    this.playerName = playerName || 'Стив';
    this.playerColor = playerColor || '#00d26a';

    // 1. Set up BroadcastChannel for local multi-tab instant sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`craftcraft_bc_${this.roomId}`);
        this.bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.senderId === this.localPlayerId) return;

          if (msg.type === 'move') {
            this.handlePlayerMove(msg);
          } else if (msg.type === 'block_update') {
            this.handleBlockUpdate(msg);
          } else if (msg.type === 'chat') {
            if (this.onChatCallback) this.onChatCallback(msg.chat);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 2. PeerJS P2P WebRTC connection (works on GitHub Pages, Vercel, Netlify, anywhere!)
    this.initPeerJS();

    // 3. Optional Node Express WebSocket & HTTP fallback
    this.initWebSocketAndHttp();
  }

  private initPeerJS() {
    const hostPeerId = `craftcraft_v3_${this.roomId}_host`;

    // Try claiming host ID first
    try {
      const hostCandidate = new Peer(hostPeerId, { debug: 0 });

      hostCandidate.on('open', () => {
        this.peer = hostCandidate;
        this.isHost = true;
        this.connected = true;

        if (this.onInitCallback) {
          this.onInitCallback({
            playerId: this.localPlayerId,
            roomId: this.roomId,
            players: Array.from(this.knownPlayersMap.values()),
            blockChanges: this.roomBlockChanges
          });
        }

        // Host accepts incoming P2P connections from joiners
        this.peer.on('connection', (conn) => {
          this.setupHostConnection(conn);
        });
      });

      hostCandidate.on('error', (err) => {
        // If host ID is taken, this client is a joiner!
        if (err.type === 'unavailable-id' || err.type === 'peer-unavailable') {
          hostCandidate.destroy();
          this.initPeerJSAsJoiner(hostPeerId);
        }
      });
    } catch {
      this.initPeerJSAsJoiner(hostPeerId);
    }
  }

  private initPeerJSAsJoiner(hostPeerId: string) {
    try {
      this.peer = new Peer({ debug: 0 });

      this.peer.on('open', (peerId) => {
        this.localPlayerId = peerId;
        const conn = this.peer!.connect(hostPeerId, { reliable: true });
        this.hostConn = conn;

        conn.on('open', () => {
          this.connected = true;
          // Send join request to host
          conn.send({
            type: 'join',
            playerId: this.localPlayerId,
            playerName: this.playerName,
            playerColor: this.playerColor,
            state: this.lastLocalState
          });
        });

        conn.on('data', (dataRaw: unknown) => {
          this.handleP2PMessage(dataRaw);
        });

        conn.on('close', () => {
          this.connected = false;
          // If host disconnects, try claiming host role
          setTimeout(() => this.initPeerJS(), 1000);
        });
      });
    } catch (err) {
      console.warn('P2P Joiner error:', err);
    }
  }

  private setupHostConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.peerConns.set(conn.peer, conn);
    });

    conn.on('data', (dataRaw: unknown) => {
      const msg = dataRaw as { type: string; playerId?: string; playerName?: string; playerColor?: string; state?: ServerPlayer; [key: string]: unknown };
      if (!msg) return;

      if (msg.type === 'join') {
        const joinerState: ServerPlayer = {
          id: conn.peer,
          name: (msg.playerName as string) || 'Стив',
          color: (msg.playerColor as string) || '#00d26a',
          x: 0,
          y: 25,
          z: 0,
          yaw: 0,
          pitch: 0,
          holdingBlock: 1,
          isMoving: false,
          isJumping: false
        };

        this.knownPlayersMap.set(conn.peer, joinerState);

        // Reply to joiner with current world init
        conn.send({
          type: 'init',
          playerId: conn.peer,
          roomId: this.roomId,
          players: Array.from(this.knownPlayersMap.values()).filter(p => p.id !== conn.peer),
          blockChanges: this.roomBlockChanges
        });

        // Broadcast new player join to all other peers
        this.broadcastP2P(conn.peer, {
          type: 'player_joined',
          player: joinerState
        });

        if (this.onPlayerJoinedCallback) {
          this.onPlayerJoinedCallback(joinerState);
        }
      } else {
        // Relay move/block/chat messages to all other P2P peers
        this.handleP2PMessage(msg);
        this.broadcastP2P(conn.peer, msg);
      }
    });

    conn.on('close', () => {
      this.peerConns.delete(conn.peer);
      this.knownPlayersMap.delete(conn.peer);
      this.broadcastP2P(null, { type: 'player_left', playerId: conn.peer });
      if (this.onPlayerLeftCallback) {
        this.onPlayerLeftCallback(conn.peer);
      }
    });
  }

  private handleP2PMessage(dataRaw: unknown) {
    const msg = dataRaw as { type: string; [key: string]: unknown };
    if (!msg) return;

    switch (msg.type) {
      case 'init': {
        this.connected = true;
        const players = (msg.players as ServerPlayer[]) || [];
        const blockChanges = (msg.blockChanges as Record<string, number>) || {};

        players.forEach(p => this.knownPlayersMap.set(p.id, p));
        Object.assign(this.roomBlockChanges, blockChanges);

        if (this.onInitCallback) {
          this.onInitCallback({
            playerId: this.localPlayerId,
            roomId: this.roomId,
            players,
            blockChanges
          });
        }
        break;
      }

      case 'player_joined': {
        const p = msg.player as ServerPlayer;
        if (p && p.id !== this.localPlayerId) {
          this.knownPlayersMap.set(p.id, p);
          if (this.onPlayerJoinedCallback) {
            this.onPlayerJoinedCallback(p);
          }
        }
        break;
      }

      case 'move': {
        const senderId = (msg.senderId as string) || (msg.id as string);
        if (senderId && senderId !== this.localPlayerId) {
          this.handlePlayerMove({
            id: senderId,
            x: Number(msg.x) || 0,
            y: Number(msg.y) || 0,
            z: Number(msg.z) || 0,
            yaw: Number(msg.yaw) || 0,
            pitch: Number(msg.pitch) || 0,
            holdingBlock: Number(msg.holdingBlock) || 1,
            isMoving: !!msg.isMoving,
            isJumping: !!msg.isJumping
          });
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
            byPlayer: (msg.senderId as string) || 'p2p'
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
        const leftId = msg.playerId as string;
        if (leftId) {
          this.knownPlayersMap.delete(leftId);
          if (this.onPlayerLeftCallback) {
            this.onPlayerLeftCallback(leftId);
          }
        }
        break;
      }
    }
  }

  private broadcastP2P(excludePeerId: string | null, payload: unknown) {
    for (const [peerId, conn] of this.peerConns.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      if (conn.open) {
        try {
          conn.send(payload);
        } catch {
          // Ignore
        }
      }
    }
  }

  private handlePlayerMove(msg: { id: string; x: number; y: number; z: number; yaw: number; pitch: number; holdingBlock: number; isMoving: boolean; isJumping: boolean }) {
    if (this.onPlayerMovedCallback && msg.id !== this.localPlayerId) {
      this.onPlayerMovedCallback(msg);
    }
  }

  private handleBlockUpdate(msg: { x: number; y: number; z: number; blockId: number; byPlayer: string }) {
    const key = `${msg.x},${msg.y},${msg.z}`;
    this.roomBlockChanges[key] = msg.blockId;
    if (this.onBlockUpdateCallback) {
      this.onBlockUpdateCallback(msg);
    }
  }

  private initWebSocketAndHttp() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.roomId)}&name=${encodeURIComponent(this.playerName)}&color=${encodeURIComponent(this.playerColor)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { this.connected = true; };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleP2PMessage(msg);
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore if no WS server
    }

    // HTTP polling backup if server is present
    if (this.httpPollTimer) clearInterval(this.httpPollTimer);
    this.httpPollTimer = setInterval(async () => {
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
          if (data.players) {
            data.players.forEach((sp: ServerPlayer) => {
              if (sp.id !== this.localPlayerId && !this.knownPlayersMap.has(sp.id)) {
                this.knownPlayersMap.set(sp.id, sp);
                if (this.onPlayerJoinedCallback) this.onPlayerJoinedCallback(sp);
              } else if (sp.id !== this.localPlayerId && this.onPlayerMovedCallback) {
                this.onPlayerMovedCallback(sp);
              }
            });
          }
        }
      } catch {
        // Ignore REST fetch errors on static hosting like GitHub Pages
      }
    }, 250);
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
      id: this.localPlayerId,
      ...this.lastLocalState
    };

    // 1. Send via PeerJS WebRTC P2P
    if (this.isHost) {
      this.broadcastP2P(null, payload);
    } else if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(payload); } catch {}
    }

    // 2. Send via BroadcastChannel
    if (this.bc) {
      try { this.bc.postMessage(payload); } catch {}
    }

    // 3. Send via WebSocket if open
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
    this.pendingBlockUpdates.push({ x: bx, y: by, z: bz, blockId });

    const payload = {
      type: 'block_update',
      senderId: this.localPlayerId,
      x: bx,
      y: by,
      z: bz,
      blockId
    };

    if (this.isHost) {
      this.broadcastP2P(null, payload);
    } else if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(payload); } catch {}
    }

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

    if (this.isHost) {
      this.broadcastP2P(null, payload);
    } else if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(payload); } catch {}
    }

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
    if (this.httpPollTimer) {
      clearInterval(this.httpPollTimer);
      this.httpPollTimer = null;
    }
    this.peerConns.forEach(c => c.close());
    this.peerConns.clear();
    if (this.hostConn) {
      this.hostConn.close();
      this.hostConn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
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
