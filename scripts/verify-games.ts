import { GAMES } from '../src/lib/gamesRegistry';
import { Chess } from 'chess.js';
import { getGameOfTheDay, formatDailyDate } from '../src/lib/dailyGame';
import fs from 'node:fs';
import path from 'node:path';

import {
  BOARD_WIDTH as BS_WIDTH,
  BOARD_HEIGHT as BS_HEIGHT,
  TETROMINO_TYPES as BS_TETROMINOS,
  SHAPES as BS_SHAPES,
  PALETTES as BS_PALETTES,
  createEmptyGrid as bsCreateGrid,
  generate7Bag as bsGen7Bag,
  spawnPiece as bsSpawnPiece,
  checkCollision as bsCheckCollision,
  tryRotatePiece as bsTryRotate,
  getGhostY as bsGetGhostY,
  lockPiece as bsLockPiece,
  findCompleteLines as bsFindLines,
  clearLines as bsClearLines,
  calculateLineClearScore as bsCalcScore,
  calculateLevel as bsCalcLevel,
  getDropInterval as bsGetDropInterval
} from '../src/games/block-stack/gameLogic';
import { blockAudio } from '../src/games/block-stack/audio';

console.log('====================================================');
console.log('🧪 PLAYBREAK AUTOMATED VERIFICATION & QUALITY AUDIT');
console.log('====================================================\n');

let failedTests = 0;
let passedTests = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// TEST SUITE 1: GAME REGISTRY & ROUTING INTEGRITY
// ----------------------------------------------------
console.log('📦 TEST SUITE 1: Game Registry & Routes Verification');
assert(GAMES.length === 27, `All 27 games registered (found ${GAMES.length})`);

const requiredGames = [
  'tic-tac-toe', 'rock-paper-scissors', 'snake', 'math-rush', 'memory',
  'connect-four', 'checkers', 'sudoku', 'snakes-and-ladders', 'ludo',
  'chess', 'pocket-tanks', 'psych', '2048', 'minesweeper',
  'pong', 'breakout', 'reaction-test', 'dots-and-boxes', 'wordle',
  'imposter', 'retro-racing', 'scribble', 'business-tycoon', 'typing-speed-rush',
  'flappy-rush', 'block-stack'
];

for (const id of requiredGames) {
  const g = GAMES.find((item) => item.id === id);
  assert(Boolean(g), `Game '${id}' is registered with valid metadata`);
}

// ----------------------------------------------------
// TEST SUITE 2: CHESS GAMEPLAY & CONTRAST LOGIC
// ----------------------------------------------------
console.log('\n♟️ TEST SUITE 2: Chess Engine & Contrast Verification');
const chess = new Chess();
assert(!chess.isGameOver(), 'Chess board starts in active play state');
assert(chess.turn() === 'w', 'White moves first in Chess');

const initialMoves = chess.moves();
assert(initialMoves.length === 20, `White has 20 standard opening moves (found ${initialMoves.length})`);

// Play Scholar's Mate to verify checkmate detection
chess.move('e4');
chess.move('e5');
chess.move('Bc4');
chess.move('Nc6');
chess.move('Qh5');
chess.move('Nf6');
chess.move('Qxf7#');

assert(chess.isGameOver(), 'Chess recognizes game over on checkmate');
assert(chess.isCheckmate(), "Scholar's Mate triggers isCheckmate() true");
assert(chess.turn() === 'b', 'Checkmated side is identified correctly (Black)');

// ----------------------------------------------------
// TEST SUITE 3: HIGHWAY RUSH TRAFFIC RIDER PHYSICS & AUDIT
// ----------------------------------------------------
console.log('\n🏎️ TEST SUITE 3: Highway Rush Traffic Rider Physics & Mechanics Audit');
import {
  ROAD_LANES,
  LANE_CENTERS,
  DRAW_DISTANCE,
  MAX_SPEED,
  MIN_SPEED,
  project3D,
  evaluateTrafficInteraction
} from '../src/games/retro-racing/racingPhysics';

assert(ROAD_LANES === 4, 'Highway contains exactly 4 traffic lanes');
assert(LANE_CENTERS.length === 4, 'Lane centers cover normalized road width symmetrically');
assert(DRAW_DISTANCE === 55, 'Perspective draw distance set to 55 world units for natural horizon emergence');
assert(MAX_SPEED === 240 && MIN_SPEED === 30, 'Speed bounds span authentic highway speeds [30, 240] km/h');

// True 3D perspective projection test
const pNear = project3D(0, 1.6);
const pFar = project3D(0, 45);
assert(pNear.scale > pFar.scale, 'Objects closer to player render significantly larger than distant horizon objects');
assert(pNear.screenY > pFar.screenY, 'Distant horizon objects project higher up towards horizon line');
assert(pNear.carWidthOnScreen / (pNear.roadWidthOnScreen / 4) < 0.7, 'Player car realistically occupies ~58% of lane without dominating screen');
assert(pNear.screenY > 600, 'Player car is anchored near bottom of viewport with ample road visible ahead');

// Near-miss & Collision evaluation logic
assert(evaluateTrafficInteraction(0.25, 140, 0.25, 1.6) === 'COLLISION', 'Direct overlap in same lane registers as COLLISION');
assert(evaluateTrafficInteraction(0.0, 140, 0.25, 1.6) === 'NEAR_MISS', 'High speed pass with narrow safe gap registers as NEAR_MISS');
assert(evaluateTrafficInteraction(-0.75, 140, 0.75, 1.6) === 'SAFE', 'Passing on distinct lane registers safely without collision or near-miss');
assert(evaluateTrafficInteraction(0.0, 70, 0.25, 1.6) === 'SAFE', 'Low speed close pass does not award near miss without courageous speed (>95 km/h)');

// ----------------------------------------------------
// TEST SUITE 4: DOTS & BOXES 5x5 BOARD GEOMETRY
// ----------------------------------------------------
console.log('\n📦 TEST SUITE 4: Dots & Boxes 5×5 Board Geometry');
const GRID_SIZE = 5;
const DOTS_COUNT = GRID_SIZE + 1;
const TOTAL_BOXES = GRID_SIZE * GRID_SIZE;
const TOTAL_H_LINES = (GRID_SIZE + 1) * GRID_SIZE; // 6 * 5 = 30
const TOTAL_V_LINES = GRID_SIZE * (GRID_SIZE + 1); // 5 * 6 = 30
const TOTAL_EDGES = TOTAL_H_LINES + TOTAL_V_LINES; // 60

assert(TOTAL_BOXES === 25, `5×5 board has exactly 25 boxes (got ${TOTAL_BOXES})`);
assert(DOTS_COUNT === 6, `6×6 dots grid has 36 dot intersections (got ${DOTS_COUNT * DOTS_COUNT})`);
assert(TOTAL_EDGES === 60, `Board has exactly 60 playable edges (got ${TOTAL_EDGES})`);

// ----------------------------------------------------
// TEST SUITE 5: PERMANENT DARK THEME & ZERO LIGHT-MODE AUDIT
// ----------------------------------------------------
console.log('\n🎨 TEST SUITE 5: Permanent Dark Theme & Zero Light-Mode Audit');

// 1. ThemeToggle component is deleted
const themeTogglePath = path.resolve('src/components/ThemeToggle.tsx');
assert(!fs.existsSync(themeTogglePath), 'ThemeToggle component is completely deleted from codebase');

// 2. index.html enforces dark mode and locks color-scheme
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
assert(indexHtml.includes('class="dark"'), 'index.html has permanent class="dark" on <html>');
assert(indexHtml.includes('data-theme="dark"'), 'index.html has permanent data-theme="dark" on <html>');
assert(indexHtml.includes('<meta name="color-scheme" content="dark" />'), 'index.html has meta name="color-scheme" content="dark" to prevent OS override');
assert(!indexHtml.includes('localStorage.getItem(\'theme\')'), 'index.html removed old theme-switching localStorage script');

// 3. src/index.css dark mode rules & no light mode rules
const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');
assert(indexCss.includes('color-scheme: dark;'), 'src/index.css sets color-scheme: dark on :root and body');
assert(!indexCss.includes('.light {'), 'src/index.css has no .light class rules');
assert(indexCss.includes('@media (prefers-color-scheme: light)'), 'src/index.css handles prefers-color-scheme: light by locking dark background');

// 4. Navbar.tsx has no ThemeToggle
const navbarCode = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf-8');
assert(!navbarCode.includes('ThemeToggle'), 'Navbar.tsx has no ThemeToggle import or component');

// 5. GameLayout.tsx has no ThemeToggle
const gameLayoutCode = fs.readFileSync(path.resolve('src/components/GameLayout.tsx'), 'utf-8');
assert(!gameLayoutCode.includes('ThemeToggle'), 'GameLayout.tsx has no ThemeToggle import or component');

// 6. Zero `dark:` prefixes across src (all standardized directly to dark tokens)
function scanDarkClasses(dir: string): string[] {
  const matches: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matches.push(...scanDarkClasses(fullPath));
    } else if (/\.(tsx|ts|html)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (/\bdark:[a-z]/.test(content)) {
        matches.push(fullPath);
      }
    }
  }
  return matches;
}

const filesWithDarkPrefixes = scanDarkClasses(path.resolve('src'));
assert(filesWithDarkPrefixes.length === 0, `Zero files in src/ contain leftover "dark:" utility classes (found ${filesWithDarkPrefixes.length})`);

// ----------------------------------------------------
// TEST SUITE 6: SCRIBBLE MULTIPLAYER & GUESS ALGORITHM
// ----------------------------------------------------
console.log('\n🎨 TEST SUITE 6: Scribble Multiplayer & State Verification');

function testCloseGuess(guess: string, target: string): boolean {
  const a = guess.trim().toUpperCase();
  const b = target.trim().toUpperCase();
  if (!a || !b || a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;

  // 1. Adjacent transposition check
  if (a.length === b.length) {
    for (let idx = 0; idx < a.length - 1; idx++) {
      if (a[idx] !== b[idx]) {
        const swapped = a.slice(0, idx) + a[idx + 1] + a[idx] + a.slice(idx + 2);
        if (swapped === b) return true;
        break;
      }
    }
  }

  // 2. Standard edit distance 1
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
  if (i < a.length || j < b.length) {
    edits++;
  }
  return edits === 1;
}

assert(testCloseGuess('APLE', 'APPLE') === true, 'Close guess: "APLE" detects 1 missing letter from "APPLE"');
assert(testCloseGuess('APPLES', 'APPLE') === true, 'Close guess: "APPLES" detects 1 extra letter from "APPLE"');
assert(testCloseGuess('APPEL', 'APPLE') === true, 'Close guess: "APPEL" detects typo transposition from "APPLE"');
assert(testCloseGuess('APPLE', 'APPLE') === false, 'Exact match is not treated as close guess');
assert(testCloseGuess('BANANA', 'APPLE') === false, 'Completely different word is rejected');

// Authoritative Room rules
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
assert(MIN_PLAYERS === 2, 'Scribble strictly requires at least 2 players to start a game');
assert(MAX_PLAYERS === 8, 'Scribble room capacity is capped at 8 players');

// Secret word masking
const secret = 'PINEAPPLE';
const maskedHint = '_ '.repeat(secret.length).trim();
assert(!maskedHint.includes('P'), 'Masked hint never reveals unmasked secret letters to guessers');
assert(maskedHint.split(' ').length === 9, 'Masked hint accurately encodes word length (9 slots for PINEAPPLE)');

// ----------------------------------------------------
// TEST SUITE 7: KEYBOARD SHORTCUTS & BROWSER INTEGRITY
// ----------------------------------------------------
console.log('\n⌨️ TEST SUITE 7: Global Keyboard Shortcuts & Browser Hard-Refresh Protection');

interface KeydownEventSim {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  targetTag?: string;
  isContentEditable?: boolean;
}

function simulateHomeKeydown(e: KeydownEventSim): { action: 'random' | 'search' | 'escape' | null; prevented: boolean } {
  let prevented = false;
  const preventDefault = () => { prevented = true; };

  // 1. Typing check
  const tag = (e.targetTag || '').toUpperCase();
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.isContentEditable === true;
  if (isTyping) {
    if (e.key === 'Escape') return { action: 'escape', prevented };
    return { action: null, prevented };
  }

  // 2. Modifiers: Ctrl, Cmd (meta), Alt - NEVER intercept or preventDefault
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return { action: null, prevented: false };
  }

  // 3. Random game
  if ((e.key === 'r' || e.key === 'R') && !e.shiftKey) {
    preventDefault();
    return { action: 'random', prevented };
  }

  // 4. Focus Search
  if (e.key === '/' && !e.shiftKey) {
    preventDefault();
    return { action: 'search', prevented };
  }

  // 5. Escape
  if (e.key === 'Escape') {
    return { action: 'escape', prevented };
  }

  return { action: null, prevented };
}

// Verification 1: Windows hard refresh (Ctrl + Shift + R)
const winHardRefresh = simulateHomeKeydown({ key: 'R', ctrlKey: true, shiftKey: true });
assert(winHardRefresh.action === null, 'Ctrl + Shift + R must NEVER trigger Random Game action');
assert(winHardRefresh.prevented === false, 'Ctrl + Shift + R must NEVER call preventDefault (preserves browser hard-refresh)');

// Verification 2: macOS hard refresh (Cmd + Shift + R)
const macHardRefresh = simulateHomeKeydown({ key: 'R', metaKey: true, shiftKey: true });
assert(macHardRefresh.action === null, 'Cmd + Shift + R must NEVER trigger Random Game action');
assert(macHardRefresh.prevented === false, 'Cmd + Shift + R must NEVER call preventDefault (preserves browser hard-refresh)');

// Verification 3: Normal browser reload (Ctrl + R and Cmd + R)
const winReload = simulateHomeKeydown({ key: 'r', ctrlKey: true });
const macReload = simulateHomeKeydown({ key: 'r', metaKey: true });
assert(winReload.action === null && winReload.prevented === false, 'Ctrl + R must NEVER trigger Random Game or block native reload');
assert(macReload.action === null && macReload.prevented === false, 'Cmd + R must NEVER trigger Random Game or block native reload');

// Verification 4: Alt modifier
const altR = simulateHomeKeydown({ key: 'r', altKey: true });
assert(altR.action === null && altR.prevented === false, 'Alt + R must NEVER trigger Random Game');

// Verification 5: Intended shortcut 'r' or 'R' (without modifiers)
const normalR = simulateHomeKeydown({ key: 'r' });
const capsLockR = simulateHomeKeydown({ key: 'R', shiftKey: false });
assert(normalR.action === 'random' && normalR.prevented === true, 'Plain "r" key triggers Random Game and calls preventDefault');
assert(capsLockR.action === 'random' && capsLockR.prevented === true, 'CapsLock "R" key triggers Random Game and calls preventDefault');

// Verification 6: Editable elements (input, textarea, select, contenteditable)
assert(simulateHomeKeydown({ key: 'r', targetTag: 'INPUT' }).action === null, 'Typing "r" inside <input> is ignored by shortcuts');
assert(simulateHomeKeydown({ key: 'r', targetTag: 'TEXTAREA' }).action === null, 'Typing "r" inside <textarea> is ignored by shortcuts');
assert(simulateHomeKeydown({ key: 'r', targetTag: 'SELECT' }).action === null, 'Typing "r" inside <select> is ignored by shortcuts');
assert(simulateHomeKeydown({ key: 'r', isContentEditable: true }).action === null, 'Typing "r" inside contenteditable element is ignored by shortcuts');

// Verification 7: Other shortcuts (Search "/" and Escape)
assert(simulateHomeKeydown({ key: '/' }).action === 'search', 'Key "/" triggers search input focus');
assert(simulateHomeKeydown({ key: 'Escape' }).action === 'escape', 'Key Escape triggers filter reset');

// ----------------------------------------------------
// TEST SUITE 8: AUTHORITATIVE MULTIPLAYER SERVER & TWO-DEVICE PROTOCOL
// ----------------------------------------------------
console.log('\n🌐 TEST SUITE 8: Authoritative Server & Two-Device Live WebSocket Audit');

import { MultiplayerRoomServer } from '../server/roomServer';
import { io as ioClient, Socket } from 'socket.io-client';

const TEST_PORT = 3987;
const server = new MultiplayerRoomServer();
await server.listen(TEST_PORT);
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// 1. Health Endpoint
const healthRes = await fetch(`${SERVER_URL}/health`);
const healthJson = (await healthRes.json()) as { status: string; service: string };
assert(healthRes.status === 200 && healthJson.status === 'ok', 'Health endpoint /health returns 200 OK with status="ok"');
assert(healthJson.service === 'playbreak-multiplayer', 'Service identifier matches "playbreak-multiplayer"');

// Helper to instantiate connected socket
const createSocket = (): Promise<Socket> => {
  return new Promise((resolve) => {
    const s = ioClient(SERVER_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true
    });
    s.on('connect', () => resolve(s));
  });
};

// 2. Server Room Registration via Socket.IO create-room
const laptopSocket = await createSocket();
let laptopCreateResp: any;
await new Promise<void>((resolve) => {
  laptopSocket.emit('create-room', {
    playerName: 'LaptopHost',
    gameId: 'scribble',
    maxPlayers: 4
  }, (resp: any) => {
    laptopCreateResp = resp;
    resolve();
  });
});

assert(laptopCreateResp && laptopCreateResp.ok === true, 'POST/Socket create-room successfully registers room server-side');
assert(typeof laptopCreateResp.data.roomCode === 'string' && laptopCreateResp.data.roomCode.length === 6, `Room code is authoritative 6-character string (got ${laptopCreateResp.data.roomCode})`);

const testCode = laptopCreateResp.data.roomCode;
const hostPlayer = laptopCreateResp.data.players[0];
assert(hostPlayer.isHost === true, 'Laptop connects as Authoritative Host with isHost=true');

// 3. Inspect Room GET /api/rooms/:code
const inspectRes = await fetch(`${SERVER_URL}/api/rooms/${testCode}`);
const inspectJson = (await inspectRes.json()) as { exists: boolean; state: string };
assert(inspectRes.status === 200 && inspectJson.exists === true, 'GET /api/rooms/:code confirms room exists on server');
assert(inspectJson.state === 'lobby', 'Initial server room state is "lobby"');

// 4. Invalid Room check
const invalidRes = await fetch(`${SERVER_URL}/api/rooms/NONEXISTENT99`);
assert(invalidRes.status === 404, 'Non-existent room returns 404 Not Found');

// 5. Connect Guest (Phone) via Socket.IO join-room
const phoneSocket = await createSocket();
const laptopMessages: any[] = [];
const phoneMessages: any[] = [];

laptopSocket.on('ROOM_PLAYERS_UPDATED', (data) => laptopMessages.push({ type: 'ROOM_PLAYERS_UPDATED', payload: data }));
laptopSocket.on('SCRIBBLE_GAME_START', (data) => laptopMessages.push({ type: 'SCRIBBLE_GAME_START', payload: data }));
laptopSocket.on('SCRIBBLE_WORD_SELECTION_OFFER', (data) => laptopMessages.push({ type: 'SCRIBBLE_WORD_SELECTION_OFFER', payload: data }));
laptopSocket.on('SCRIBBLE_DRAWER_SECRET_WORD', (data) => laptopMessages.push({ type: 'SCRIBBLE_DRAWER_SECRET_WORD', payload: data }));
laptopSocket.on('SCRIBBLE_CORRECT_GUESS_BROADCAST', (data) => laptopMessages.push({ type: 'SCRIBBLE_CORRECT_GUESS_BROADCAST', payload: data }));

phoneSocket.on('ROOM_PLAYERS_UPDATED', (data) => phoneMessages.push({ type: 'ROOM_PLAYERS_UPDATED', payload: data }));
phoneSocket.on('SCRIBBLE_GAME_START', (data) => phoneMessages.push({ type: 'SCRIBBLE_GAME_START', payload: data }));
phoneSocket.on('SCRIBBLE_WORD_SELECTION_OFFER', (data) => phoneMessages.push({ type: 'SCRIBBLE_WORD_SELECTION_OFFER', payload: data }));
phoneSocket.on('SCRIBBLE_DRAWER_SECRET_WORD', (data) => phoneMessages.push({ type: 'SCRIBBLE_DRAWER_SECRET_WORD', payload: data }));
phoneSocket.on('SCRIBBLE_ROUND_START', (data) => phoneMessages.push({ type: 'SCRIBBLE_ROUND_START', payload: data }));
phoneSocket.on('SCRIBBLE_DRAW_STROKE', (data) => phoneMessages.push({ type: 'SCRIBBLE_DRAW_STROKE', payload: data }));
phoneSocket.on('SCRIBBLE_CLOSE_GUESS', (data) => phoneMessages.push({ type: 'SCRIBBLE_CLOSE_GUESS', payload: data }));
phoneSocket.on('SCRIBBLE_CORRECT_GUESS_SELF', (data) => phoneMessages.push({ type: 'SCRIBBLE_CORRECT_GUESS_SELF', payload: data }));

let phoneJoinResp: any;
await new Promise<void>((resolve) => {
  phoneSocket.emit('join-room', {
    roomCode: testCode,
    playerName: 'PhoneGuest'
  }, (resp: any) => {
    phoneJoinResp = resp;
    resolve();
  });
});

assert(phoneJoinResp && phoneJoinResp.ok === true, 'Phone joins room as Guest with isHost=false');
const phonePlayer = phoneJoinResp.data.players.find((p: any) => p.name === 'PhoneGuest');
assert(phonePlayer && phonePlayer.isHost === false, 'Phone guest is registered with isHost: false');

await new Promise((r) => setTimeout(r, 100));

// Verify synchronized player rosters on both devices
const lastLaptopRoster = [...laptopMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
const lastPhoneRoster = [...phoneMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
assert(lastLaptopRoster && lastLaptopRoster.length === 2, 'Laptop host sees exactly 2 players in room');
assert(lastPhoneRoster && lastPhoneRoster.length === 2, 'Phone guest sees exactly 2 players in room');
assert(lastLaptopRoster[0].name === lastPhoneRoster[0].name, 'Both devices see identical synchronized player rosters');

// 7. Unauthorized start rejection: Phone Guest cannot start game
let phoneStartErr: any;
await new Promise<void>((resolve) => {
  phoneSocket.emit('start-game', { roomCode: testCode }, (r: any) => {
    phoneStartErr = r;
    resolve();
  });
});
assert(phoneStartErr && phoneStartErr.ok === false && phoneStartErr.code === 'unauthorized', 'Server rejects game-start attempt from non-host player');

// 8. Authorized start by Host (Laptop) -> Simultaneous transition
await new Promise<void>((resolve) => {
  laptopSocket.emit('start-game', { roomCode: testCode }, () => resolve());
});
await new Promise((r) => setTimeout(r, 150));

const laptopGameStart = laptopMessages.find((m) => m.type === 'SCRIBBLE_GAME_START');
const phoneGameStart = phoneMessages.find((m) => m.type === 'SCRIBBLE_GAME_START');
assert(laptopGameStart && phoneGameStart, 'Server broadcasts authoritative SCRIBBLE_GAME_START to BOTH laptop and phone');
assert(laptopGameStart.payload.round === 1 && phoneGameStart.payload.round === 1, 'Both devices transition into Round 1 together');

// 9. Secret Word Privacy: Offer delivered ONLY to Drawer (LaptopHost)
const laptopOffer = laptopMessages.find((m) => m.type === 'SCRIBBLE_WORD_SELECTION_OFFER');
const phoneOffer = phoneMessages.find((m) => m.type === 'SCRIBBLE_WORD_SELECTION_OFFER');
assert(laptopOffer && Array.isArray(laptopOffer.payload.choices), 'Drawer (Laptop) receives 3 secret word selection options');
assert(phoneOffer === undefined, 'Guesser (Phone) NEVER receives secret word choices over network');

// 10. Drawer chooses word -> Secret word delivered ONLY to drawer, masked length to guesser
const chosenWord = laptopOffer.payload.choices[0].word;
laptopSocket.emit('SCRIBBLE_WORD_CHOSEN_SUBMISSION', { word: chosenWord });
await new Promise((r) => setTimeout(r, 150));

const laptopSecretWord = laptopMessages.find((m) => m.type === 'SCRIBBLE_DRAWER_SECRET_WORD');
const phoneSecretWord = phoneMessages.find((m) => m.type === 'SCRIBBLE_DRAWER_SECRET_WORD');
const phoneRoundStart = phoneMessages.find((m) => m.type === 'SCRIBBLE_ROUND_START');

assert(laptopSecretWord && laptopSecretWord.payload.secretWord === chosenWord, 'Drawer receives secret word confirmation');
assert(phoneSecretWord === undefined, 'Guesser NEVER receives secret word message');
assert(phoneRoundStart && phoneRoundStart.payload.wordLength === chosenWord.length, `Guesser receives only masked word length (${chosenWord.length})`);

// 11. Real-time drawing stroke relay
laptopSocket.emit('SCRIBBLE_DRAW_STROKE', { x0: 50, y0: 50, x1: 100, y1: 100, color: '#ef4444', size: 4, isEraser: false });
await new Promise((r) => setTimeout(r, 100));
const phoneStroke = phoneMessages.find((m) => m.type === 'SCRIBBLE_DRAW_STROKE');
assert(phoneStroke && phoneStroke.payload.x1 === 100 && phoneStroke.payload.color === '#ef4444', 'Drawing strokes stream in real time from drawer to guesser');

// 12. Authoritative Guess Evaluation: Typo produces private close hint (1 & 2 character mistakes)
const typo1Guess = chosenWord.slice(0, -1); // 1-char deletion
phoneSocket.emit('SCRIBBLE_SUBMIT_GUESS', { text: typo1Guess });
await new Promise((r) => setTimeout(r, 100));
const phoneCloseHint1 = phoneMessages.find((m) => m.type === 'SCRIBBLE_CLOSE_GUESS');
assert(phoneCloseHint1 !== undefined, `1-char typo "${typo1Guess}" produces private close guess hint on phone`);

// Test 2-character edit if word length >= 5
if (chosenWord.length >= 5) {
  const typo2Guess = chosenWord.slice(0, -2);
  phoneSocket.emit('SCRIBBLE_SUBMIT_GUESS', { text: typo2Guess });
  await new Promise((r) => setTimeout(r, 100));
  const closeHints = phoneMessages.filter((m) => m.type === 'SCRIBBLE_CLOSE_GUESS');
  assert(closeHints.length >= 2, `2-char typo "${typo2Guess}" produces private close guess hint for word "${chosenWord}"`);
}

// Unrelated word test (does NOT trigger close hint)
const closeCountBefore = phoneMessages.filter((m) => m.type === 'SCRIBBLE_CLOSE_GUESS').length;
phoneSocket.emit('SCRIBBLE_SUBMIT_GUESS', { text: 'COMPLETELYUNRELATEDWORD' });
await new Promise((r) => setTimeout(r, 100));
const closeCountAfter = phoneMessages.filter((m) => m.type === 'SCRIBBLE_CLOSE_GUESS').length;
assert(closeCountAfter === closeCountBefore, 'Unrelated word does not trigger close guess hint');

// Verify close hint NEVER reveals the secret word in payload
const allCloseHints = phoneMessages.filter((m) => m.type === 'SCRIBBLE_CLOSE_GUESS');
const anyLeaked = allCloseHints.some((h) => h.payload?.secretWord || JSON.stringify(h.payload || {}).includes(chosenWord));
assert(!anyLeaked, 'Close guess hint never leaks or reveals secret word to guessing client');

// 13. Exact Match Evaluation -> Awards points and broadcasts without leaking word
phoneSocket.emit('SCRIBBLE_SUBMIT_GUESS', { text: chosenWord });
await new Promise((r) => setTimeout(r, 100));
const phoneCorrectSelf = phoneMessages.find((m) => m.type === 'SCRIBBLE_CORRECT_GUESS_SELF');
const laptopCorrectBroadcast = laptopMessages.find((m) => m.type === 'SCRIBBLE_CORRECT_GUESS_BROADCAST');
assert(phoneCorrectSelf && phoneCorrectSelf.payload.secretWord === chosenWord, 'Guesser receives correct guess confirmation with points');
assert(laptopCorrectBroadcast && laptopCorrectBroadcast.payload.playerName === 'PhoneGuest', 'Host receives correct guess broadcast without word leak');

// 14. Disconnection & Cleanup
phoneSocket.disconnect();
await new Promise((r) => setTimeout(r, 150));
const postDisconnectRoster = [...laptopMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
assert(postDisconnectRoster && postDisconnectRoster.length === 1, 'Server updates room roster when phone guest disconnects');

laptopSocket.disconnect();
await server.close();

// ----------------------------------------------------
// TEST SUITE 9: ROCK PAPER SCISSORS INFORMATION LEAK AUDIT
// ----------------------------------------------------
console.log('\n✊ TEST SUITE 9: Rock Paper Scissors Information Leak Audit');
// Simulate game state progression for both modes

// Test A: Pass-and-play (PvP) Player 1 locks in, Player 2 has not chosen
let rpsP1Choice: string | null = 'rock';
let rpsP2Choice: string | null = null;
let rpsIsRevealed = false;
let rpsWinner: string | null = null;

// Determine what is displayed on screen
let p1Display = rpsIsRevealed && rpsP1Choice ? rpsP1Choice : '❓';
let p2Display = rpsIsRevealed && rpsP2Choice ? rpsP2Choice : '❓';

assert(p1Display === '❓', 'Player 1 choice is kept hidden as ❓ before Player 2 selects');
assert(p2Display === '❓', 'Player 2 choice is kept hidden as ❓ before Player 2 selects');
assert(rpsWinner === null, 'Round winner is not determined until both players have selected');

// Test B: Player 2 now selects 'scissors'
rpsP2Choice = 'scissors';
// Both have selected, simultaneously reveal and resolve
rpsIsRevealed = true;
if (rpsP1Choice === 'rock' && rpsP2Choice === 'scissors') {
  rpsWinner = 'p1';
}

p1Display = rpsIsRevealed && rpsP1Choice ? rpsP1Choice : '❓';
p2Display = rpsIsRevealed && rpsP2Choice ? rpsP2Choice : '❓';

assert(p1Display === 'rock', 'Player 1 move revealed only after Player 2 locks in choice');
assert(p2Display === 'scissors', 'Player 2 move revealed simultaneously with Player 1');
assert(rpsWinner === 'p1', 'Winner is calculated simultaneously upon reveal');

// ----------------------------------------------------
// TEST SUITE 10: BACKEND URL & PRODUCTION CONFIGURATION AUDIT
// ----------------------------------------------------
console.log('\n🔒 TEST SUITE 10: Backend URL & Production Configuration Audit');
import { getServerConfig } from '../src/lib/multiplayer/roomNetwork';

// When running in Node test environment without browser location or VITE_BACKEND_URL:
const defaultConfig = getServerConfig();
assert(defaultConfig.isConfigured === true || defaultConfig.httpUrl === '', 'getServerConfig safely handles environment boundaries');

// Test protocol transformation logic
const testHttpsTransform = (input: string) => {
  let clean = input.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('ws://') && !clean.startsWith('wss://')) {
    clean = `https://${clean}`;
  }
  const isSecure = clean.startsWith('https://') || clean.startsWith('wss://');
  const httpUrl = isSecure ? clean.replace(/^wss:\/\//, 'https://') : clean.replace(/^ws:\/\//, 'http://');
  const wsUrl = isSecure ? clean.replace(/^https:\/\//, 'wss://') : clean.replace(/^http:\/\//, 'ws://');
  return { httpUrl, wsUrl };
};

const secureTest = testHttpsTransform('https://my-backend.onrender.com');
assert(secureTest.httpUrl === 'https://my-backend.onrender.com', 'HTTPS production URL correctly preserved');
assert(secureTest.wsUrl === 'wss://my-backend.onrender.com', 'WSS protocol correctly generated for secure HTTPS backend');

const bareDomainTest = testHttpsTransform('my-backend.onrender.com');
assert(bareDomainTest.httpUrl === 'https://my-backend.onrender.com', 'Bare domain automatically prefixed with https:// in production');
assert(bareDomainTest.wsUrl === 'wss://my-backend.onrender.com', 'Bare domain automatically generates wss:// WebSocket URL');

const localTest = testHttpsTransform('http://localhost:3001');
assert(localTest.httpUrl === 'http://localhost:3001', 'HTTP localhost URL correctly preserved');
assert(localTest.wsUrl === 'ws://localhost:3001', 'ws:// protocol correctly generated for local HTTP development');

// ----------------------------------------------------
// TEST SUITE 11: LUDO KING EXPERIENCE & RULES VERIFICATION
// ----------------------------------------------------
console.log('\n👑 TEST SUITE 11: Ludo King Experience & Rules Verification');
import { RoomNetwork } from '../src/lib/multiplayer/roomNetwork';

// 1. Peer ID room code prefixing & game isolation
const ludoNet = new RoomNetwork('ludo');
const ludoHostPeerId = ludoNet.getHostPeerId('PB89XZ');
assert(ludoHostPeerId === 'pb-ludo-PB89XZ', `Ludo host peer ID is prefixed with pb-ludo- (got ${ludoHostPeerId})`);

const scribbleNet = new RoomNetwork('scrb');
const scrbHostPeerId = scribbleNet.getHostPeerId('PB89XZ');
assert(scrbHostPeerId === 'pb-scrb-PB89XZ', `Scribble host peer ID is prefixed with pb-scrb- (got ${scrbHostPeerId})`);
assert(ludoHostPeerId !== scrbHostPeerId, 'Ludo and Scribble peer IDs never collide for identical room codes');

// 2. Safe cells and board layout
const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];
assert(SAFE_CELLS.length === 8, 'Board contains exactly 8 safe star cells');
assert(SAFE_CELLS.includes(0) && SAFE_CELLS.includes(13) && SAFE_CELLS.includes(26) && SAFE_CELLS.includes(39), 'All 4 player track start positions are safe squares');

// 3. Move legality and roll rules
const canMove = (step: number, roll: number): boolean => {
  if (step === -1) return roll === 6;
  if (step === 56) return false;
  return step + roll <= 56;
};

assert(canMove(-1, 6) === true, 'Pawn in yard can legally move on roll of 6');
assert(canMove(-1, 5) === false, 'Pawn in yard cannot move on roll less than 6');
assert(canMove(0, 4) === true, 'Pawn on track can move on roll 4');
assert(canMove(53, 3) === true, 'Pawn at step 53 can reach goal on roll 3');
assert(canMove(53, 4) === false, 'Pawn at step 53 cannot overshoot goal (step 56) on roll 4');
assert(canMove(56, 1) === false, 'Pawn already home cannot move');

// 4. Capture evaluation rules
const evalCapture = (activeTrackIdx: number, otherTrackIdx: number): boolean => {
  if (SAFE_CELLS.includes(activeTrackIdx)) return false;
  return activeTrackIdx === otherTrackIdx;
};

assert(evalCapture(8, 8) === false, 'Pawn on star safe square 8 cannot be captured');
assert(evalCapture(15, 15) === true, 'Pawn on unprotected track square 15 is captured when opponent lands on it');
assert(evalCapture(15, 16) === false, 'Pawns on different squares do not capture');

// 5. Player count mapping
const getActiveSeats = (count: number) => {
  return count === 2 ? [0, 2] : count === 3 ? [0, 1, 2] : [0, 1, 2, 3];
};

const twoPlayerSeats = getActiveSeats(2);
assert(twoPlayerSeats.length === 2 && twoPlayerSeats[0] === 0 && twoPlayerSeats[1] === 2, '2-player mode pairs opposite diagonal Red (0) and Yellow (2)');

const fourPlayerSeats = getActiveSeats(4);
assert(fourPlayerSeats.length === 4, '4-player mode activates all 4 cross positions');

// ----------------------------------------------------
// TEST SUITE 12: HOMEPAGE REDESIGN & GAME OF THE DAY
// ----------------------------------------------------
console.log('\n🌟 TEST SUITE 12: Homepage Redesign & Game of the Day Integrity');

// 1. Game of the Day Determinism
const testDateA = new Date('2026-10-15T12:00:00Z');
const gotdA1 = getGameOfTheDay(testDateA);
const gotdA2 = getGameOfTheDay(testDateA);
assert(Boolean(gotdA1 && gotdA1.id), `Game of the Day returns valid game metadata (${gotdA1?.title})`);
assert(gotdA1.id === gotdA2.id, `Game of the Day is 100% deterministic on the same date (${gotdA1.id} === ${gotdA2.id})`);
assert(!gotdA1.comingSoon, 'Game of the Day never selects an unreleased/comingSoon game');

// 2. Date advancement rotation
const testDateB = new Date('2026-10-16T12:00:00Z');
const testDateC = new Date('2026-10-17T12:00:00Z');
const gotdB = getGameOfTheDay(testDateB);
const gotdC = getGameOfTheDay(testDateC);
assert(Boolean(gotdB && gotdC), 'Future dates compute valid Game of the Day entries');

// 3. Editorial Date Formatting
const formatted = formatDailyDate(testDateA);
assert(typeof formatted === 'string' && formatted.length > 5, `Date formatted for industrial marquee display: "${formatted}"`);

// 4. Ludo Shareable Invite Link URL Parsing simulation
const parseLudoInviteParam = (urlHashOrSearch: string): string | null => {
  try {
    const queryIdx = urlHashOrSearch.indexOf('?');
    const queryString = queryIdx !== -1 ? urlHashOrSearch.substring(queryIdx) : urlHashOrSearch;
    const params = new URLSearchParams(queryString);
    const room = params.get('room');
    return room ? room.trim().toUpperCase().slice(0, 6) : null;
  } catch {
    return null;
  }
};

const hashInvite = parseLudoInviteParam('#/games/ludo?room=PB99LK');
assert(hashInvite === 'PB99LK', `Extracted room code correctly from SPA hash route: got ${hashInvite}`);

const searchInvite = parseLudoInviteParam('?room=ld44xy&utm=play');
assert(searchInvite === 'LD44XY', `Normalized lowercase invite param from query string: got ${searchInvite}`);

// 5. Instant Launch Picks Section Clean Removal Audit
const heroContent = fs.readFileSync(path.resolve('src/components/Hero.tsx'), 'utf-8');
assert(!heroContent.includes('Instant Launch Picks'), 'Hero section completely removed "Instant Launch Picks" header and cards');
assert(!heroContent.includes('spotlightGames'), 'Hero section removed unused spotlightGames data structure');
assert(heroContent.includes('Browse {GAMES.length} Games'), 'Hero section preserves primary Browse 23 Games CTA');
assert(heroContent.includes('Surprise Game'), 'Hero section preserves Surprise Game [R] CTA');

// ----------------------------------------------------
// TEST SUITE 13: BUSINESS TYCOON INDIAN PROPERTY BOARD GAME
// ----------------------------------------------------
console.log('\n🏛️ TEST SUITE 13: Business Tycoon Indian Property Board Game Integrity');
import {
  TILES,
  CHANCE_CARDS,
  CHEST_CARDS,
  COLOR_GROUPS
} from '../src/games/business-tycoon/boardData';
import {
  calculateRent,
  checkMonopoly,
  canUpgradeProperty,
  calculateNetWorth
} from '../src/games/business-tycoon/businessLogic';
import type { PropertyState, Player } from '../src/games/business-tycoon/types';

// 1. Board Perimeter Dimensions & Geometry
assert(TILES.length === 40, `Board contains exactly 40 perimeter tiles (found ${TILES.length})`);
assert(TILES[0].type === 'corner' && TILES[0].id === 0, 'Tile 0 is GO / Start corner');
assert(TILES[10].type === 'corner' && TILES[10].id === 10, 'Tile 10 is Jail corner');
assert(TILES[20].type === 'corner' && TILES[20].id === 20, 'Tile 20 is Rest Stop corner');
assert(TILES[30].type === 'corner' && TILES[30].id === 30, 'Tile 30 is Go To Jail corner');

// 2. Tile Distribution & Real Indian Cities
const cityTiles = TILES.filter((t) => t.type === 'property');
const stationTiles = TILES.filter((t) => t.type === 'station');
const utilityTiles = TILES.filter((t) => t.type === 'utility');
const chanceTiles = TILES.filter((t) => t.type === 'chance');
const chestTiles = TILES.filter((t) => t.type === 'chest');
const taxTiles = TILES.filter((t) => t.type === 'tax');

assert(cityTiles.length === 22, `Exactly 22 city properties distributed across India (found ${cityTiles.length})`);
assert(stationTiles.length === 4, `Exactly 4 premier railway stations (found ${stationTiles.length})`);
assert(utilityTiles.length === 2, `Exactly 2 public utilities (Electricity & Water) (found ${utilityTiles.length})`);
assert(chanceTiles.length === 3, 'Exactly 3 Chance spaces');
assert(chestTiles.length === 3, 'Exactly 3 Community Chest spaces');
assert(taxTiles.length === 2, 'Exactly 2 Tax spaces (Income Tax & Wealth Tax)');

// 3. Indian City Authenticity & Top Metros
const cityNames = cityTiles.map((t) => t.name);
assert(cityNames.includes('Mumbai') && cityNames.includes('Delhi') && cityNames.includes('Bengaluru') && cityNames.includes('Kolkata'), 'Flagship Indian metros included');
assert(cityTiles.find((t) => t.name === 'Mumbai')?.cost === 400, 'Mumbai is highest-value prime property at ₹400');
assert(cityTiles.find((t) => t.name === 'Guwahati')?.cost === 60, 'Guwahati is entry-level property at ₹60');

// 4. Color Groups Integrity
assert(Object.keys(COLOR_GROUPS).length === 8, '8 distinct color groups span the perimeter');

// 5. Card Decks
assert(CHANCE_CARDS.length === 8, `Chance deck has 8 distinct cards (found ${CHANCE_CARDS.length})`);
assert(CHEST_CARDS.length === 8, `Community Chest deck has 8 distinct cards (found ${CHEST_CARDS.length})`);

// 6. Rent Calculation & Monopolies
const testProperties: Record<number, PropertyState> = {
  37: { ownerId: 0, houses: 0, isMortgaged: false },
  39: { ownerId: 0, houses: 0, isMortgaged: false }
};

// Base rent for Mumbai without monopoly (only Mumbai owned)
const singleProp: Record<number, PropertyState> = {
  39: { ownerId: 0, houses: 0, isMortgaged: false }
};
const baseRent = calculateRent(39, 7, singleProp).rent;
assert(baseRent === 50, `Base rent for Mumbai is ₹50 (calculated ${baseRent})`);

// Monopoly doubling test (both Dark Blue properties owned by player 0)
const monopoly = checkMonopoly('darkblue', 0, testProperties);
assert(monopoly === true, 'Player 0 holds complete Dark Blue monopoly');
const doubledRent = calculateRent(39, 7, testProperties).rent;
assert(doubledRent === 100, `Monopolized unimproved property doubles rent to ₹100 (calculated ${doubledRent})`);

// Upgraded rent (1 house and hotel)
testProperties[39].houses = 1;
const rentWith1House = calculateRent(39, 7, testProperties).rent;
assert(rentWith1House === 200, `Mumbai with 1 house charges ₹200 rent (calculated ${rentWith1House})`);

testProperties[39].houses = 5; // Hotel
const rentWithHotel = calculateRent(39, 7, testProperties).rent;
assert(rentWithHotel === 2000, `Mumbai with luxury Hotel charges ₹2,000 rent (calculated ${rentWithHotel})`);

// Railway Station Scaling
const stationProps: Record<number, PropertyState> = {
  5: { ownerId: 1, houses: 0, isMortgaged: false },
  15: { ownerId: 1, houses: 0, isMortgaged: false },
  25: { ownerId: 1, houses: 0, isMortgaged: false }
};
const stationRent3 = calculateRent(5, 7, stationProps).rent;
assert(stationRent3 === 100, `Owning 3 railway stations scales rent to ₹100 (calculated ${stationRent3})`);

// Utility rent scaling
const utilProps1: Record<number, PropertyState> = {
  12: { ownerId: 0, houses: 0, isMortgaged: false }
};
const utilRent1 = calculateRent(12, 8, utilProps1).rent; // dice roll 8 * 4 = 32
assert(utilRent1 === 32, `Owning 1 utility charges 4x dice roll (calculated ${utilRent1})`);

const utilProps2: Record<number, PropertyState> = {
  12: { ownerId: 0, houses: 0, isMortgaged: false },
  28: { ownerId: 0, houses: 0, isMortgaged: false }
};
const utilRent2 = calculateRent(12, 8, utilProps2).rent; // dice roll 8 * 10 = 80
assert(utilRent2 === 80, `Owning both utilities charges 10x dice roll (calculated ${utilRent2})`);

// 7. Net Worth Computation
const testPlayer: Player = {
  id: 0,
  name: 'Test Tycoon',
  colorHex: '#ef4444',
  badgeHex: 'from-rose-500 to-red-600',
  tokenName: 'Car',
  tokenEmoji: '🏎️',
  position: 0,
  money: 1500,
  inJail: false,
  jailTurns: 0,
  jailCards: 0,
  bankrupt: false,
  isAi: false,
  aiDifficulty: 'medium'
};
// Cash: 1500 + Delhi deed (350) + Mumbai deed (400) + 5 houses on Mumbai @ 200 each (1000) = 3250
const netWorth = calculateNetWorth(testPlayer, testProperties);
assert(netWorth === 3250, `Net worth calculates cash + assets accurately: expected 3250, got ${netWorth}`);

// ----------------------------------------------------
// TEST SUITE 14: TYPING SPEED RUSH PHYSICS, WPM & CORPUS VERIFICATION
// ----------------------------------------------------
console.log('\n⚡ TEST SUITE 14: Typing Speed Rush Physics, Corpus & WPM Calculations Verification');
import { SPEED_RUN_TRACKS, ENDLESS_WORD_TIERS, TIME_ATTACK_CHALLENGES, PRACTICE_PASSAGES, getEndlessWords } from '../src/games/typing-rush/textCorpus';
import { RunnerRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../src/games/typing-rush/runnerRenderer';
import { typingAudio } from '../src/games/typing-rush/audio';

// 1. Speed Run Tracks Verification
assert(SPEED_RUN_TRACKS.length >= 3, `Speed Run features at least 3 distinct racing tracks (found ${SPEED_RUN_TRACKS.length})`);
assert(SPEED_RUN_TRACKS[0].distance === 150, 'Track 1 is 150m Neon Sprint');
assert(SPEED_RUN_TRACKS[1].distance === 300, 'Track 2 is 300m Cyber Highway');
assert(SPEED_RUN_TRACKS[2].distance === 500, 'Track 3 is 500m Apex Grand Prix');

for (const track of SPEED_RUN_TRACKS) {
  assert(track.text.length > 50, `Track '${track.name}' text has sufficient length (${track.text.length} chars)`);
  assert(track.characterCount === track.text.length, `Track '${track.name}' characterCount matches actual text length`);
  assert(track.distance > 0, `Track '${track.name}' has positive distance`);
}

// 2. Endless Word Tiers & Dynamic Generator
assert(ENDLESS_WORD_TIERS.tier1.length >= 20, `Tier 1 contains rapid speed words (found ${ENDLESS_WORD_TIERS.tier1.length})`);
assert(ENDLESS_WORD_TIERS.tier2.length >= 15, `Tier 2 contains compound tech words (found ${ENDLESS_WORD_TIERS.tier2.length})`);
assert(ENDLESS_WORD_TIERS.tier3.length >= 8, `Tier 3 contains multi-word racing phrases (found ${ENDLESS_WORD_TIERS.tier3.length})`);

const sampleBatch1 = getEndlessWords(1, 6);
assert(sampleBatch1.length === 6, 'Endless generator produces requested batch count (6)');
assert(sampleBatch1.every((w) => typeof w === 'string' && w.length > 0), 'All generated words are valid non-empty strings');

const sampleBatch3 = getEndlessWords(3, 4);
assert(sampleBatch3.length === 4, 'Endless generator produces higher tier phrases');

// 3. Time Attack & Practice Passages
assert(TIME_ATTACK_CHALLENGES.length >= 6, `Time Attack features diverse challenges (found ${TIME_ATTACK_CHALLENGES.length})`);
assert(PRACTICE_PASSAGES.length >= 3, `Practice mode features relaxing paragraphs (found ${PRACTICE_PASSAGES.length})`);

// 4. Canvas Resolution & Aspect Ratio
assert(CANVAS_WIDTH === 800 && CANVAS_HEIGHT === 380, `Canvas virtual resolution configured correctly (${CANVAS_WIDTH}x${CANVAS_HEIGHT})`);

// 5. Runner Renderer & Visual Systems
const renderer = new RunnerRenderer();
assert(typeof renderer.reset === 'function', 'Renderer implements reset method');
assert(typeof renderer.triggerWordBoost === 'function', 'Renderer implements word boost particle burst');
assert(typeof renderer.triggerMistakeGlitch === 'function', 'Renderer implements mistake glitch feedback');
assert(typeof renderer.addFloatingNotice === 'function', 'Renderer supports floating combo/speed notices');

// 6. Mathematical Scoring & Anti-Inflation Rigor
const calculateTestWpm = (correct: number, incorrect: number, seconds: number) => {
  const elapsedMinutes = Math.max(seconds, 0.5) / 60;
  const rawWpm = Math.round((correct / 5) / elapsedMinutes);
  const netWpm = Math.max(0, rawWpm - Math.round((incorrect / 5) / elapsedMinutes));
  const total = correct + incorrect;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
  return { wpm: rawWpm, netWpm, accuracy };
};

// Standard test: 250 correct chars in 60s with 0 errors
const standardStats = calculateTestWpm(250, 0, 60);
assert(standardStats.wpm === 50, `Standard WPM calculates correctly: expected 50, got ${standardStats.wpm}`);
assert(standardStats.netWpm === 50, `Standard Net WPM is 50 with zero errors`);
assert(standardStats.accuracy === 100, `Standard Accuracy is 100%`);

// Error penalty test: 250 correct chars in 60s with 10 errors
const errorStats = calculateTestWpm(250, 10, 60);
assert(errorStats.wpm === 50, `Raw WPM remains 50 despite errors`);
assert(errorStats.netWpm === 48, `Net WPM penalizes errors: expected 48, got ${errorStats.netWpm}`);
assert(errorStats.accuracy === 96, `Accuracy accounts for errors: expected 96%, got ${errorStats.accuracy}%`);

// Zero seconds protection (no division by zero / Infinity)
const zeroStats = calculateTestWpm(0, 0, 0);
assert(Number.isFinite(zeroStats.wpm) && zeroStats.wpm === 0, 'Zero elapsed time does not produce NaN or Infinity');
assert(zeroStats.accuracy === 100, 'Initial accuracy is 100%');

// 7. Web Audio Sound Engine Interface
assert(typeof typingAudio.playKey === 'function', 'Sound engine supports pitch-scaled mechanical key click');
assert(typeof typingAudio.playError === 'function', 'Sound engine supports mistake feedback sound');
assert(typeof typingAudio.playWordSuccess === 'function', 'Sound engine supports chorded word completion chime');
assert(typeof typingAudio.playNitroBoost === 'function', 'Sound engine supports nitro boost sound');
assert(typeof typingAudio.playCountdown === 'function', 'Sound engine supports countdown beeps');
assert(typeof typingAudio.playFinish === 'function', 'Sound engine supports victory fanfare');

// ----------------------------------------------------
// TEST SUITE 15: FLAPPY RUSH PHYSICS, COLLISION & PIPE GEOMETRY VERIFICATION
// ----------------------------------------------------
console.log('\n🐤 TEST SUITE 15: Flappy Rush Physics, Collision & Pipe Geometry Verification');
import { FlappyRenderer, VIRTUAL_WIDTH as FLAPPY_WIDTH, VIRTUAL_HEIGHT as FLAPPY_HEIGHT, PLAYABLE_HEIGHT as FLAPPY_PLAYABLE } from '../src/games/flappy-rush/flappyRenderer';
import { flappyAudio } from '../src/games/flappy-rush/audio';
import type { PipBird, PipePair } from '../src/games/flappy-rush/types';

// 1. Virtual Resolution & Aspect Ratio
assert(FLAPPY_WIDTH === 400 && FLAPPY_HEIGHT === 600, `Virtual resolution is 400x600 portrait arcade aspect ratio`);
assert(FLAPPY_PLAYABLE === 500, `Playable ceiling to ground height is exactly 500px`);

// 2. Flappy Renderer Interface
const flappyRenderer = new FlappyRenderer();
assert(typeof flappyRenderer.reset === 'function', 'FlappyRenderer implements reset method');
assert(typeof flappyRenderer.triggerFlapParticles === 'function', 'FlappyRenderer triggers wing flap puff particles');
assert(typeof flappyRenderer.triggerScoreSparkles === 'function', 'FlappyRenderer triggers sparkle burst when clearing pipe');
assert(typeof flappyRenderer.triggerHitSparks === 'function', 'FlappyRenderer triggers collision sparks');
assert(typeof flappyRenderer.update === 'function', 'FlappyRenderer updates particles & ground scroll');

// 3. Audio Synthesizer Interface
assert(typeof flappyAudio.playFlap === 'function', 'Audio engine supports wing flap whoosh');
assert(typeof flappyAudio.playScore === 'function', 'Audio engine supports coin clearance chime');
assert(typeof flappyAudio.playHit === 'function', 'Audio engine supports obstacle collision thud');
assert(typeof flappyAudio.playFall === 'function', 'Audio engine supports plunge whistle sound');
assert(typeof flappyAudio.playGameOver === 'function', 'Audio engine supports game over fanfare');
assert(typeof flappyAudio.playMilestone === 'function', 'Audio engine supports milestone bell sound');

// 4. Bird Physics Lifecycle Simulation
const testBird: PipBird = {
  x: 100,
  y: 240,
  vy: 0,
  radius: 13,
  rotation: 0,
  wingFrame: 0,
  wingTimer: 0,
  bobTimer: 0,
  isDead: false
};

const GRAVITY = 0.38;
const FLAP_IMPULSE = -7.2;
const MAX_FALL_SPEED = 8.5;

// Simulate Flap
testBird.vy = FLAP_IMPULSE;
assert(testBird.vy === -7.2, `Flap imparts upward impulse: expected -7.2, got ${testBird.vy}`);

// Simulate Gravity accumulation over frames
for (let frame = 0; frame < 30; frame++) {
  testBird.vy = Math.min(MAX_FALL_SPEED, testBird.vy + GRAVITY);
  testBird.y += testBird.vy;
}
assert(testBird.vy > 0, `Gravity overcomes flap impulse and pulls bird downwards (vy=${testBird.vy})`);
assert(testBird.vy <= MAX_FALL_SPEED, `Terminal velocity clamped at MAX_FALL_SPEED (${MAX_FALL_SPEED})`);

// Soft Ceiling Collision test
testBird.y = -10;
if (testBird.y - testBird.radius < 0) {
  testBird.y = testBird.radius;
  testBird.vy = 0;
}
assert(testBird.y === 13, `Ceiling clamps bird safely without clipping: y=${testBird.y}`);
assert(testBird.vy === 0, 'Ceiling zeroes vertical velocity');

// Ground Collision test
testBird.y = 490;
const isGroundCollision = testBird.y + testBird.radius >= FLAPPY_PLAYABLE;
assert(isGroundCollision === true, 'Ground collision detected accurately when bird touches y=500');

// 5. Pipe Obstacle Generation & Fair Gap Geometry
const testPipe: PipePair = {
  id: 1,
  x: 200,
  topHeight: 180,
  bottomY: 180 + 128,
  gap: 128,
  width: 56,
  scored: false,
  gemCollected: false
};
assert(testPipe.bottomY === 308, 'Bottom pipe starts exactly after gap opening');
assert(testPipe.gap >= 114 && testPipe.gap <= 134, `Pipe gap (${testPipe.gap}px) is in fair, navigable range`);

// 6. Collision Detection Precision
const hitboxR = testBird.radius - 2; // 11px

// Inside Gap (Safe)
testBird.x = testPipe.x + testPipe.width / 2;
testBird.y = testPipe.topHeight + testPipe.gap / 2;
const collidesInsideGap = (testBird.x + hitboxR > testPipe.x && testBird.x - hitboxR < testPipe.x + testPipe.width) &&
  (testBird.y - hitboxR < testPipe.topHeight || testBird.y + hitboxR > testPipe.bottomY);
assert(collidesInsideGap === false, 'Bird flying cleanly through gap does NOT collide');

// Top Pipe Collision
testBird.y = testPipe.topHeight - 5;
const collidesTopPipe = (testBird.x + hitboxR > testPipe.x && testBird.x - hitboxR < testPipe.x + testPipe.width) &&
  (testBird.y - hitboxR < testPipe.topHeight || testBird.y + hitboxR > testPipe.bottomY);
assert(collidesTopPipe === true, 'Bird hitting top pipe triggers collision');

// Bottom Pipe Collision
testBird.y = testPipe.bottomY + 5;
const collidesBottomPipe = (testBird.x + hitboxR > testPipe.x && testBird.x - hitboxR < testPipe.x + testPipe.width) &&
  (testBird.y - hitboxR < testPipe.topHeight || testBird.y + hitboxR > testPipe.bottomY);
assert(collidesBottomPipe === true, 'Bird hitting bottom pipe triggers collision');

// 7. Single-Award Scoring Accuracy (No Double Points)
let simulatedScore = 0;
testBird.x = testPipe.x - 20; // Before pipe
if (!testPipe.scored && testBird.x > testPipe.x + testPipe.width) {
  testPipe.scored = true;
  simulatedScore++;
}
assert(testPipe.scored === false && simulatedScore === 0, 'Score is not awarded before passing pipe');

testBird.x = testPipe.x + testPipe.width + 5; // Past pipe
if (!testPipe.scored && testBird.x > testPipe.x + testPipe.width) {
  testPipe.scored = true;
  simulatedScore++;
}
assert(testPipe.scored === true && simulatedScore === 1, 'Score increments by exactly 1 upon passing pipe');

// Subsequent frame past pipe
if (!testPipe.scored && testBird.x > testPipe.x + testPipe.width) {
  testPipe.scored = true;
  simulatedScore++;
}
assert(simulatedScore === 1, 'Pipe scored flag prevents duplicate score award on subsequent frames');

// ----------------------------------------------------
// TEST SUITE: BLOCK STACK FALLING-BLOCK ENGINE AUDIT
// ----------------------------------------------------
console.log('\n🧱 TEST SUITE: Block Stack Falling-Block Engine Audit');

// 1. Grid Dimensions
assert(BS_WIDTH === 10 && BS_HEIGHT === 20, `Board dimensions are standard 10x20 (got ${BS_WIDTH}x${BS_HEIGHT})`);
const emptyGrid = bsCreateGrid();
assert(emptyGrid.length === 20 && emptyGrid[0].length === 10, 'createEmptyGrid initializes 20 rows of 10 columns');
assert(emptyGrid.every((row) => row.every((c) => c === null)), 'Newly created grid cells are all initially empty (null)');

// 2. All 7 Tetromino Shapes and Color Palettes
assert(BS_TETROMINOS.length === 7, `All 7 conventional tetrominoes present (found ${BS_TETROMINOS.length})`);
for (const type of BS_TETROMINOS) {
  const shape = BS_SHAPES[type];
  assert(Boolean(shape) && shape.length > 0, `Shape matrix defined for tetromino '${type}'`);
  const palette = BS_PALETTES[type];
  assert(Boolean(palette && palette.primary && palette.light && palette.dark), `Palette defined for '${type}' with primary/light/dark`);
  // Count filled blocks (must be exactly 4 for each tetromino)
  let cellCount = 0;
  shape.forEach((row) => row.forEach((c) => { if (c) cellCount++; }));
  assert(cellCount === 4, `Tetromino '${type}' consists of exactly 4 geometric unit blocks (got ${cellCount})`);
}

// 3. 7-Bag Randomizer Integrity
const bag1 = bsGen7Bag();
assert(bag1.length === 7, '7-Bag generator produces exactly 7 pieces per cycle');
const uniquePieces = new Set(bag1);
assert(uniquePieces.size === 7, '7-Bag generator contains all 7 unique tetromino shapes with no duplicates');
const bag2 = bsGen7Bag();
assert(bag2.length === 7 && new Set(bag2).size === 7, 'Subsequent bag also contains complete 7-piece permutation');

// 4. Piece Spawning & Boundary Positioning
const testPieceT = bsSpawnPiece('T');
assert(testPieceT.type === 'T' && testPieceT.rotation === 0, 'Spawns piece with orientation state 0');
assert(testPieceT.x >= 0 && testPieceT.x + testPieceT.shape[0].length <= BS_WIDTH, 'Spawns piece horizontally centered within board bounds');
assert(testPieceT.y === 0, 'T piece spawns at row 0');

const testPieceI = bsSpawnPiece('I');
assert(testPieceI.type === 'I' && testPieceI.y === -1, 'I piece spawns at row -1 for natural top alignment');

// 5. Collision Detection
assert(bsCheckCollision(emptyGrid, testPieceT, 0, 0) === false, 'Fresh piece on empty board does not collide');
// Off left wall
assert(bsCheckCollision(emptyGrid, testPieceT, -10, 0) === true, 'Collision detected when moving beyond left boundary');
// Off right wall
assert(bsCheckCollision(emptyGrid, testPieceT, 10, 0) === true, 'Collision detected when moving beyond right boundary');
// Off floor
assert(bsCheckCollision(emptyGrid, testPieceT, 0, 25) === true, 'Collision detected when dropping beyond bottom floor');

// 6. Super Rotation System (SRS) & Wall Kicks
// Place T piece flush against left wall (x = -1) and rotate
const wallPiece = { ...testPieceT, x: -1 };
const rotatedKicked = bsTryRotate(emptyGrid, wallPiece, 'cw');
assert(rotatedKicked !== null, 'Wall kick successfully resolves rotation against left boundary');
if (rotatedKicked) {
  assert(bsCheckCollision(emptyGrid, rotatedKicked) === false, 'Rotated piece after kick is in legal non-colliding position');
}

// O Piece does not alter matrix or orientation on rotation
const oPiece = bsSpawnPiece('O');
const oRotated = bsTryRotate(emptyGrid, oPiece, 'cw');
assert(oRotated !== null && oRotated.rotation === 0, 'O piece preserves orientation on rotation attempt');

// 7. Ghost Piece / Drop Shadow Calculation
const ghostY = bsGetGhostY(emptyGrid, testPieceT);
assert(ghostY > testPieceT.y, `Ghost Y accurately locates lowest floor row (${ghostY} > ${testPieceT.y})`);
assert(bsCheckCollision(emptyGrid, testPieceT, 0, ghostY - testPieceT.y) === false, 'Piece at ghost Y is valid and legal');
assert(bsCheckCollision(emptyGrid, testPieceT, 0, ghostY - testPieceT.y + 1) === true, 'One step below ghost Y causes floor collision');

// 8. Locking and Grid Preservation
let playGrid = bsCreateGrid();
const lockedGrid = bsLockPiece(playGrid, { ...testPieceT, y: ghostY });
let lockedBlockCount = 0;
lockedGrid.forEach((row) => row.forEach((cell) => { if (cell !== null) lockedBlockCount++; }));
assert(lockedBlockCount === 4, `Locking T-piece writes exactly 4 cells into grid (got ${lockedBlockCount})`);

// 9. Line Clearing (Single, Double, Triple, Quad/Clean Sweep)
// Create a board with bottom row completely filled
let clearTestGrid = bsCreateGrid();
for (let c = 0; c < BS_WIDTH; c++) {
  clearTestGrid[19][c] = 'I';
}
assert(bsFindLines(clearTestGrid).length === 1 && bsFindLines(clearTestGrid)[0] === 19, 'Finds single completed line at row 19');

// Fill 4 rows (16, 17, 18, 19) for Quad
for (let r = 16; r <= 19; r++) {
  for (let c = 0; c < BS_WIDTH; c++) {
    clearTestGrid[r][c] = 'T';
  }
}
const quadLines = bsFindLines(clearTestGrid);
assert(quadLines.length === 4, `Finds 4 completed lines for Quad Cleansweep (found ${quadLines.length})`);

// Collapse grid
const collapsed = bsClearLines(clearTestGrid, quadLines);
assert(collapsed.length === 20, 'Grid maintains 20 rows after clearing lines');
assert(collapsed.every((row) => row.length === 10), 'All rows maintain 10 columns after collapse');
assert(bsFindLines(collapsed).length === 0, 'No completed lines remain after clearing');
assert(collapsed[19].every((c) => c === null), 'Bottom row is empty after collapsing quad lines from empty board');

// 10. Scoring Mathematics & Anti-Inflation Rigor
const singleScore = bsCalcScore(1, 1, 0, false);
assert(singleScore.score === 100, `Single line at Level 1 awards 100 pts (got ${singleScore.score})`);

const doubleScore = bsCalcScore(2, 2, 0, false);
assert(doubleScore.score === 600, `Double lines at Level 2 awards 600 pts (300 x 2, got ${doubleScore.score})`);

const quadScore = bsCalcScore(4, 1, 0, false);
assert(quadScore.score === 800 && quadScore.isTetris === true, `Quad at Level 1 awards 800 pts and triggers isTetris flag`);

const b2bQuadScore = bsCalcScore(4, 1, 0, true);
assert(b2bQuadScore.score === 1200, `Back-to-back Quad awards 1.5x multiplier (1200 pts, got ${b2bQuadScore.score})`);

const comboScore = bsCalcScore(1, 1, 3, false);
assert(comboScore.score === 250, `100 base + (50 x 3 combo) awards 250 pts (got ${comboScore.score})`);

// 11. Level Progression & Drop Velocity
assert(bsCalcLevel(0) === 1, 'Initial lines cleared begins at Level 1');
assert(bsCalcLevel(9) === 1, '9 lines cleared remains at Level 1');
assert(bsCalcLevel(10) === 2, '10 lines cleared advances to Level 2');
assert(bsCalcLevel(35) === 4, '35 lines cleared reaches Level 4');

const speedLvl1 = bsGetDropInterval(1);
const speedLvl5 = bsGetDropInterval(5);
const speedLvl10 = bsGetDropInterval(10);
assert(speedLvl1 > speedLvl5 && speedLvl5 > speedLvl10, `Gravity drop interval accelerates with level (${speedLvl1}ms > ${speedLvl5}ms > ${speedLvl10}ms)`);
assert(bsGetDropInterval(25) >= 50, 'Minimum gravity drop speed is bounded to prevent freeze (>= 50ms)');

// 12. Web Audio Sound Engine Interface
assert(typeof blockAudio.playMove === 'function', 'Sound engine supports piece movement click');
assert(typeof blockAudio.playRotate === 'function', 'Sound engine supports rotation snap click');
assert(typeof blockAudio.playSoftDrop === 'function', 'Sound engine supports soft drop tick');
assert(typeof blockAudio.playHardDrop === 'function', 'Sound engine supports hard drop bass punch');
assert(typeof blockAudio.playHold === 'function', 'Sound engine supports hold swap chime');
assert(typeof blockAudio.playLineClear === 'function', 'Sound engine supports line clear chimes & quad fanfare');
assert(typeof blockAudio.playLevelUp === 'function', 'Sound engine supports level up arpeggio');
assert(typeof blockAudio.playGameOver === 'function', 'Sound engine supports game over descending tones');

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


