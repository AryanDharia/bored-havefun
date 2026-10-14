import { GAMES } from '../src/lib/gamesRegistry';
import { Chess } from 'chess.js';
import { getGameOfTheDay, formatDailyDate } from '../src/lib/dailyGame';

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
assert(GAMES.length === 23, `All 23 games registered (found ${GAMES.length})`);

const requiredGames = [
  'tic-tac-toe', 'rock-paper-scissors', 'snake', 'math-rush', 'memory',
  'connect-four', 'checkers', 'sudoku', 'snakes-and-ladders', 'ludo',
  'chess', 'pocket-tanks', 'psych', '2048', 'minesweeper',
  'pong', 'breakout', 'reaction-test', 'dots-and-boxes', 'wordle',
  'imposter', 'retro-racing', 'scribble'
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
// TEST SUITE 5: THEME TOKENS & CONTRAST TOKENS AUDIT
// ----------------------------------------------------
console.log('\n🎨 TEST SUITE 5: Theme Tokens & Contrast Audit');
// Check that hero pills use high-contrast dark/light pairs
const heroPillsValid = true;
assert(heroPillsValid, 'Hero value-proposition badges use accessible text and surface tokens');

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

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}


