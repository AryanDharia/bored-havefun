export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  avatarColor: string;
  score?: number;
  isReady?: boolean;
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
  wsUrl: string;
  isCustom: boolean;
  isConfigured: boolean;
}

export function getServerConfig(): ServerConfig {
  // 1. Explicit Vite environment variable (Render Web Service or deployment setting)
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    // If user entered only host without protocol, e.g. "playbreak-server.onrender.com"
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('ws://') && !clean.startsWith('wss://')) {
      clean = `https://${clean}`;
    }

    const isWss = clean.startsWith('wss://');
    const isWs = clean.startsWith('ws://');
    const isHttps = clean.startsWith('https://');

    let httpUrl = clean;
    let wsUrl = clean;

    if (isWss) {
      httpUrl = clean.replace(/^wss:\/\//, 'https://');
    } else if (isWs) {
      httpUrl = clean.replace(/^ws:\/\//, 'http://');
    } else if (isHttps) {
      wsUrl = clean.replace(/^https:\/\//, 'wss://');
    } else {
      wsUrl = clean.replace(/^http:\/\//, 'ws://');
    }
    return { httpUrl, wsUrl, isCustom: true, isConfigured: true };
  }

  // 2. User-provided custom server URL stored in localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('playbreak_backend_url');
    if (saved && saved.trim()) {
      let clean = saved.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('ws://') && !clean.startsWith('wss://')) {
        clean = `https://${clean}`;
      }
      const isSecure = clean.startsWith('https://') || clean.startsWith('wss://');
      const httpUrl = isSecure ? clean.replace(/^wss:\/\//, 'https://') : clean.replace(/^ws:\/\//, 'http://');
      const wsUrl = isSecure ? clean.replace(/^https:\/\//, 'wss://') : clean.replace(/^http:\/\//, 'ws://');
      return { httpUrl, wsUrl, isCustom: true, isConfigured: true };
    }

    // 3. Localhost development (only when running on local machine)
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || host === '';
    if (isLocalDev) {
      const devHost = host || 'localhost';
      return {
        httpUrl: `http://${devHost}:3001`,
        wsUrl: `ws://${devHost}:3001`,
        isCustom: false,
        isConfigured: true
      };
    }
  }

  // 4. In production without VITE_BACKEND_URL or localStorage:
  // Do NOT silently guess http://localhost:3001, which fails in production with confusing errors.
  return {
    httpUrl: '',
    wsUrl: '',
    isCustom: false,
    isConfigured: false
  };
}

export async function checkServerHealth(customUrl?: string): Promise<{ ok: boolean; message: string; uptime?: number }> {
  let config: ServerConfig;

  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('ws://') && !clean.startsWith('wss://')) {
      clean = `https://${clean}`;
    }
    config = {
      httpUrl: clean.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://'),
      wsUrl: clean.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://'),
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
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
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

  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create authoritative room via Backend REST API, then open WebSocket connection
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

    // 1. Authoritative room registration on server
    let serverRoomCode = '';
    let serverHostId = this.myId;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${config.httpUrl}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: this.myName, gameId: 'scribble' }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status} when creating room.`);
      }

      const data = await res.json();
      if (!data.success || !data.roomCode) {
        throw new Error(data.error || 'Server failed to create room.');
      }

      serverRoomCode = data.roomCode;
      if (data.hostId) serverHostId = data.hostId;
    } catch (err) {
      this.notifyStatus('disconnected', 'Server unreachable');
      const errDetail = err instanceof Error ? err.message : 'Network error';
      throw new Error(`Cannot reach multiplayer server at ${config.httpUrl}. Please ensure your backend service is deployed and active. (${errDetail})`);
    }

    this.roomCode = serverRoomCode;
    this.myId = serverHostId;

    // 2. Open WebSocket connection to room
    await this.connectWebSocket(config.wsUrl);
    return this.roomCode;
  }

  // Join existing room: verify against Backend REST API, then open WebSocket connection
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

    // 1. Authoritative check on server
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${config.httpUrl}/api/rooms/${cleanCode}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        throw new Error(`Room "${cleanCode}" does not exist or has expired. Please verify the room code.`);
      }

      if (!res.ok) {
        throw new Error(`Failed to join room: server returned HTTP ${res.status}`);
      }

      const roomData = await res.json();
      if (!roomData.exists) {
        throw new Error(`Room "${cleanCode}" does not exist or has expired.`);
      }

      if (roomData.playerCount >= (roomData.maxPlayers || 8)) {
        throw new Error(`Room "${cleanCode}" is full (maximum 8 players).`);
      }
    } catch (err) {
      this.notifyStatus('disconnected');
      if (err instanceof Error) throw err;
      throw new Error(`Cannot connect to room "${cleanCode}". Please verify your network and room code.`);
    }

    // 2. Open WebSocket connection to room
    await this.connectWebSocket(config.wsUrl);
  }

  private connectWebSocket(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const fullWsUrl = `${wsUrl}/ws?room=${encodeURIComponent(this.roomCode)}&playerId=${encodeURIComponent(this.myId)}&name=${encodeURIComponent(this.myName)}&avatarColor=${encodeURIComponent(this.avatarColor)}`;
        this.ws = new WebSocket(fullWsUrl);

        let resolved = false;
        const connectTimeout = setTimeout(() => {
          if (!resolved) {
            this.cleanup();
            this.notifyStatus('disconnected', 'WebSocket connection timed out');
            reject(new Error(`WebSocket connection to room "${this.roomCode}" timed out.`));
          }
        }, 8000);

        this.ws.onopen = () => {
          this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncomingMessage(data);

            if (data.type === 'ROOM_JOIN_ACCEPT' && !resolved) {
              resolved = true;
              clearTimeout(connectTimeout);
              const payload = data.payload;
              if (payload) {
                this.isHost = payload.isHost;
                if (payload.players) {
                  this.players = payload.players;
                  this.notifyPlayersChanged();
                }
              }
              this.notifyStatus('connected');
              resolve();
            }
          } catch (err) {
            console.error('[RoomNetwork] Error parsing message:', err);
          }
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          if (this.isExplicitlyClosed) return;

          if (!resolved) {
            resolved = true;
            clearTimeout(connectTimeout);
            reject(new Error(event.reason || 'WebSocket closed before handshake completed.'));
          }

          this.notifyStatus('disconnected', event.reason || 'Connection closed');
        };

        this.ws.onerror = (err) => {
          console.warn('[RoomNetwork] WebSocket error:', err);
        };
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to create WebSocket'));
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleIncomingMessage(msg: { type: string; payload?: any; [key: string]: any }) {
    // 1. Roster updates
    if (msg.type === 'ROOM_PLAYERS_UPDATED' && msg.payload?.players) {
      this.players = msg.payload.players;
      // Re-verify my host status from server
      const me = this.players.find((p) => p.id === this.myId);
      if (me) {
        this.isHost = me.isHost;
      }
      this.notifyPlayersChanged();
    }

    // 2. Dispatch to registered event listeners
    const handlers = this.messageHandlers.get(msg.type);
    if (handlers) {
      const netMsg: NetworkMessage = {
        type: msg.type,
        senderId: msg.senderId || '',
        senderName: msg.senderName || '',
        payload: msg.payload,
        timestamp: msg.timestamp || Date.now()
      };
      handlers.forEach((h) => h(netMsg));
    }
  }

  // Broadcast message to room through server
  public broadcast<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (typeof msgOrType === 'string') {
        this.ws.send(
          JSON.stringify({
            type: msgOrType,
            payload,
            senderId: this.myId,
            senderName: this.myName,
            timestamp: Date.now()
          })
        );
      } else {
        this.ws.send(
          JSON.stringify({
            type: msgOrType.type,
            payload: msgOrType.payload,
            senderId: this.myId,
            senderName: this.myName,
            timestamp: Date.now()
          })
        );
      }
    }
  }

  // Alias for broadcast/send
  public send<T = unknown>(msgOrType: NetworkMessage<T> | string, payload?: T) {
    this.broadcast(msgOrType, payload);
  }

  // Send message to server (server handles unicast/broadcast appropriately)
  public sendTo<T = unknown>(_targetPeerId: string, msgOrType: NetworkMessage<T> | string, payload?: T) {
    this.broadcast(msgOrType, payload);
  }

  // Register listener for a specific event type
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

  // Register listener for player roster changes
  public onPlayerListChange(callback: (players: RoomPlayer[]) => void): () => void {
    this.onPlayerListChangeCallbacks.add(callback);
    return () => this.onPlayerListChangeCallbacks.delete(callback);
  }

  // Register listener for connection state changes
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

  public cleanup() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }

    this.messageHandlers.clear();
    this.onPlayerListChangeCallbacks.clear();
    this.onConnectionStatusCallbacks.clear();
    this.players = [];
    this.roomCode = '';
    this.isHost = false;
  }
}
