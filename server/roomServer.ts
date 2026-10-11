import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';

export interface RoomPlayer {
  id: string;              // Stable unique player ID
  socketId: string;        // Active socket connection ID
  name: string;            // Sanitized display name
  isHost: boolean;
  avatarColor: string;
  score: number;
  joinedAt: number;        // Join timestamp
}

export interface DrawingStroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  isEraser: boolean;
}

export interface ScribbleWord {
  word: string;
  category: string;
  difficulty: string;
}

export const SERVER_WORDS: ScribbleWord[] = [
  { word: 'CAT', category: 'Animals', difficulty: 'Easy' },
  { word: 'DOG', category: 'Animals', difficulty: 'Easy' },
  { word: 'FISH', category: 'Animals', difficulty: 'Easy' },
  { word: 'BIRD', category: 'Animals', difficulty: 'Easy' },
  { word: 'LION', category: 'Animals', difficulty: 'Easy' },
  { word: 'TIGER', category: 'Animals', difficulty: 'Easy' },
  { word: 'ELEPHANT', category: 'Animals', difficulty: 'Medium' },
  { word: 'GIRAFFE', category: 'Animals', difficulty: 'Medium' },
  { word: 'MONKEY', category: 'Animals', difficulty: 'Easy' },
  { word: 'PENGUIN', category: 'Animals', difficulty: 'Medium' },
  { word: 'PIZZA', category: 'Food', difficulty: 'Easy' },
  { word: 'BURGER', category: 'Food', difficulty: 'Easy' },
  { word: 'APPLE', category: 'Food', difficulty: 'Easy' },
  { word: 'BANANA', category: 'Food', difficulty: 'Easy' },
  { word: 'SUSHI', category: 'Food', difficulty: 'Medium' },
  { word: 'DONUT', category: 'Food', difficulty: 'Easy' },
  { word: 'PINEAPPLE', category: 'Food', difficulty: 'Medium' },
  { word: 'CAR', category: 'Objects', difficulty: 'Easy' },
  { word: 'ROCKET', category: 'Objects', difficulty: 'Easy' },
  { word: 'GUITAR', category: 'Objects', difficulty: 'Medium' },
  { word: 'CLOCK', category: 'Objects', difficulty: 'Easy' },
  { word: 'SUN', category: 'Nature', difficulty: 'Easy' },
  { word: 'MOON', category: 'Nature', difficulty: 'Easy' },
  { word: 'RAINBOW', category: 'Nature', difficulty: 'Easy' },
  { word: 'VOLCANO', category: 'Nature', difficulty: 'Medium' },
  { word: 'ROBOT', category: 'Tech', difficulty: 'Easy' },
  { word: 'LAPTOP', category: 'Tech', difficulty: 'Easy' }
];

export function isCloseGuess(guess: string, target: string): boolean {
  const a = guess.trim().toUpperCase();
  const b = target.trim().toUpperCase();
  if (!a || !b || a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;

  // Adjacent transposition check
  if (a.length === b.length) {
    for (let idx = 0; idx < a.length - 1; idx++) {
      if (a[idx] !== b[idx]) {
        const swapped = a.slice(0, idx) + a[idx + 1] + a[idx] + a.slice(idx + 2);
        if (swapped === b) return true;
        break;
      }
    }
  }

  // Edit distance 1
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== b[j]) {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    } else {
      i++;
      j++;
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits === 1;
}

export interface RoomSnapshot {
  roomId: string;
  roomCode: string;
  hostSocketId: string;
  hostId: string;
  gameId: string;
  maxPlayers: number;
  gameStarted: boolean;
  createdAt: number;
  players: Array<{
    id: string;
    socketId: string;
    name: string;
    isHost: boolean;
    avatarColor: string;
    score: number;
    joinedAt: number;
  }>;
  state: 'lobby' | 'word_selection' | 'drawing' | 'round_end' | 'game_over';
  round: number;
  totalRounds: number;
  currentDrawerIndex: number;
}

export interface ActiveRoom {
  roomId: string;            // Standard roomId (same as code)
  code: string;              // 6-character room code
  hostSocketId: string;      // Socket ID of room host
  hostId: string;            // Player ID of room host
  gameId: string;
  maxPlayers: number;        // Default 4
  gameStarted: boolean;
  createdAt: number;
  lastActivity: number;
  players: RoomPlayer[];
  state: 'lobby' | 'word_selection' | 'drawing' | 'round_end' | 'game_over';
  round: number;
  totalRounds: number;
  currentDrawerIndex: number;
  secretWord: string;
  wordChoices: ScribbleWord[];
  strokes: DrawingStroke[];
  guessedPlayerIds: Set<string>;
  turnTimeLeft: number;
  turnTimer: NodeJS.Timeout | null;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  code?: string;
  message?: string;
  data?: T;
}

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unambiguous chars
const MAX_CODE_RETRIES = 50;
const DEFAULT_MAX_PLAYERS = 4;
const ABANDONED_ROOM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes if empty

export class MultiplayerRoomServer {
  public app: express.Application;
  public server: http.Server;
  public io: SocketIOServer;
  public rooms: Map<string, ActiveRoom> = new Map();
  // Map socketId -> { roomCode, playerId } for fast disconnect lookup
  public socketToRoom: Map<string, { roomCode: string; playerId: string }> = new Map();
  // Event rate-limiting tracking: socketId -> count & resetTime
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);

    // Setup CORS
    const corsOrigins = this.getAllowedOrigins();
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In local development allow localhost on any port
        if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    }));

    this.app.use(express.json({ limit: '100kb' }));

    // Setup Socket.IO with WebSocket + polling fallback transports and CORS
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
            return callback(null, true);
          }
          if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
            return callback(null, true);
          }
          return callback(new Error(`Origin ${origin} not allowed by Socket.IO CORS`));
        },
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'], // WebSocket primary, polling fallback
      pingInterval: 25000,
      pingTimeout: 20000
    });

    this.setupHttpRoutes();
    this.setupSocketEvents();
    this.startPeriodicCleanup();
  }

  private getAllowedOrigins(): string[] {
    const raw = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '';
    if (raw.trim()) {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    // Default development: allow all if not production
    if (process.env.NODE_ENV !== 'production') {
      return ['*'];
    }
    return ['*']; // Fallback if not specified, but logs warning
  }

  public sanitizeName(name: unknown): string {
    if (typeof name !== 'string') return 'Player';
    const cleaned = name.trim().replace(/[^\w\s-]/g, '').slice(0, 20);
    return cleaned || 'Player';
  }

  public normalizeRoomCode(code: unknown): string {
    if (typeof code !== 'string') return '';
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // Cryptographically secure 6-character room code generation
  public generateUniqueRoomCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const bytes = crypto.randomBytes(6);
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
      }
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    throw new Error('FAILED_TO_ALLOCATE_ROOM_CODE');
  }

  public getRoomSnapshot(room: ActiveRoom): RoomSnapshot {
    return {
      roomId: room.roomId,
      roomCode: room.code,
      hostSocketId: room.hostSocketId,
      hostId: room.hostId,
      gameId: room.gameId,
      maxPlayers: room.maxPlayers,
      gameStarted: room.gameStarted,
      createdAt: room.createdAt,
      players: room.players.map((p) => ({
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        isHost: p.isHost,
        avatarColor: p.avatarColor,
        score: p.score,
        joinedAt: p.joinedAt
      })),
      state: room.state,
      round: room.round,
      totalRounds: room.totalRounds,
      currentDrawerIndex: room.currentDrawerIndex
    };
  }

  private setupHttpRoutes() {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'playbreak-multiplayer',
        uptime: (Date.now() - this.startTime) / 1000,
        roomsCount: this.rooms.size,
        activeConnections: this.io.sockets.sockets.size,
        timestamp: Date.now()
      });
    });

    this.app.get('/', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'playbreak-multiplayer',
        uptime: (Date.now() - this.startTime) / 1000,
        roomsCount: this.rooms.size
      });
    });

    // REST inspect room endpoint
    this.app.get('/api/rooms/:code', (req, res) => {
      const code = this.normalizeRoomCode(req.params.code);
      const room = this.rooms.get(code);
      if (!room) {
        res.status(404).json({ exists: false, error: `Room "${code}" not found or expired` });
        return;
      }
      res.status(200).json({
        exists: true,
        roomCode: room.code,
        playerCount: room.players.length,
        minPlayers: 2,
        maxPlayers: room.maxPlayers,
        state: room.state,
        gameStarted: room.gameStarted,
        players: room.players.map((p) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          avatarColor: p.avatarColor,
          score: p.score
        }))
      });
    });

    // REST create room endpoint (for compatibility)
    this.app.post('/api/rooms', (req, res) => {
      try {
        const hostName = this.sanitizeName(req.body?.hostName);
        const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId : 'scribble';
        const code = this.generateUniqueRoomCode();
        const hostId = 'p_' + crypto.randomBytes(4).toString('hex');

        const room: ActiveRoom = {
          roomId: code,
          code,
          hostSocketId: '',
          hostId,
          gameId,
          maxPlayers: DEFAULT_MAX_PLAYERS,
          gameStarted: false,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          players: [],
          state: 'lobby',
          round: 1,
          totalRounds: 3,
          currentDrawerIndex: 0,
          secretWord: '',
          wordChoices: [],
          strokes: [],
          guessedPlayerIds: new Set(),
          turnTimeLeft: 80,
          turnTimer: null
        };

        this.rooms.set(code, room);

        res.status(201).json({
          success: true,
          roomCode: code,
          hostId,
          message: `Room ${code} created successfully`
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Could not allocate room' });
      }
    });
  }

  // Basic sliding-window rate limiting per socket
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(socketId) || { count: 0, resetTime: now + 1000 };
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + 1000;
      this.rateLimits.set(socketId, limit);
      return true;
    }
    limit.count++;
    this.rateLimits.set(socketId, limit);
    return limit.count <= 60; // Max 60 events/sec
  }

  private setupSocketEvents() {
    this.io.on('connection', (socket: Socket) => {
      // Middleware check per socket event
      socket.use(([event, ..._args], next) => {
        if (!this.checkRateLimit(socket.id)) {
          return next(new Error('Rate limit exceeded. Please slow down.'));
        }
        next();
      });

      // ==========================================
      // 1. CREATE ROOM
      // ==========================================
      socket.on('create-room', (payload, callback) => {
        try {
          const playerName = this.sanitizeName(payload?.playerName || payload?.name);
          const avatarColor = typeof payload?.avatarColor === 'string' ? payload.avatarColor : '#8b5cf6';
          const playerId = (typeof payload?.playerId === 'string' && payload.playerId.trim())
            ? payload.playerId.trim().slice(0, 36)
            : 'p_' + crypto.randomBytes(4).toString('hex');
          const gameId = typeof payload?.gameId === 'string' ? payload.gameId : 'scribble';
          const maxPlayers = typeof payload?.maxPlayers === 'number' && payload.maxPlayers >= 2 && payload.maxPlayers <= 8
            ? payload.maxPlayers
            : DEFAULT_MAX_PLAYERS;

          // Generate unique 6-character room code
          let code: string;
          try {
            code = this.generateUniqueRoomCode();
          } catch {
            const errResp: ApiResponse = { ok: false, code: 'allocation_failed', message: 'Unable to generate unique room code' };
            if (typeof callback === 'function') callback(errResp);
            return;
          }

          const now = Date.now();
          const hostPlayer: RoomPlayer = {
            id: playerId,
            socketId: socket.id,
            name: playerName,
            isHost: true,
            avatarColor,
            score: 0,
            joinedAt: now
          };

          const room: ActiveRoom = {
            roomId: code,
            code,
            hostSocketId: socket.id,
            hostId: playerId,
            gameId,
            maxPlayers,
            gameStarted: false,
            createdAt: now,
            lastActivity: now,
            players: [hostPlayer],
            state: 'lobby',
            round: 1,
            totalRounds: 3,
            currentDrawerIndex: 0,
            secretWord: '',
            wordChoices: [],
            strokes: [],
            guessedPlayerIds: new Set(),
            turnTimeLeft: 80,
            turnTimer: null
          };

          this.rooms.set(code, room);
          this.socketToRoom.set(socket.id, { roomCode: code, playerId });

          // Join Socket.IO room channel
          socket.join(code);

          const snapshot = this.getRoomSnapshot(room);
          const successResp: ApiResponse<RoomSnapshot> = {
            ok: true,
            data: snapshot,
            message: `Room ${code} created successfully`
          };

          if (typeof callback === 'function') callback(successResp);

          // Broadcast authoritative room snapshot to room
          this.io.to(code).emit('room-updated', snapshot);
          this.io.to(code).emit('ROOM_PLAYERS_UPDATED', { players: snapshot.players });
        } catch (err) {
          const errResp: ApiResponse = { ok: false, code: 'server_error', message: 'Internal error creating room' };
          if (typeof callback === 'function') callback(errResp);
        }
      });

      // ==========================================
      // 2. JOIN ROOM
      // ==========================================
      socket.on('join-room', (payload, callback) => {
        try {
          const code = this.normalizeRoomCode(payload?.roomCode || payload?.code);
          const playerName = this.sanitizeName(payload?.playerName || payload?.name);
          const avatarColor = typeof payload?.avatarColor === 'string' ? payload.avatarColor : '#3b82f6';
          const playerId = (typeof payload?.playerId === 'string' && payload.playerId.trim())
            ? payload.playerId.trim().slice(0, 36)
            : 'p_' + crypto.randomBytes(4).toString('hex');

          if (!code || code.length < 4) {
            const resp: ApiResponse = { ok: false, code: 'invalid_code', message: 'Invalid room code supplied' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          const room = this.rooms.get(code);
          if (!room) {
            const resp: ApiResponse = { ok: false, code: 'invalid_code', message: `Room "${code}" does not exist or has expired` };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // Reject if game already started
          if (room.gameStarted) {
            const resp: ApiResponse = { ok: false, code: 'game_started', message: 'Cannot join: game has already started' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // Check if player is already in room (reconnect scenario)
          const existingIndex = room.players.findIndex((p) => p.id === playerId);
          if (existingIndex !== -1) {
            // Reconnect: update socket ID and name
            const existingPlayer = room.players[existingIndex];
            // Remove previous socket mapping
            this.socketToRoom.delete(existingPlayer.socketId);

            existingPlayer.socketId = socket.id;
            existingPlayer.name = playerName;
            room.lastActivity = Date.now();

            this.socketToRoom.set(socket.id, { roomCode: code, playerId });
            socket.join(code);

            const snapshot = this.getRoomSnapshot(room);
            const resp: ApiResponse<RoomSnapshot> = { ok: true, data: snapshot };
            if (typeof callback === 'function') callback(resp);

            this.io.to(code).emit('room-updated', snapshot);
            this.io.to(code).emit('ROOM_PLAYERS_UPDATED', { players: snapshot.players });
            return;
          }

          // Check room capacity limit (default 4)
          // Lock against race conditions with atomic check in single event loop
          if (room.players.length >= room.maxPlayers) {
            const resp: ApiResponse = { ok: false, code: 'room_full', message: `Room is full (max ${room.maxPlayers} players)` };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // All validations succeeded -> add player
          const newPlayer: RoomPlayer = {
            id: playerId,
            socketId: socket.id,
            name: playerName,
            isHost: false,
            avatarColor,
            score: 0,
            joinedAt: Date.now()
          };

          room.players.push(newPlayer);
          room.lastActivity = Date.now();

          this.socketToRoom.set(socket.id, { roomCode: code, playerId });
          socket.join(code);

          const snapshot = this.getRoomSnapshot(room);
          const resp: ApiResponse<RoomSnapshot> = { ok: true, data: snapshot };
          if (typeof callback === 'function') callback(resp);

          // Broadcast updated room state to all room members
          this.io.to(code).emit('room-updated', snapshot);
          this.io.to(code).emit('ROOM_PLAYERS_UPDATED', { players: snapshot.players });
          this.io.to(code).emit('player-joined', { player: newPlayer });
        } catch (err) {
          const resp: ApiResponse = { ok: false, code: 'server_error', message: 'Internal error joining room' };
          if (typeof callback === 'function') callback(resp);
        }
      });

      // ==========================================
      // 3. LEAVE ROOM
      // ==========================================
      socket.on('leave-room', (_payload, callback) => {
        try {
          const mapping = this.socketToRoom.get(socket.id);
          if (!mapping) {
            if (typeof callback === 'function') callback({ ok: true });
            return;
          }
          this.removePlayerFromRoom(socket.id, mapping.roomCode, mapping.playerId);
          if (typeof callback === 'function') callback({ ok: true });
        } catch (err) {
          if (typeof callback === 'function') callback({ ok: false, message: 'Error leaving room' });
        }
      });

      // ==========================================
      // 4. START GAME
      // ==========================================
      socket.on('start-game', (payload, callback) => {
        try {
          const mapping = this.socketToRoom.get(socket.id);
          const code = mapping?.roomCode || this.normalizeRoomCode(payload?.roomCode);
          if (!code) {
            const resp: ApiResponse = { ok: false, code: 'not_in_room', message: 'You are not in a room' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          const room = this.rooms.get(code);
          if (!room) {
            const resp: ApiResponse = { ok: false, code: 'room_not_found', message: 'Room not found' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // Authoritative verification: caller must be host socket
          const caller = room.players.find((p) => p.socketId === socket.id);
          if (!caller || !caller.isHost || room.hostSocketId !== socket.id) {
            const resp: ApiResponse = { ok: false, code: 'unauthorized', message: 'Only the host can start the game' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // Enforce minimum player count (2 players required)
          if (room.players.length < 2) {
            const resp: ApiResponse = { ok: false, code: 'min_players_not_met', message: 'At least 2 players are required to start' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          if (room.gameStarted) {
            const resp: ApiResponse = { ok: false, code: 'already_started', message: 'Game has already started' };
            if (typeof callback === 'function') callback(resp);
            return;
          }

          // Transition to active game
          room.gameStarted = true;
          room.state = 'word_selection';
          room.round = 1;
          room.currentDrawerIndex = 0;
          room.strokes = [];
          room.secretWord = '';
          room.guessedPlayerIds.clear();
          room.lastActivity = Date.now();

          for (const p of room.players) {
            p.score = 0;
          }

          const snapshot = this.getRoomSnapshot(room);
          const successResp: ApiResponse<RoomSnapshot> = { ok: true, data: snapshot };
          if (typeof callback === 'function') callback(successResp);

          // Broadcast authoritative game-start state to every player
          this.io.to(code).emit('game-started', snapshot);
          this.io.to(code).emit('SCRIBBLE_GAME_START', {
            round: room.round,
            totalRounds: room.totalRounds,
            currentDrawerIndex: room.currentDrawerIndex,
            players: snapshot.players
          });

          // Begin word selection for first drawer
          this.startWordSelection(room);
        } catch (err) {
          const resp: ApiResponse = { ok: false, code: 'server_error', message: 'Error starting game' };
          if (typeof callback === 'function') callback(resp);
        }
      });

      // ==========================================
      // GAMEPLAY EVENTS (Scribble Drawing & Guesses)
      // ==========================================
      socket.on('SCRIBBLE_WORD_CHOSEN_SUBMISSION', (payload) => {
        const mapping = this.socketToRoom.get(socket.id);
        if (!mapping) return;
        const room = this.rooms.get(mapping.roomCode);
        if (!room) return;

        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.socketId !== socket.id) return;

        const chosenWord = (payload?.word || '').trim().toUpperCase();
        if (!chosenWord) return;

        room.secretWord = chosenWord;
        room.state = 'drawing';
        room.strokes = [];
        room.guessedPlayerIds.clear();
        room.turnTimeLeft = 80;
        room.lastActivity = Date.now();

        // Send secret word ONLY to drawer
        socket.emit('SCRIBBLE_DRAWER_SECRET_WORD', { secretWord: room.secretWord });

        // Broadcast round start to all players with ONLY word length
        this.io.to(room.code).emit('SCRIBBLE_ROUND_START', {
          wordLength: room.secretWord.length,
          drawerIndex: room.currentDrawerIndex,
          drawerId: currentDrawer.id,
          drawerName: currentDrawer.name,
          timeLeft: room.turnTimeLeft
        });

        this.startTurnTimer(room);
      });

      socket.on('SCRIBBLE_DRAW_STROKE', (stroke: DrawingStroke) => {
        const mapping = this.socketToRoom.get(socket.id);
        if (!mapping) return;
        const room = this.rooms.get(mapping.roomCode);
        if (!room) return;

        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.socketId !== socket.id) return;

        if (stroke && typeof stroke.x0 === 'number') {
          room.strokes.push(stroke);
          // Broadcast stroke to everyone except the drawer
          socket.to(room.code).emit('SCRIBBLE_DRAW_STROKE', stroke);
        }
      });

      socket.on('SCRIBBLE_CLEAR_CANVAS', () => {
        const mapping = this.socketToRoom.get(socket.id);
        if (!mapping) return;
        const room = this.rooms.get(mapping.roomCode);
        if (!room) return;

        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.socketId !== socket.id) return;

        room.strokes = [];
        this.io.to(room.code).emit('SCRIBBLE_CLEAR_CANVAS');
      });

      socket.on('SCRIBBLE_SUBMIT_GUESS', (payload) => {
        const mapping = this.socketToRoom.get(socket.id);
        if (!mapping) return;
        const room = this.rooms.get(mapping.roomCode);
        if (!room || room.state !== 'drawing') return;

        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) return;

        const currentDrawer = room.players[room.currentDrawerIndex];
        if (currentDrawer && currentDrawer.socketId === socket.id) {
          return; // Drawer cannot guess
        }

        if (room.guessedPlayerIds.has(player.id)) {
          return; // Already guessed
        }

        const guessRaw = (payload?.text || '').trim();
        const guess = guessRaw.toUpperCase();
        if (!guess) return;

        // Exact Match
        if (guess === room.secretWord) {
          room.guessedPlayerIds.add(player.id);
          const pointsGuesser = Math.max(50, 100 + room.turnTimeLeft * 5);
          const pointsDrawer = 40;

          player.score += pointsGuesser;
          if (currentDrawer) currentDrawer.score += pointsDrawer;

          // Notify guesser privately
          socket.emit('SCRIBBLE_CORRECT_GUESS_SELF', {
            secretWord: room.secretWord,
            points: pointsGuesser,
            totalScore: player.score
          });

          // Broadcast announcement to all players without revealing the word
          this.io.to(room.code).emit('SCRIBBLE_CORRECT_GUESS_BROADCAST', {
            playerId: player.id,
            playerName: player.name,
            points: pointsGuesser,
            updatedPlayers: this.getRoomSnapshot(room).players
          });

          // If all non-drawer players guessed, advance turn
          const nonDrawers = room.players.filter((p) => p.id !== currentDrawer?.id);
          if (nonDrawers.length > 0 && room.guessedPlayerIds.size >= nonDrawers.length) {
            this.endTurn(room, 'All players guessed correctly!');
          }
          return;
        }

        // Close Guess check
        if (isCloseGuess(guess, room.secretWord)) {
          socket.emit('SCRIBBLE_CLOSE_GUESS', { text: guessRaw });
        }

        // Normal chat message to room
        this.io.to(room.code).emit('SCRIBBLE_CHAT', {
          id: Math.random().toString(),
          sender: player.name,
          text: guessRaw
        });
      });

      // Generic broadcast relay for custom multiplayer games
      socket.on('broadcast-message', (payload) => {
        const mapping = this.socketToRoom.get(socket.id);
        if (!mapping) return;
        socket.to(mapping.roomCode).emit('network-message', payload);
      });

      // ==========================================
      // 5. DISCONNECT & CLEANUP
      // ==========================================
      socket.on('disconnect', () => {
        const mapping = this.socketToRoom.get(socket.id);
        if (mapping) {
          this.removePlayerFromRoom(socket.id, mapping.roomCode, mapping.playerId);
        }
        this.rateLimits.delete(socket.id);
      });
    });
  }

  // Idempotent player removal: handles host migration and empty room deletion
  public removePlayerFromRoom(socketId: string, roomCode: string, playerId: string) {
    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const idx = room.players.findIndex((p) => p.id === playerId || p.socketId === socketId);
    if (idx === -1) return;

    const leavingPlayer = room.players[idx];
    const wasHost = leavingPlayer.isHost;
    room.players.splice(idx, 1);
    room.lastActivity = Date.now();

    // Policy: If room is empty, delete room immediately and clear timers
    if (room.players.length === 0) {
      if (room.turnTimer) {
        clearInterval(room.turnTimer);
        room.turnTimer = null;
      }
      this.rooms.delete(roomCode);
      return;
    }

    // Policy: Host Transfer - if the host leaves, transfer host ownership to next eligible player
    if (wasHost) {
      const newHost = room.players[0];
      newHost.isHost = true;
      room.hostId = newHost.id;
      room.hostSocketId = newHost.socketId;
    }

    const snapshot = this.getRoomSnapshot(room);

    // Notify remaining players
    this.io.to(roomCode).emit('player-left', { playerId, wasHost, newHostId: room.hostId });
    this.io.to(roomCode).emit('room-updated', snapshot);
    this.io.to(roomCode).emit('ROOM_PLAYERS_UPDATED', { players: snapshot.players });

    // If active drawer left during drawing phase, advance turn
    if (room.state === 'drawing' && room.currentDrawerIndex >= room.players.length) {
      this.advanceTurn(room);
    }
  }

  private startWordSelection(room: ActiveRoom) {
    const currentDrawer = room.players[room.currentDrawerIndex];
    if (!currentDrawer) return;

    const shuffled = [...SERVER_WORDS].sort(() => 0.5 - Math.random());
    room.wordChoices = shuffled.slice(0, 3);
    room.state = 'word_selection';

    this.io.to(room.code).emit('SCRIBBLE_WORD_SELECTION_PHASE', {
      drawerIndex: room.currentDrawerIndex,
      drawerId: currentDrawer.id,
      drawerName: currentDrawer.name
    });

    // Send word choices ONLY to the drawer socket
    this.io.to(currentDrawer.socketId).emit('SCRIBBLE_WORD_SELECTION_OFFER', {
      choices: room.wordChoices
    });
  }

  private startTurnTimer(room: ActiveRoom) {
    if (room.turnTimer) clearInterval(room.turnTimer);

    room.turnTimer = setInterval(() => {
      room.turnTimeLeft--;
      this.io.to(room.code).emit('SCRIBBLE_TIME_SYNC', { timeLeft: room.turnTimeLeft });

      if (room.turnTimeLeft <= 0) {
        this.endTurn(room, "Time's up!");
      }
    }, 1000);
  }

  private endTurn(room: ActiveRoom, reason: string) {
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
      room.turnTimer = null;
    }

    room.state = 'round_end';
    this.io.to(room.code).emit('SCRIBBLE_ROUND_REVEAL', {
      secretWord: room.secretWord,
      reason,
      players: this.getRoomSnapshot(room).players
    });

    setTimeout(() => {
      this.advanceTurn(room);
    }, 4000);
  }

  private advanceTurn(room: ActiveRoom) {
    if (room.players.length === 0) return;

    let nextDrawerIndex = room.currentDrawerIndex + 1;
    let nextRound = room.round;

    if (nextDrawerIndex >= room.players.length) {
      nextDrawerIndex = 0;
      nextRound++;
    }

    if (nextRound > room.totalRounds) {
      room.state = 'game_over';
      const sorted = [...room.players].sort((a, b) => b.score - a.score);
      const winner = sorted[0];

      this.io.to(room.code).emit('SCRIBBLE_GAME_OVER', {
        winner: winner ? { id: winner.id, name: winner.name, score: winner.score } : null,
        finalPlayers: this.getRoomSnapshot(room).players
      });
      return;
    }

    room.round = nextRound;
    room.currentDrawerIndex = nextDrawerIndex;
    room.strokes = [];
    room.secretWord = '';
    room.guessedPlayerIds.clear();

    this.startWordSelection(room);
  }

  // Periodic cleanup for abandoned / empty rooms
  private startPeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms.entries()) {
        const activeSocketsCount = room.players.filter((p) => this.io.sockets.sockets.has(p.socketId)).length;
        if (activeSocketsCount === 0 && now - room.lastActivity > ABANDONED_ROOM_TIMEOUT_MS) {
          if (room.turnTimer) clearInterval(room.turnTimer);
          this.rooms.delete(code);
        }
      }
    }, 60000);
    this.cleanupInterval.unref();
  }

  public listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`[MultiplayerRoomServer] Socket.IO server listening on port ${port}`);
        resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      for (const room of this.rooms.values()) {
        if (room.turnTimer) clearInterval(room.turnTimer);
      }
      this.io.close(() => {
        this.server.close(() => resolve());
      });
    });
  }
}

// Standalone entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const server = new MultiplayerRoomServer();
  server.listen(PORT);

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    console.log(`[MultiplayerRoomServer] Received ${signal}. Shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
