import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface ServerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  avatarColor: string;
  score: number;
  isReady: boolean;
  ws?: WebSocket;
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

const SERVER_WORDS: ScribbleWord[] = [
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

export interface ServerRoom {
  code: string;
  hostId: string;
  gameId: string;
  state: 'lobby' | 'word_selection' | 'drawing' | 'round_end' | 'game_over';
  round: number;
  totalRounds: number;
  currentDrawerIndex: number;
  secretWord: string;
  wordChoices: ScribbleWord[];
  players: ServerPlayer[];
  strokes: DrawingStroke[];
  guessedPlayerIds: Set<string>;
  turnTimeLeft: number;
  turnTimer: NodeJS.Timeout | null;
  createdAt: number;
}

export class MultiplayerServer {
  public rooms: Map<string, ServerRoom> = new Map();
  public server: http.Server;
  public wss: WebSocketServer;
  private startTime = Date.now();

  constructor() {
    this.server = http.createServer((req, res) => this.handleHttp(req, res));
    this.wss = new WebSocketServer({ noServer: true });

    this.server.on('upgrade', (request, socket, head) => {
      const parsedUrl = new URL(request.url || '/', 'http://localhost');
      if (parsedUrl.pathname === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws, request) => {
      this.handleWsConnection(ws, request);
    });

    // Cleanup idle empty rooms every 60s
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms.entries()) {
        const activeSockets = room.players.filter((p) => p.ws && p.ws.readyState === WebSocket.OPEN);
        if (activeSockets.length === 0 && now - room.createdAt > 5 * 60 * 1000) {
          if (room.turnTimer) clearInterval(room.turnTimer);
          this.rooms.delete(code);
        }
      }
    }, 60000);
    cleanupInterval.unref();
  }

  // Generate 6-char safe alphanumeric code
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let attempts = 0; attempts < 100; attempts++) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!this.rooms.has(code)) return code;
    }
    return code;
  }

  private handleHttp(req: http.IncomingMessage, res: http.ServerResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = parsedUrl.pathname;

    // 1. Health endpoint
    if (pathname === '/health' || pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'playbreak-multiplayer',
          uptime: (Date.now() - this.startTime) / 1000,
          roomsCount: this.rooms.size,
          activeConnections: this.wss.clients.size,
          timestamp: Date.now()
        })
      );
      return;
    }

    // 2. Create Room POST /api/rooms
    if (pathname === '/api/rooms' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          const hostName = (parsed.hostName || 'Host').trim();
          const gameId = parsed.gameId || 'scribble';
          const roomCode = this.generateRoomCode();
          const hostId = 'host_' + Math.random().toString(36).substring(2, 9);

          const room: ServerRoom = {
            code: roomCode,
            hostId,
            gameId,
            state: 'lobby',
            round: 1,
            totalRounds: 3,
            currentDrawerIndex: 0,
            secretWord: '',
            wordChoices: [],
            players: [],
            strokes: [],
            guessedPlayerIds: new Set(),
            turnTimeLeft: 80,
            turnTimer: null,
            createdAt: Date.now()
          };

          this.rooms.set(roomCode, room);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              roomCode,
              hostId,
              message: `Room ${roomCode} created successfully`
            })
          );
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    // 3. Inspect Room GET /api/rooms/:code
    const matchRoom = pathname?.match(/^\/api\/rooms\/([A-Z0-9]+)$/i);
    if (matchRoom && req.method === 'GET') {
      const code = matchRoom[1].toUpperCase();
      const room = this.rooms.get(code);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ exists: false, error: `Room "${code}" not found or expired` }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          exists: true,
          roomCode: room.code,
          playerCount: room.players.length,
          minPlayers: 2,
          maxPlayers: 8,
          state: room.state,
          players: room.players.map((p) => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost,
            avatarColor: p.avatarColor,
            score: p.score
          }))
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  private handleWsConnection(ws: WebSocket, request: http.IncomingMessage) {
    const parsedUrl = new URL(request.url || '/', 'http://localhost');
    const roomCode = (parsedUrl.searchParams.get('room') || '').toUpperCase().trim();
    const playerId = parsedUrl.searchParams.get('playerId') || 'p_' + Math.random().toString(36).substring(2, 9);
    const playerName = (parsedUrl.searchParams.get('name') || 'Player').trim();
    const avatarColor = parsedUrl.searchParams.get('avatarColor') || '#8b5cf6';

    const room = this.rooms.get(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: 'ERROR', error: `Room "${roomCode}" does not exist or has expired.` }));
      ws.close(4004, 'Room not found');
      return;
    }

    if (room.players.length >= 8 && !room.players.some((p) => p.id === playerId)) {
      ws.send(JSON.stringify({ type: 'ERROR', error: `Room "${roomCode}" is full (maximum 8 players).` }));
      ws.close(4003, 'Room full');
      return;
    }

    // Determine host status: first player or matching registered hostId
    const isHost = room.players.length === 0 || room.hostId === playerId;
    if (room.players.length === 0) {
      room.hostId = playerId;
    }

    let existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      existingPlayer.ws = ws;
      existingPlayer.name = playerName;
    } else {
      existingPlayer = {
        id: playerId,
        name: playerName,
        isHost,
        avatarColor,
        score: 0,
        isReady: true,
        ws
      };
      room.players.push(existingPlayer);
    }

    // Send welcome confirmation with authoritative room state
    ws.send(
      JSON.stringify({
        type: 'ROOM_JOIN_ACCEPT',
        payload: {
          roomCode: room.code,
          myId: playerId,
          myName: playerName,
          isHost: existingPlayer.isHost,
          state: room.state,
          round: room.round,
          currentDrawerIndex: room.currentDrawerIndex,
          players: this.sanitizePlayers(room.players),
          strokes: room.strokes
        }
      })
    );

    // Broadcast updated player roster to all room members
    this.broadcastRoster(room);

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleRoomMessage(room, existingPlayer!, msg);
      } catch (err) {
        console.error('[MultiplayerServer] Error handling message:', err);
      }
    });

    ws.on('close', () => {
      this.handlePlayerDisconnect(room, playerId);
    });

    ws.on('error', (err) => {
      console.warn(`[MultiplayerServer] Socket error for ${playerId}:`, err);
    });
  }

  private sanitizePlayers(players: ServerPlayer[]) {
    return players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      avatarColor: p.avatarColor,
      score: p.score,
      isReady: p.isReady
    }));
  }

  private broadcastToRoom(room: ServerRoom, message: object, excludeWs?: WebSocket) {
    const payloadStr = JSON.stringify(message);
    for (const player of room.players) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN && player.ws !== excludeWs) {
        player.ws.send(payloadStr);
      }
    }
  }

  private broadcastRoster(room: ServerRoom) {
    this.broadcastToRoom(room, {
      type: 'ROOM_PLAYERS_UPDATED',
      payload: {
        players: this.sanitizePlayers(room.players)
      }
    });
  }

  private handlePlayerDisconnect(room: ServerRoom, playerId: string) {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;

    const wasHost = room.players[idx].isHost;
    room.players.splice(idx, 1);

    // Reassign host if host left
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }

    this.broadcastRoster(room);

    // If active drawer left during drawing phase, advance turn
    if (room.state === 'drawing' && room.currentDrawerIndex >= room.players.length) {
      this.advanceTurn(room);
    }
  }

  private handleRoomMessage(room: ServerRoom, player: ServerPlayer, msg: { type: string; payload?: any }) {
    switch (msg.type) {
      // 1. GAME START: Host triggers game
      case 'SCRIBBLE_GAME_START': {
        if (!player.isHost) {
          player.ws?.send(JSON.stringify({ type: 'ERROR', error: 'Only the host can start the game.' }));
          return;
        }
        if (room.players.length < 2) {
          player.ws?.send(JSON.stringify({ type: 'ERROR', error: 'At least 2 players are required to start.' }));
          return;
        }

        room.state = 'word_selection';
        room.round = 1;
        room.currentDrawerIndex = 0;
        room.strokes = [];
        room.secretWord = '';
        room.guessedPlayerIds.clear();

        for (const p of room.players) {
          p.score = 0;
        }

        // Broadcast authoritative GAME START to every client
        this.broadcastToRoom(room, {
          type: 'SCRIBBLE_GAME_START',
          payload: {
            round: room.round,
            totalRounds: room.totalRounds,
            currentDrawerIndex: room.currentDrawerIndex,
            players: this.sanitizePlayers(room.players)
          }
        });

        // Trigger word selection
        this.startWordSelection(room);
        break;
      }

      // 2. DRAWER SUBMITS CHOSEN WORD
      case 'SCRIBBLE_WORD_CHOSEN_SUBMISSION': {
        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.id !== player.id) {
          return; // Only current drawer can choose word
        }

        const chosenWord = (msg.payload?.word || '').trim().toUpperCase();
        if (!chosenWord) return;

        room.secretWord = chosenWord;
        room.state = 'drawing';
        room.strokes = [];
        room.guessedPlayerIds.clear();
        room.turnTimeLeft = 80;

        // Send secret word ONLY to drawer
        player.ws?.send(
          JSON.stringify({
            type: 'SCRIBBLE_DRAWER_SECRET_WORD',
            payload: { secretWord: room.secretWord }
          })
        );

        // Broadcast round start to all players with ONLY word length
        this.broadcastToRoom(room, {
          type: 'SCRIBBLE_ROUND_START',
          payload: {
            wordLength: room.secretWord.length,
            drawerIndex: room.currentDrawerIndex,
            drawerId: currentDrawer.id,
            drawerName: currentDrawer.name,
            timeLeft: room.turnTimeLeft
          }
        });

        // Start 80s countdown timer
        this.startTurnTimer(room);
        break;
      }

      // 3. CANVAS DRAWING STROKE
      case 'SCRIBBLE_DRAW_STROKE': {
        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.id !== player.id) return;

        const stroke = msg.payload as DrawingStroke;
        if (stroke) {
          room.strokes.push(stroke);
          // Relay stroke to all other players in real time
          this.broadcastToRoom(
            room,
            {
              type: 'SCRIBBLE_DRAW_STROKE',
              payload: stroke
            },
            player.ws
          );
        }
        break;
      }

      // 4. CANVAS CLEAR
      case 'SCRIBBLE_CLEAR_CANVAS': {
        const currentDrawer = room.players[room.currentDrawerIndex];
        if (!currentDrawer || currentDrawer.id !== player.id) return;

        room.strokes = [];
        this.broadcastToRoom(room, { type: 'SCRIBBLE_CLEAR_CANVAS' });
        break;
      }

      // 5. GUESS SUBMISSION
      case 'SCRIBBLE_SUBMIT_GUESS': {
        const guessRaw = (msg.payload?.text || '').trim();
        const guess = guessRaw.toUpperCase();
        if (!guess || room.state !== 'drawing') return;

        const currentDrawer = room.players[room.currentDrawerIndex];
        if (currentDrawer && currentDrawer.id === player.id) {
          return; // Drawer cannot guess
        }

        if (room.guessedPlayerIds.has(player.id)) {
          // Player already guessed, broadcast chat only to other already-guessed players
          return;
        }

        // Exact Match
        if (guess === room.secretWord) {
          room.guessedPlayerIds.add(player.id);
          const pointsGuesser = Math.max(50, 100 + room.turnTimeLeft * 5);
          const pointsDrawer = 40;

          player.score += pointsGuesser;
          if (currentDrawer) currentDrawer.score += pointsDrawer;

          // Notify guesser privately
          player.ws?.send(
            JSON.stringify({
              type: 'SCRIBBLE_CORRECT_GUESS_SELF',
              payload: {
                secretWord: room.secretWord,
                points: pointsGuesser,
                totalScore: player.score
              }
            })
          );

          // Broadcast announcement to all players without revealing word
          this.broadcastToRoom(room, {
            type: 'SCRIBBLE_CORRECT_GUESS_BROADCAST',
            payload: {
              playerId: player.id,
              playerName: player.name,
              points: pointsGuesser,
              updatedPlayers: this.sanitizePlayers(room.players)
            }
          });

          // Check if all non-drawer players have guessed
          const nonDrawers = room.players.filter((p) => p.id !== currentDrawer?.id);
          if (nonDrawers.length > 0 && room.guessedPlayerIds.size >= nonDrawers.length) {
            this.endTurn(room, 'All players guessed correctly!');
          }
          return;
        }

        // Close Guess check
        if (isCloseGuess(guess, room.secretWord)) {
          player.ws?.send(
            JSON.stringify({
              type: 'SCRIBBLE_CLOSE_GUESS',
              payload: { text: guessRaw }
            })
          );
        }

        // Broadcast normal chat to everyone
        this.broadcastToRoom(room, {
          type: 'SCRIBBLE_CHAT',
          payload: {
            id: Math.random().toString(),
            sender: player.name,
            text: guessRaw
          }
        });
        break;
      }

      // 6. HEARTBEAT PING
      case 'PING': {
        player.ws?.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;
      }
    }
  }

  private startWordSelection(room: ServerRoom) {
    const currentDrawer = room.players[room.currentDrawerIndex];
    if (!currentDrawer) return;

    // Pick 3 random words
    const shuffled = [...SERVER_WORDS].sort(() => 0.5 - Math.random());
    room.wordChoices = shuffled.slice(0, 3);
    room.state = 'word_selection';

    // Broadcast state to room
    this.broadcastToRoom(room, {
      type: 'SCRIBBLE_WORD_SELECTION_PHASE',
      payload: {
        drawerIndex: room.currentDrawerIndex,
        drawerId: currentDrawer.id,
        drawerName: currentDrawer.name
      }
    });

    // Send word choices ONLY to the drawer
    currentDrawer.ws?.send(
      JSON.stringify({
        type: 'SCRIBBLE_WORD_SELECTION_OFFER',
        payload: { choices: room.wordChoices }
      })
    );
  }

  private startTurnTimer(room: ServerRoom) {
    if (room.turnTimer) clearInterval(room.turnTimer);

    room.turnTimer = setInterval(() => {
      room.turnTimeLeft--;

      this.broadcastToRoom(room, {
        type: 'SCRIBBLE_TIME_SYNC',
        payload: { timeLeft: room.turnTimeLeft }
      });

      if (room.turnTimeLeft <= 0) {
        this.endTurn(room, "Time's up!");
      }
    }, 1000);
  }

  private endTurn(room: ServerRoom, reason: string) {
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
      room.turnTimer = null;
    }

    room.state = 'round_end';

    // Broadcast turn end with revealed word to all players
    this.broadcastToRoom(room, {
      type: 'SCRIBBLE_ROUND_REVEAL',
      payload: {
        secretWord: room.secretWord,
        reason,
        players: this.sanitizePlayers(room.players)
      }
    });

    // Delay 4 seconds before advancing turn
    setTimeout(() => {
      this.advanceTurn(room);
    }, 4000);
  }

  private advanceTurn(room: ServerRoom) {
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

      this.broadcastToRoom(room, {
        type: 'SCRIBBLE_GAME_OVER',
        payload: {
          winner: winner ? { id: winner.id, name: winner.name, score: winner.score } : null,
          finalPlayers: this.sanitizePlayers(sorted)
        }
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

  public listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`[MultiplayerServer] Live and listening on port ${port}`);
        resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      for (const room of this.rooms.values()) {
        if (room.turnTimer) clearInterval(room.turnTimer);
      }
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }
}

// Standalone execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const server = new MultiplayerServer();
  server.listen(PORT);
}
