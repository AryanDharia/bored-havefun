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

export class RoomNetwork {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
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

  private getPeerId(roomCode: string, isHost: boolean): string {
    const clean = roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (isHost) {
      return `pb-host-${clean}`;
    }
    return `pb-client-${clean}-${this.myId}`;
  }

  // Create room as Authoritative Host
  public async createRoom(roomCode: string, hostName: string): Promise<string> {
    this.cleanup();
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = hostName.trim() || 'Host';
    this.isHost = true;

    const hostPeerId = this.getPeerId(this.roomCode, true);

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

    return new Promise((resolve) => {
      this.notifyStatus('connecting');

      try {
        this.peer = new Peer(hostPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.notifyStatus('connected');
          this.notifyPlayersChanged();
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('[RoomNetwork] Host Peer warning/error:', err);
          // If PeerJS ID is temporarily taken or network error, fallback to broadcast-ready
          this.notifyStatus('connected');
          resolve(hostPeerId);
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

  // Join room as Remote Client
  public async joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.cleanup();
    this.roomCode = roomCode.toUpperCase().trim();
    this.myName = playerName.trim() || 'Player';
    this.isHost = false;

    const clientPeerId = this.getPeerId(this.roomCode, false);
    const hostPeerId = this.getPeerId(this.roomCode, true);

    this.setupBroadcastChannel();

    // Broadcast join request over local tabs
    this.sendBroadcast({
      type: 'ROOM_JOIN_REQUEST',
      senderId: this.myId,
      senderName: this.myName,
      payload: {
        player: {
          id: this.myId,
          name: this.myName,
          isHost: false,
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          isReady: true,
          score: 0,
        }
      },
      timestamp: Date.now()
    });

    return new Promise((resolve) => {
      this.notifyStatus('connecting');

      try {
        this.peer = new Peer(clientPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(hostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            this.notifyStatus('connected');
            // Send join handshake to host
            conn.send({
              type: 'ROOM_JOIN_REQUEST',
              senderId: this.myId,
              senderName: this.myName,
              payload: {
                player: {
                  id: this.myId,
                  name: this.myName,
                  isHost: false,
                  avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
                  isReady: true,
                  score: 0,
                }
              },
              timestamp: Date.now()
            });
            resolve();
          });

          conn.on('data', (data) => {
            this.handleIncomingData(data as NetworkMessage);
          });

          conn.on('close', () => {
            this.notifyStatus('disconnected', 'Host disconnected');
          });

          conn.on('error', (err) => {
            console.warn('[RoomNetwork] Connection error to host:', err);
            resolve();
          });
        });

        this.peer.on('error', (err) => {
          console.warn('[RoomNetwork] Client Peer warning:', err);
          // Still connected via BroadcastChannel if on same machine
          this.notifyStatus('connected');
          resolve();
        });
      } catch (err) {
        console.warn('[RoomNetwork] Client initialization fallback:', err);
        this.notifyStatus('connected');
        resolve();
      }
    });
  }

  // Handle incoming connection on Host
  private handleIncomingConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data) => {
      const msg = data as NetworkMessage;
      this.handleIncomingData(msg);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      // Remove player
      this.players = this.players.filter((p) => p.id !== conn.peer);
      this.broadcastPlayerList();
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
            this.handleIncomingData(msg);
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

    if (msg.type === 'ROOM_JOIN_REQUEST' && this.isHost) {
      const newPlayer = (msg.payload as { player: RoomPlayer }).player;
      if (newPlayer && !this.players.some((p) => p.id === newPlayer.id)) {
        this.players.push(newPlayer);
        this.broadcastPlayerList();
      }
      return;
    }

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

  // Send message to host or broadcast to room
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

  public cleanup() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();

    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.players = [];
    this.roomCode = '';
  }
}
