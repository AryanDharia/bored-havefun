import { io, Socket } from 'socket.io-client';
import Peer, { type DataConnection } from 'peerjs';

export interface RoomPlayer {
  id: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  avatarColor: string;
  score?: number;
  isReady?: boolean;
  joinedAt?: number;
}

export interface NetworkMessage<T = unknown> {
  type: string;
  senderId?: string;
  senderName?: string;
  payload: T;
  timestamp?: number;
}

export type MessageHandler<T = unknown> = (msg: NetworkMessage<T>) => void;

const AVATAR_COLORS = [
  '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

// Production-ready ICE servers with OpenRelay TURN fallback for cross-network mobile & desktop WebRTC
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: 'turn:standard.relay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:standard.relay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:standard.relay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export interface ServerConfig {
  httpUrl: string;
  isCustom: boolean;
  isConfigured: boolean;
  mode: 'socketio' | 'webrtc';
}

export function getServerConfig(): ServerConfig {
  // 1. Explicit Vite environment variable (Render Web Service or deployment setting)
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return { httpUrl: clean, isCustom: true, isConfigured: true, mode: 'socketio' };
  }

  // 2. User-provided custom server URL stored in localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('playbreak_backend_url');
    if (saved && saved.trim()) {
      let clean = saved.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return { httpUrl: clean, isCustom: true, isConfigured: true, mode: 'socketio' };
    }

    // 3. Localhost development (only when running locally on dev server port 3001)
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || host === '';
    // If local dev and explicit flag/cookie or node test
    if (isLocalDev && window.location.port !== '5173') {
      const devHost = host || 'localhost';
      return {
        httpUrl: `http://${devHost}:3001`,
        isCustom: false,
        isConfigured: true,
        mode: 'socketio'
      };
    }
  }

  // 4. Default: Zero-configuration WebRTC Cloud Network (PeerJS + STUN/TURN)
  return {
    httpUrl: '',
    isCustom: false,
    isConfigured: true,
    mode: 'webrtc'
  };
}

export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string; uptime?: number; mode: 'socketio' | 'webrtc' }> {
  let config: ServerConfig;

  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    config = {
      httpUrl: clean,
      isCustom: true,
      isConfigured: true,
      mode: 'socketio'
    };
  } else {
    config = getServerConfig();
  }

  if (config.mode === 'webrtc') {
    return {
      ok: true,
      message: 'Zero-config WebRTC Network is ready (Phone & Desktop Sync)',
      mode: 'webrtc'
    };
  }

  if (!config.httpUrl) {
    return {
      ok: false,
      message: 'Multiplayer server URL is not configured.',
      mode: 'socketio'
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.httpUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: 'Server is healthy and reachable', uptime: data.uptime, mode: 'socketio' };
    }
    return { ok: false, message: `Server returned HTTP ${res.status}`, mode: 'socketio' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, message: `Cannot connect to server at ${config.httpUrl}: ${msg}`, mode: 'socketio' };
  }
}

export class RoomNetwork {
  private socket: Socket | null = null;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // playerId -> DataConnection
  private connectionPlayerMap: Map<DataConnection, string> = new Map();
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isExplicitlyClosed = false;
  public networkMode: 'socketio' | 'webrtc' = 'webrtc';

  public roomCode: string = '';
  public myId: string = '';
  public myName: string = '';
  public avatarColor: string = '';
  public isHost: boolean = false;
  public players: RoomPlayer[] = [];

  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private onPlayerListChangeCallbacks: Set<(players: RoomPlayer[]) => void> = new Set();
  private onConnectionStatusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected', err?: string) => void> = new Set();

  constructor() {
    this.myId = 'player_' + Math.random().toString(36).substring(2, 9);
    this.avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  private connectSocket(httpUrl: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve(this.socket);
        return;
      }

      const s = io(httpUrl, {
        transports: ['websocket', 'polling'], // WebSocket with polling fallback
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      let settled = false;

      s.once('connect', () => {
        if (!settled) {
          settled = true;
          this.socket = s;
          this.attachSocketListeners(s);
          resolve(s);
        }
      });

      s.once('connect_error', (err) => {
        if (!settled) {
          settled = true;
          s.disconnect();
          reject(new Error(`Failed to connect to multiplayer server at ${httpUrl}: ${err.message}`));
        }
      });
    });
  }

  private attachSocketListeners(s: Socket) {
    s.on('disconnect', (reason) => {
      if (!this.isExplicitlyClosed) {
        this.notifyStatus('disconnected', reason);
      }
    });

    s.on('reconnect', () => {
      this.notifyStatus('connected');
    });

    // Authoritative room updates from server
    s.on('room-updated', (snapshot) => {
      if (snapshot?.players) {
        this.players = snapshot.players;
        const me = this.players.find((p) => p.id === this.myId);
        if (me) {
          this.isHost = me.isHost;
        }
        this.notifyPlayersChanged();
      }
    });

    s.on('ROOM_PLAYERS_UPDATED', (payload) => {
      if (payload?.players) {
        this.players = payload.players;
        const me = this.players.find((p) => p.id === this.myId);
        if (me) {
          this.isHost = me.isHost;
        }
        this.notifyPlayersChanged();
      }
    });

    s.on('player-left', (data) => {
      if (data?.newHostId && data.newHostId === this.myId) {
        this.isHost = true;
      }
    });

    // Handle removal/kick from room by host
    const handleKicked = (data: { roomCode?: string; reason?: string; message?: string }) => {
      const reason = data?.message || data?.reason || 'The host removed you from the room.';
      this.cleanup();
      this.notifyStatus('disconnected', reason);
      this.dispatchInternal('KICKED_FROM_ROOM', {
        type: 'KICKED_FROM_ROOM',
        payload: { message: reason, reason },
        senderId: '',
        senderName: 'Host',
        timestamp: Date.now()
      });
    };

    s.on('kicked-from-room', handleKicked);
    s.on('removed_from_room', handleKicked);

    // Custom network message relay
    s.on('network-message', (msg: NetworkMessage) => {
      this.dispatchInternal(msg.type, msg);
    });

    // Specific game events
    const gameEvents = [
      'SCRIBBLE_GAME_START',
      'SCRIBBLE_WORD_SELECTION_PHASE',
      'SCRIBBLE_WORD_SELECTION_OFFER',
      'SCRIBBLE_DRAWER_SECRET_WORD',
      'SCRIBBLE_ROUND_START',
      'SCRIBBLE_DRAW_STROKE',
      'SCRIBBLE_CLEAR_CANVAS',
      'SCRIBBLE_CLOSE_GUESS',
      'SCRIBBLE_CORRECT_GUESS_SELF',
      'SCRIBBLE_CORRECT_GUESS_BROADCAST',
      'SCRIBBLE_CHAT',
      'SCRIBBLE_TIME_SYNC',
      'SCRIBBLE_ROUND_REVEAL',
      'SCRIBBLE_GAME_OVER',
      'game-started',
      'GAME_STARTED'
    ];

    for (const eventName of gameEvents) {
      s.on(eventName, (payload) => {
        this.dispatchInternal(eventName, {
          type: eventName,
          payload,
          senderId: '',
          senderName: '',
          timestamp: Date.now()
        });
      });
    }
  }

  private dispatchInternal(type: string, netMsg: NetworkMessage) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((h) => h(netMsg));
    }
  }

  // Format clean room code (e.g. "PB7K9M")
  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public getHostPeerId(roomCode: string): string {
    const clean = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `pb-scrb-${clean}`;
  }

  public getClientPeerId(roomCode: string): string {
    const clean = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `pb-scrb-cl-${clean}-${this.myId}`;
  }

  // Multi-tab BroadcastChannel setup
  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`pb_room_${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as NetworkMessage;
          if (msg && msg.senderId !== this.myId) {
            if (msg.type === 'ROOM_JOIN_REQUEST' && this.isHost) {
              const newPlayer = (msg.payload as { player: RoomPlayer }).player;
              if (newPlayer && !this.players.some((p) => p.id === newPlayer.id)) {
                this.players.push(newPlayer);
                this.sendBroadcast({
                  type: 'ROOM_JOIN_ACCEPT',
                  senderId: this.myId,
                  senderName: this.myName,
                  payload: { players: this.players, isHost: false },
                  timestamp: Date.now()
                });
                this.broadcastPlayerList();
              }
            } else {
              this.handleIncomingData(msg);
            }
          }
        };
      } catch {
        // BroadcastChannel unsupported
      }
    }
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      if (msg.type === 'ROOM_JOIN_REQUEST') {
        const newPlayer = (msg.payload as { player: RoomPlayer }).player;
        if (newPlayer) {
          this.connections.set(newPlayer.id, conn);
          this.connectionPlayerMap.set(conn, newPlayer.id);

          if (!this.players.some((p) => p.id === newPlayer.id)) {
            this.players.push(newPlayer);
          }

          conn.send({
            type: 'ROOM_JOIN_ACCEPT',
            senderId: this.myId,
            senderName: this.myName,
            payload: { players: this.players, isHost: false },
            timestamp: Date.now()
          });

          this.broadcastPlayerList();
        }
      } else {
        this.handleIncomingData(msg);
      }
    });

    conn.on('close', () => {
      const playerId = this.connectionPlayerMap.get(conn);
      if (playerId) {
        this.players = this.players.filter((p) => p.id !== playerId);
        this.connections.delete(playerId);
        this.connectionPlayerMap.delete(conn);
        this.broadcastPlayerList();
      }
    });
  }

  private handleIncomingData(msg: NetworkMessage) {
    if (!msg || !msg.type) return;

    if (msg.type === 'ROOM_PLAYER_LIST') {
      const list = (msg.payload as { players: RoomPlayer[] }).players;
      if (Array.isArray(list)) {
        this.players = list;
        const me = this.players.find((p) => p.id === this.myId);
        if (me) {
          this.isHost = me.isHost;
        }
        this.notifyPlayersChanged();
      }
      return;
    }

    if (msg.type === 'KICK_PLAYER') {
      const targetId = (msg.payload as { targetPlayerId: string; reason?: string })?.targetPlayerId;
      const reason = (msg.payload as { targetPlayerId: string; reason?: string })?.reason || 'The host removed you from the room.';
      if (targetId === this.myId) {
        this.cleanup();
        this.notifyStatus('disconnected', reason);
        this.dispatchInternal('KICKED_FROM_ROOM', {
          type: 'KICKED_FROM_ROOM',
          payload: { message: reason, reason },
          senderId: '',
          senderName: 'Host',
          timestamp: Date.now()
        });
        return;
      }
    }

    this.dispatchInternal(msg.type, msg);
  }

  // Kick / remove a player (Host only)
  public async kickPlayer(targetPlayerId: string, reason = 'The host removed you from the room.'): Promise<void> {
    if (!this.isHost) {
      throw new Error('Only the room host can remove players.');
    }
    if (targetPlayerId === this.myId) {
      throw new Error('Host cannot remove themselves from the room.');
    }

    // --- MODE A: Socket.IO ---
    if (this.networkMode === 'socketio' && this.socket && this.socket.connected) {
      return new Promise<void>((resolve, reject) => {
        this.socket!.emit('kick-player', { targetPlayerId, reason }, (resp: { ok: boolean; message?: string }) => {
          if (!resp || !resp.ok) {
            reject(new Error(resp?.message || 'Failed to remove player'));
          } else {
            resolve();
          }
        });
      });
    }

    // --- MODE B: WebRTC ---
    // 1. Send targeted kick message to the player
    this.sendTo(targetPlayerId, 'KICK_PLAYER', { targetPlayerId, reason });
    // Also broadcast on BroadcastChannel for multi-tab
    this.sendBroadcast({
      type: 'KICK_PLAYER',
      senderId: this.myId,
      senderName: this.myName,
      payload: { targetPlayerId, reason },
      timestamp: Date.now()
    });

    // 2. Close connection
    const conn = this.connections.get(targetPlayerId);
    if (conn) {
      conn.close();
      this.connections.delete(targetPlayerId);
      this.connectionPlayerMap.delete(conn);
    }

    // 3. Remove from roster and broadcast
    this.players = this.players.filter((p) => p.id !== targetPlayerId);
    this.broadcastPlayerList();
  }

  public broadcastPlayerList() {
    this.broadcast({
      type: 'ROOM_PLAYER_LIST',
      senderId: this.myId,
      senderName: this.myName,
      payload: { players: this.players },
      timestamp: Date.now()
    });
    this.notifyPlayersChanged();
  }

  // Create room (Host)
  public async createRoom(roomCodeInput: string, hostName: string): Promise<string> {
    this.cleanup();
    this.myName = hostName.trim() || 'Host';
    this.isHost = true;
    this.isExplicitlyClosed = false;

    const config = getServerConfig();
    this.networkMode = config.mode;

    // --- MODE A: Socket.IO Backend Server ---
    if (this.networkMode === 'socketio' && config.httpUrl) {
      this.notifyStatus('connecting');
      try {
        const socket = await this.connectSocket(config.httpUrl);

        return new Promise<string>((resolve, reject) => {
          socket.emit('create-room', {
            playerId: this.myId,
            playerName: this.myName,
            avatarColor: this.avatarColor,
            gameId: 'scribble',
            maxPlayers: 4
          }, (resp: { ok: boolean; code?: string; message?: string; data?: any }) => {
            if (!resp || !resp.ok) {
              this.notifyStatus('disconnected', resp?.message || 'Create room failed');
              reject(new Error(resp?.message || 'Failed to create room on server'));
              return;
            }

            const snapshot = resp.data;
            this.roomCode = snapshot.roomCode || snapshot.roomId;
            this.players = snapshot.players || [];
            const me = this.players.find((p) => p.id === this.myId);
            this.isHost = me ? me.isHost : true;

            this.notifyPlayersChanged();
            this.notifyStatus('connected');
            resolve(this.roomCode);
          });
        });
      } catch (err) {
        this.notifyStatus('disconnected');
        throw err;
      }
    }

    // --- MODE B: WebRTC Cloud Network (PeerJS 0.peerjs.com + STUN/TURN) ---
    const code = roomCodeInput ? roomCodeInput.trim().toUpperCase() : RoomNetwork.generateRoomCode();
    this.roomCode = code;

    const hostPlayer: RoomPlayer = {
      id: this.myId,
      name: this.myName,
      isHost: true,
      avatarColor: this.avatarColor,
      isReady: true,
      score: 0,
      joinedAt: Date.now()
    };
    this.players = [hostPlayer];

    this.setupBroadcastChannel();
    const hostPeerId = this.getHostPeerId(this.roomCode);

    return new Promise((resolve, reject) => {
      this.notifyStatus('connecting');

      try {
        this.peer = new Peer(hostPeerId, {
          debug: 1,
          config: { iceServers: ICE_SERVERS }
        });

        const timeout = setTimeout(() => {
          this.notifyStatus('connected');
          this.notifyPlayersChanged();
          resolve(this.roomCode);
        }, 5000);

        this.peer.on('open', () => {
          clearTimeout(timeout);
          this.notifyStatus('connected');
          this.notifyPlayersChanged();
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          if (err.type === 'unavailable-id') {
            reject(new Error(`Room code ${this.roomCode} is already active. Please generate a new code.`));
          } else {
            this.notifyStatus('connected');
            resolve(this.roomCode);
          }
        });

        this.peer.on('disconnected', () => {
          this.peer?.reconnect();
        });
      } catch (err) {
        console.warn('[RoomNetwork] Peer initialization exception:', err);
        this.notifyStatus('connected');
        resolve(this.roomCode);
      }
    });
  }

  // Join room (Guest)
  public async joinRoom(roomCodeInput: string, playerName: string): Promise<void> {
    this.cleanup();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    this.myName = playerName.trim() || 'Player';
    this.isHost = false;
    this.isExplicitlyClosed = false;
    this.roomCode = cleanCode;

    const config = getServerConfig();
    this.networkMode = config.mode;

    // --- MODE A: Socket.IO Backend Server ---
    if (this.networkMode === 'socketio' && config.httpUrl) {
      this.notifyStatus('connecting');
      try {
        const socket = await this.connectSocket(config.httpUrl);

        return new Promise<void>((resolve, reject) => {
          socket.emit('join-room', {
            roomCode: cleanCode,
            playerId: this.myId,
            playerName: this.myName,
            avatarColor: this.avatarColor
          }, (resp: { ok: boolean; code?: string; message?: string; data?: any }) => {
            if (!resp || !resp.ok) {
              this.notifyStatus('disconnected', resp?.message || 'Join room failed');
              if (resp?.code === 'invalid_code') {
                reject(new Error(`Room "${cleanCode}" does not exist or has expired.`));
              } else if (resp?.code === 'room_full') {
                reject(new Error(`Room "${cleanCode}" is full (maximum 4 players).`));
              } else if (resp?.code === 'game_started') {
                reject(new Error(`Room "${cleanCode}" has already started.`));
              } else {
                reject(new Error(resp?.message || `Failed to join room "${cleanCode}".`));
              }
              return;
            }

            const snapshot = resp.data;
            this.roomCode = snapshot.roomCode || snapshot.roomId;
            this.players = snapshot.players || [];
            const me = this.players.find((p) => p.id === this.myId);
            this.isHost = me ? me.isHost : false;

            this.notifyPlayersChanged();
            this.notifyStatus('connected');
            resolve();
          });
        });
      } catch (err) {
        this.notifyStatus('disconnected');
        throw err;
      }
    }

    // --- MODE B: WebRTC Cloud Network (PeerJS 0.peerjs.com + STUN/TURN) ---
    const clientPeerId = this.getClientPeerId(this.roomCode);
    const hostPeerId = this.getHostPeerId(this.roomCode);

    this.setupBroadcastChannel();

    const clientPlayer: RoomPlayer = {
      id: this.myId,
      name: this.myName,
      isHost: false,
      avatarColor: this.avatarColor,
      isReady: true,
      score: 0,
      joinedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      this.notifyStatus('connecting');
      let handshakeDone = false;

      const timeout = setTimeout(() => {
        if (!handshakeDone) {
          this.cleanup();
          this.notifyStatus('disconnected', 'Connection timed out');
          reject(new Error(`Could not connect to room "${this.roomCode}". Please verify the code and ensure host is active.`));
        }
      }, 9000);

      const unregisterAccept = this.on('ROOM_JOIN_ACCEPT', (msg) => {
        const payload = msg.payload as { players: RoomPlayer[]; isHost: boolean };
        if (payload && Array.isArray(payload.players)) {
          handshakeDone = true;
          clearTimeout(timeout);
          unregisterAccept();
          this.players = payload.players;
          this.notifyPlayersChanged();
          this.notifyStatus('connected');
          resolve();
        }
      });

      // Send join request over local BroadcastChannel
      this.sendBroadcast({
        type: 'ROOM_JOIN_REQUEST',
        senderId: this.myId,
        senderName: this.myName,
        payload: { player: clientPlayer },
        timestamp: Date.now()
      });

      try {
        this.peer = new Peer(clientPeerId, {
          debug: 1,
          config: { iceServers: ICE_SERVERS }
        });

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(hostPeerId, {
            reliable: true,
            serialization: 'json'
          });
          this.hostConnection = conn;

          conn.on('open', () => {
            conn.send({
              type: 'ROOM_JOIN_REQUEST',
              senderId: this.myId,
              senderName: this.myName,
              payload: { player: clientPlayer },
              timestamp: Date.now()
            });
          });

          conn.on('data', (data) => {
            this.handleIncomingData(data as NetworkMessage);
          });

          conn.on('close', () => {
            this.notifyStatus('disconnected', 'Host disconnected');
          });

          conn.on('error', (err) => {
            console.warn('[RoomNetwork] Connection error to host:', err);
          });
        });

        this.peer.on('error', (err) => {
          console.warn('[RoomNetwork] Client Peer warning:', err);
        });
      } catch (err) {
        console.warn('[RoomNetwork] Client initialization fallback:', err);
      }
    });
  }

  // Start game (Host only)
  public async startGame(): Promise<void> {
    if (this.networkMode === 'socketio' && this.socket && this.socket.connected) {
      return new Promise<void>((resolve, reject) => {
        this.socket!.emit('start-game', { roomCode: this.roomCode }, (resp: { ok: boolean; message?: string }) => {
          if (!resp || !resp.ok) {
            reject(new Error(resp?.message || 'Failed to start game'));
          } else {
            resolve();
          }
        });
      });
    }

    // WebRTC Mode: broadcast GAME_STARTED and SCRIBBLE_GAME_START
    this.broadcast({
      type: 'GAME_STARTED',
      senderId: this.myId,
      senderName: this.myName,
      payload: { roomCode: this.roomCode },
      timestamp: Date.now()
    });
    this.broadcast({
      type: 'SCRIBBLE_GAME_START',
      senderId: this.myId,
      senderName: this.myName,
      payload: {
        round: 1,
        currentDrawerIndex: 0,
        players: this.players
      },
      timestamp: Date.now()
    });
  }

  // Broadcast to all connected clients & local tabs
  public broadcast<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    let msg: NetworkMessage<T>;
    if (typeof msgOrType === 'string') {
      msg = {
        type: msgOrType,
        senderId: this.myId,
        senderName: this.myName,
        payload: payload as T,
        timestamp: Date.now()
      };
    } else {
      msg = {
        ...msgOrType,
        senderId: msgOrType.senderId || this.myId,
        senderName: msgOrType.senderName || this.myName,
        timestamp: msgOrType.timestamp || Date.now()
      };
    }

    if (this.networkMode === 'socketio' && this.socket && this.socket.connected) {
      if (msg.type.startsWith('SCRIBBLE_')) {
        this.socket.emit(msg.type, msg.payload);
      } else {
        this.socket.emit('broadcast-message', msg);
      }
      return;
    }

    // WebRTC Mode: send to peer connections
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });

    if (!this.isHost && this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(msg);
    }

    // BroadcastChannel for same-device multi-tab
    this.sendBroadcast(msg);

    // Also trigger local handlers
    this.dispatchInternal(msg.type, msg);
  }

  public send<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    this.broadcast(msgOrType, payload);
  }

  public sendTo<T = unknown>(targetPlayerId: string, msgOrType: NetworkMessage<T> | string, payload?: T) {
    let msg: NetworkMessage<T>;
    if (typeof msgOrType === 'string') {
      msg = {
        type: msgOrType,
        senderId: this.myId,
        senderName: this.myName,
        payload: payload as T,
        timestamp: Date.now()
      };
    } else {
      msg = {
        ...msgOrType,
        senderId: msgOrType.senderId || this.myId,
        senderName: msgOrType.senderName || this.myName,
        timestamp: msgOrType.timestamp || Date.now()
      };
    }

    if (this.networkMode === 'socketio' && this.socket && this.socket.connected) {
      if (msg.type.startsWith('SCRIBBLE_')) {
        this.socket.emit(msg.type, msg.payload);
      } else {
        this.socket.emit('broadcast-message', msg);
      }
      return;
    }

    // Target is self
    if (targetPlayerId === this.myId) {
      this.dispatchInternal(msg.type, msg);
      return;
    }

    // Send to specific DataConnection
    const conn = this.connections.get(targetPlayerId);
    if (conn && conn.open) {
      conn.send(msg);
    }

    // Also post to BroadcastChannel
    this.sendBroadcast(msg);
  }

  private sendBroadcast(msg: unknown) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }

  public on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    const set = this.messageHandlers.get(type)!;
    set.add(handler as MessageHandler);

    return () => {
      set.delete(handler as MessageHandler);
    };
  }

  public onPlayerListChange(callback: (players: RoomPlayer[]) => void): () => void {
    this.onPlayerListChangeCallbacks.add(callback);
    return () => this.onPlayerListChangeCallbacks.delete(callback);
  }

  public onConnectionStatus(callback: (status: 'connecting' | 'connected' | 'disconnected', err?: string) => void): () => void {
    this.onConnectionStatusCallbacks.add(callback);
    return () => this.onConnectionStatusCallbacks.delete(callback);
  }

  private notifyPlayersChanged() {
    this.onPlayerListChangeCallbacks.forEach((cb) => cb([...this.players]));
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected', err?: string) {
    this.onConnectionStatusCallbacks.forEach((cb) => cb(status, err));
  }

  public leaveRoom() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-room', { roomCode: this.roomCode });
    }
    this.cleanup();
  }

  public cleanup() {
    this.isExplicitlyClosed = true;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.connectionPlayerMap.clear();

    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.messageHandlers.clear();
    this.onPlayerListChangeCallbacks.clear();
    this.onConnectionStatusCallbacks.clear();
    this.players = [];
    this.roomCode = '';
    this.isHost = false;
  }
}
