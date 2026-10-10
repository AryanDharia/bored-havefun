import Peer, { type DataConnection } from 'peerjs';

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
  senderId: string;
  senderName: string;
  payload: T;
  timestamp: number;
}

export type MessageHandler<T = unknown> = (msg: NetworkMessage<T>) => void;

const AVATAR_COLORS = [
  '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

// Production-ready ICE servers with OpenRelay TURN fallback for reliable cellular/NAT traversal
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

export class RoomNetwork {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // playerId -> DataConnection
  private connectionPlayerMap: Map<DataConnection, string> = new Map(); // DataConnection -> playerId
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  public roomCode: string = '';
  public myId: string = '';
  public myName: string = '';
  public isHost: boolean = false;
  public players: RoomPlayer[] = [];

  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private onPlayerListChangeCallbacks: Set<(players: RoomPlayer[]) => void> = new Set();
  private onConnectionStatusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected', err?: string) => void> = new Set();

  constructor() {
    this.myId = 'player_' + Math.random().toString(36).substring(2, 9);
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

  // Create room as Authoritative Host
  public async createRoom(roomCode: string, hostName: string): Promise<string> {
    this.cleanup();
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = hostName.trim() || 'Host';
    this.isHost = true;

    const hostPeerId = this.getHostPeerId(this.roomCode);

    const hostPlayer: RoomPlayer = {
      id: this.myId,
      name: this.myName,
      isHost: true,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      isReady: true,
      score: 0,
    };
    this.players = [hostPlayer];

    // Local multi-tab BroadcastChannel
    this.setupBroadcastChannel();

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
          resolve(hostPeerId);
        }, 5000);

        this.peer.on('open', (id) => {
          clearTimeout(timeout);
          this.notifyStatus('connected');
          this.notifyPlayersChanged();
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          console.warn('[RoomNetwork] Host Peer error:', err);
          if (err.type === 'unavailable-id') {
            reject(new Error(`Room code ${this.roomCode} is already active. Please generate a new code.`));
          } else {
            // Still allow local multi-tab broadcast
            this.notifyStatus('connected');
            resolve(hostPeerId);
          }
        });

        this.peer.on('disconnected', () => {
          this.peer?.reconnect();
        });
      } catch (err) {
        console.warn('[RoomNetwork] Peer initialization exception:', err);
        this.notifyStatus('connected');
        resolve(hostPeerId);
      }
    });
  }

  // Join room as Remote Client with verified handshake
  public async joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.cleanup();
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = playerName.trim() || 'Player';
    this.isHost = false;

    const clientPeerId = this.getClientPeerId(this.roomCode);
    const hostPeerId = this.getHostPeerId(this.roomCode);

    this.setupBroadcastChannel();

    const clientPlayer: RoomPlayer = {
      id: this.myId,
      name: this.myName,
      isHost: false,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      isReady: true,
      score: 0,
    };

    return new Promise((resolve, reject) => {
      this.notifyStatus('connecting');
      let handshakeDone = false;

      // Timeout if handshake does not complete
      const timeout = setTimeout(() => {
        if (!handshakeDone) {
          this.cleanup();
          this.notifyStatus('disconnected', 'Connection timed out');
          reject(new Error(`Could not connect to room "${this.roomCode}". Please verify the code and ensure host is active.`));
        }
      }, 9000);

      // Listen for Host's accept response
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
            // Send join handshake to host over WebRTC
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

  // Handle incoming connection on Host
  private handleIncomingConnection(conn: DataConnection) {
    conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      // Map connection to player ID on join handshake
      if (msg.type === 'ROOM_JOIN_REQUEST') {
        const newPlayer = (msg.payload as { player: RoomPlayer }).player;
        if (newPlayer) {
          this.connections.set(newPlayer.id, conn);
          this.connectionPlayerMap.set(conn, newPlayer.id);

          if (!this.players.some((p) => p.id === newPlayer.id)) {
            this.players.push(newPlayer);
          }

          // Reply with immediate accept handshake containing full player list
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

  // Handle incoming messages
  private handleIncomingData(msg: NetworkMessage) {
    if (!msg || !msg.type) return;

    if (msg.type === 'ROOM_PLAYER_LIST') {
      const list = (msg.payload as { players: RoomPlayer[] }).players;
      if (Array.isArray(list)) {
        this.players = list;
        this.notifyPlayersChanged();
      }
      return;
    }

    // Dispatch to registered message handlers
    const handlers = this.messageHandlers.get(msg.type);
    if (handlers) {
      handlers.forEach((fn) => fn(msg));
    }
  }

  // Broadcast player list from host to all clients
  public broadcastPlayerList() {
    if (!this.isHost) return;
    this.broadcast({
      type: 'ROOM_PLAYER_LIST',
      senderId: this.myId,
      senderName: this.myName,
      payload: { players: this.players },
      timestamp: Date.now()
    });
    this.notifyPlayersChanged();
  }

  // Send message to host (if client) or broadcast (if host)
  public send<T = unknown>(type: string, payload: T): void {
    const msg: NetworkMessage<T> = {
      type,
      senderId: this.myId,
      senderName: this.myName,
      payload,
      timestamp: Date.now(),
    };

    if (this.isHost) {
      this.broadcast(msg);
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(msg);
      this.sendBroadcast(msg);
    } else {
      this.sendBroadcast(msg);
    }
  }

  // Host sends targeted private message to a specific player
  public sendTo<T = unknown>(targetPlayerId: string, type: string, payload: T): void {
    const msg: NetworkMessage<T> = {
      type,
      senderId: this.myId,
      senderName: this.myName,
      payload,
      timestamp: Date.now(),
    };

    if (targetPlayerId === this.myId) {
      const handlers = this.messageHandlers.get(type);
      if (handlers) handlers.forEach((fn) => fn(msg));
      return;
    }

    const conn = this.connections.get(targetPlayerId);
    if (conn && conn.open) {
      conn.send(msg);
    }
    // Also send on BroadcastChannel for multi-tab
    this.sendBroadcast(msg);
  }

  // Broadcast to all connected clients & local tabs
  public broadcast<T = unknown>(msg: NetworkMessage<T>): void {
    // Send over PeerJS WebRTC connections
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });

    // Send over BroadcastChannel for local tabs
    this.sendBroadcast(msg);

    // Also trigger local host handlers
    const handlers = this.messageHandlers.get(msg.type);
    if (handlers) {
      handlers.forEach((fn) => fn(msg as unknown as NetworkMessage));
    }
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

  // Register listener for a message type
  public on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    const handlers = this.messageHandlers.get(type)!;
    handlers.add(handler as MessageHandler);

    return () => {
      handlers.delete(handler as MessageHandler);
    };
  }

  public onPlayerListChange(callback: (players: RoomPlayer[]) => void): () => void {
    this.onPlayerListChangeCallbacks.add(callback);
    callback(this.players);
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

  public cleanup(): void {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.connectionPlayerMap.clear();
    this.hostConnection?.close();
    this.hostConnection = null;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.messageHandlers.clear();
    this.players = [];
  }
}
