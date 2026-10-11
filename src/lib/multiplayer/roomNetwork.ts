import { io, Socket } from 'socket.io-client';

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

export interface ServerConfig {
  httpUrl: string;
  isCustom: boolean;
  isConfigured: boolean;
}

export function getServerConfig(): ServerConfig {
  // 1. Explicit Vite environment variable (Render Web Service or deployment setting)
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return { httpUrl: clean, isCustom: true, isConfigured: true };
  }

  // 2. User-provided custom server URL stored in localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('playbreak_backend_url');
    if (saved && saved.trim()) {
      let clean = saved.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return { httpUrl: clean, isCustom: true, isConfigured: true };
    }

    // 3. Localhost development (only when running locally)
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || host === '';
    if (isLocalDev) {
      const devHost = host || 'localhost';
      return {
        httpUrl: `http://${devHost}:3001`,
        isCustom: false,
        isConfigured: true
      };
    }
  }

  // 4. In production without VITE_BACKEND_URL or localStorage:
  return {
    httpUrl: '',
    isCustom: false,
    isConfigured: false
  };
}

export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string; uptime?: number }> {
  let config: ServerConfig;

  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    config = {
      httpUrl: clean,
      isCustom: true,
      isConfigured: true
    };
  } else {
    config = getServerConfig();
  }

  if (!config.isConfigured || !config.httpUrl) {
    return {
      ok: false,
      message: 'Multiplayer server URL is not configured. Please set VITE_BACKEND_URL or provide your server URL in settings.'
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.httpUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: 'Server is healthy and reachable', uptime: data.uptime };
    }
    return { ok: false, message: `Server returned HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, message: `Cannot connect to server at ${config.httpUrl}: ${msg}` };
  }
}

export class RoomNetwork {
  private socket: Socket | null = null;
  private isExplicitlyClosed = false;

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

  // Create authoritative room via Socket.IO create-room event
  public async createRoom(_roomCodeInput: string, hostName: string): Promise<string> {
    this.cleanup();
    this.myName = hostName.trim() || 'Host';
    this.isHost = true;
    this.isExplicitlyClosed = false;

    const config = getServerConfig();
    if (!config.isConfigured || !config.httpUrl) {
      this.notifyStatus('disconnected', 'Server URL not configured');
      throw new Error('Multiplayer server URL is not configured. Please set the VITE_BACKEND_URL environment variable on Render, or enter your backend URL in Server Settings.');
    }
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

  // Join existing room via Socket.IO join-room event
  public async joinRoom(roomCodeInput: string, playerName: string): Promise<void> {
    this.cleanup();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    this.myName = playerName.trim() || 'Player';
    this.isHost = false;
    this.isExplicitlyClosed = false;
    this.roomCode = cleanCode;

    const config = getServerConfig();
    if (!config.isConfigured || !config.httpUrl) {
      this.notifyStatus('disconnected', 'Server URL not configured');
      throw new Error('Multiplayer server URL is not configured. Please set the VITE_BACKEND_URL environment variable on Render, or enter your backend URL in Server Settings.');
    }
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

  // Start game (Host only)
  public async startGame(): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to multiplayer server');
    }
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

  // Broadcast or send message to server
  public broadcast<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    if (!this.socket || !this.socket.connected) return;

    if (typeof msgOrType === 'string') {
      const eventName = msgOrType;
      // If it's a known server game event, emit it directly
      if (eventName.startsWith('SCRIBBLE_')) {
        this.socket.emit(eventName, payload);
      } else {
        this.socket.emit('broadcast-message', {
          type: eventName,
          payload,
          senderId: this.myId,
          senderName: this.myName,
          timestamp: Date.now()
        });
      }
    } else {
      if (msgOrType.type.startsWith('SCRIBBLE_')) {
        this.socket.emit(msgOrType.type, msgOrType.payload);
      } else {
        this.socket.emit('broadcast-message', {
          ...msgOrType,
          senderId: this.myId,
          senderName: this.myName,
          timestamp: Date.now()
        });
      }
    }
  }

  public send<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    this.broadcast(msgOrType, payload);
  }

  public sendTo<T = unknown>(_targetPeerId: string, msgOrType: NetworkMessage<T> | string, payload?: T) {
    this.broadcast(msgOrType, payload);
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

    this.messageHandlers.clear();
    this.onPlayerListChangeCallbacks.clear();
    this.onConnectionStatusCallbacks.clear();
    this.players = [];
    this.roomCode = '';
    this.isHost = false;
  }
}
