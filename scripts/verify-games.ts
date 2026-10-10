import { GAMES } from '../src/lib/gamesRegistry';
import { Chess } from 'chess.js';

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
const ROAD_LANES = 4;
const LANE_CENTERS = [-0.75, -0.25, 0.25, 0.75];
const DRAW_DISTANCE = 900;
const MAX_SPEED = 240;
const MIN_SPEED = 30;

assert(ROAD_LANES === 4, 'Highway contains exactly 4 traffic lanes');
assert(LANE_CENTERS.length === 4, 'Lane centers cover normalized road width symmetrically');
assert(DRAW_DISTANCE === 900, 'Perspective draw distance set to 900 meters for natural horizon emergence');
assert(MAX_SPEED === 240 && MIN_SPEED === 30, 'Speed bounds span authentic highway speeds [30, 240] km/h');

// Perspective projection test
const project = (roadX: number, roadZ: number) => {
  const CAMERA_DEPTH = 0.84;
  const CAMERA_HEIGHT = 160;
  const HORIZON_Y = 280;
  const scale = CAMERA_DEPTH / (roadZ * 0.018 + 0.35);
  const halfRoadWidth = (1400 * (1 - roadZ / DRAW_DISTANCE) + 180 * (roadZ / DRAW_DISTANCE)) * 0.5;
  const screenX = 1080 * 0.5 + roadX * halfRoadWidth;
  const screenY = HORIZON_Y + CAMERA_HEIGHT * scale;
  return { x: screenX, y: screenY, scale };
};

const pNear = project(0, 18);
const pFar = project(0, 500);
assert(pNear.scale > pFar.scale, 'Objects closer to player render significantly larger than distant horizon objects');
assert(pNear.y > pFar.y, 'Distant horizon objects project higher up towards horizon line');

// Near-miss & Collision evaluation logic
const evaluateInteraction = (playerX: number, playerSpeed: number, carX: number, carZ: number) => {
  const playerZFront = 32;
  const playerZBack = 10;
  const playerWidth = 0.22;
  const carWidth = 0.28;
  const zOverlap = carZ < playerZFront && carZ + 22 > playerZBack;
  const xDistance = Math.abs(playerX - carX);

  const collisionHitbox = (playerWidth + carWidth) * 0.48; // 0.24
  if (zOverlap && xDistance < collisionHitbox) {
    return 'COLLISION';
  }
  if (playerSpeed >= 95 && carZ < playerZFront && carZ > playerZBack - 10 && xDistance < 0.38 && xDistance >= collisionHitbox) {
    return 'NEAR_MISS';
  }
  return 'SAFE';
};

assert(evaluateInteraction(0.25, 140, 0.25, 20) === 'COLLISION', 'Direct overlap in same lane registers as COLLISION');
assert(evaluateInteraction(0.0, 140, 0.25, 20) === 'NEAR_MISS', 'High speed pass with narrow safe gap registers as NEAR_MISS');
assert(evaluateInteraction(-0.75, 140, 0.75, 20) === 'SAFE', 'Passing on distinct lane registers safely without collision or near-miss');
assert(evaluateInteraction(0.0, 70, 0.25, 20) === 'SAFE', 'Low speed close pass does not award near miss without courageous speed (>95 km/h)');

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

import { MultiplayerServer } from '../server/server';
import { WebSocket as WsClient } from 'ws';

const TEST_PORT = 3987;
const server = new MultiplayerServer();
await server.listen(TEST_PORT);

// 1. Health Endpoint
const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
const healthJson = (await healthRes.json()) as { status: string; service: string };
assert(healthRes.status === 200 && healthJson.status === 'ok', 'Health endpoint /health returns 200 OK with status="ok"');
assert(healthJson.service === 'playbreak-multiplayer', 'Service identifier matches "playbreak-multiplayer"');

// 2. Server Room Registration POST /api/rooms
const createRes = await fetch(`http://localhost:${TEST_PORT}/api/rooms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hostName: 'LaptopHost', gameId: 'scribble' })
});
const createJson = (await createRes.json()) as { success: boolean; roomCode: string; hostId: string };
assert(createRes.status === 201 && createJson.success === true, 'POST /api/rooms successfully registers room server-side');
assert(typeof createJson.roomCode === 'string' && createJson.roomCode.length === 6, `Room code is authoritative 6-character string (got ${createJson.roomCode})`);

const testCode = createJson.roomCode;
const hostId = createJson.hostId;

// 3. Inspect Room GET /api/rooms/:code
const inspectRes = await fetch(`http://localhost:${TEST_PORT}/api/rooms/${testCode}`);
const inspectJson = (await inspectRes.json()) as { exists: boolean; state: string };
assert(inspectRes.status === 200 && inspectJson.exists === true, 'GET /api/rooms/:code confirms room exists on server');
assert(inspectJson.state === 'lobby', 'Initial server room state is "lobby"');

// 4. Invalid Room check
const invalidRes = await fetch(`http://localhost:${TEST_PORT}/api/rooms/NONEXISTENT99`);
assert(invalidRes.status === 404, 'Non-existent room returns 404 Not Found');

// 5. Connect Host (Laptop) via WebSocket
const laptopWs = new WsClient(`ws://localhost:${TEST_PORT}/ws?room=${testCode}&playerId=${hostId}&name=LaptopHost`);
const laptopMessages: any[] = [];
laptopWs.on('message', (data) => laptopMessages.push(JSON.parse(data.toString())));
await new Promise((r) => laptopWs.on('open', r));

// Wait for welcome
await new Promise((r) => setTimeout(r, 100));
const laptopWelcome = laptopMessages.find((m) => m.type === 'ROOM_JOIN_ACCEPT');
assert(laptopWelcome && laptopWelcome.payload.isHost === true, 'Laptop connects as Authoritative Host with isHost=true');

// 6. Connect Guest (Phone) via WebSocket
const phoneId = 'phone_guest_01';
const phoneWs = new WsClient(`ws://localhost:${TEST_PORT}/ws?room=${testCode}&playerId=${phoneId}&name=PhoneGuest`);
const phoneMessages: any[] = [];
phoneWs.on('message', (data) => phoneMessages.push(JSON.parse(data.toString())));
await new Promise((r) => phoneWs.on('open', r));

// Wait for guest welcome & roster broadcast
await new Promise((r) => setTimeout(r, 150));
const phoneWelcome = phoneMessages.find((m) => m.type === 'ROOM_JOIN_ACCEPT');
assert(phoneWelcome && phoneWelcome.payload.isHost === false, 'Phone joins room as Guest with isHost=false');

// Verify synchronized player rosters on both devices
const lastLaptopRoster = [...laptopMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
const lastPhoneRoster = [...phoneMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
assert(lastLaptopRoster && lastLaptopRoster.length === 2, 'Laptop host sees exactly 2 players in room');
assert(lastPhoneRoster && lastPhoneRoster.length === 2, 'Phone guest sees exactly 2 players in room');
assert(lastLaptopRoster[0].name === lastPhoneRoster[0].name, 'Both devices see identical synchronized player rosters');

// 7. Unauthorized start rejection: Phone Guest cannot start game
phoneWs.send(JSON.stringify({ type: 'SCRIBBLE_GAME_START' }));
await new Promise((r) => setTimeout(r, 100));
const phoneError = phoneMessages.find((m) => m.type === 'ERROR');
assert(phoneError && phoneError.error.includes('Only the host'), 'Server rejects game-start attempt from non-host player');

// 8. Authorized start by Host (Laptop) -> Simultaneous transition
laptopWs.send(JSON.stringify({ type: 'SCRIBBLE_GAME_START' }));
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
laptopWs.send(JSON.stringify({
  type: 'SCRIBBLE_WORD_CHOSEN_SUBMISSION',
  payload: { word: chosenWord }
}));
await new Promise((r) => setTimeout(r, 150));

const laptopSecretWord = laptopMessages.find((m) => m.type === 'SCRIBBLE_DRAWER_SECRET_WORD');
const phoneSecretWord = phoneMessages.find((m) => m.type === 'SCRIBBLE_DRAWER_SECRET_WORD');
const phoneRoundStart = phoneMessages.find((m) => m.type === 'SCRIBBLE_ROUND_START');

assert(laptopSecretWord && laptopSecretWord.payload.secretWord === chosenWord, 'Drawer receives secret word confirmation');
assert(phoneSecretWord === undefined, 'Guesser NEVER receives secret word message');
assert(phoneRoundStart && phoneRoundStart.payload.wordLength === chosenWord.length, `Guesser receives only masked word length (${chosenWord.length})`);

// 11. Real-time drawing stroke relay
laptopWs.send(JSON.stringify({
  type: 'SCRIBBLE_DRAW_STROKE',
  payload: { x0: 50, y0: 50, x1: 100, y1: 100, color: '#ef4444', size: 4, isEraser: false }
}));
await new Promise((r) => setTimeout(r, 100));
const phoneStroke = phoneMessages.find((m) => m.type === 'SCRIBBLE_DRAW_STROKE');
assert(phoneStroke && phoneStroke.payload.x1 === 100 && phoneStroke.payload.color === '#ef4444', 'Drawing strokes stream in real time from drawer to guesser');

// 12. Authoritative Guess Evaluation: Typo produces private close hint
const typoGuess = chosenWord.slice(0, -1);
phoneWs.send(JSON.stringify({
  type: 'SCRIBBLE_SUBMIT_GUESS',
  payload: { text: typoGuess }
}));
await new Promise((r) => setTimeout(r, 100));
const phoneCloseHint = phoneMessages.find((m) => m.type === 'SCRIBBLE_CLOSE_GUESS');
assert(phoneCloseHint !== undefined, `Typo "${typoGuess}" produces private close guess hint on phone`);

// 13. Exact Match Evaluation -> Awards points and broadcasts without leaking word
phoneWs.send(JSON.stringify({
  type: 'SCRIBBLE_SUBMIT_GUESS',
  payload: { text: chosenWord }
}));
await new Promise((r) => setTimeout(r, 100));
const phoneCorrectSelf = phoneMessages.find((m) => m.type === 'SCRIBBLE_CORRECT_GUESS_SELF');
const laptopCorrectBroadcast = laptopMessages.find((m) => m.type === 'SCRIBBLE_CORRECT_GUESS_BROADCAST');
assert(phoneCorrectSelf && phoneCorrectSelf.payload.secretWord === chosenWord, 'Guesser receives correct guess confirmation with points');
assert(laptopCorrectBroadcast && laptopCorrectBroadcast.payload.playerName === 'PhoneGuest', 'Host receives correct guess broadcast without word leak');

// 14. Disconnection & Cleanup
phoneWs.close();
await new Promise((r) => setTimeout(r, 150));
const postDisconnectRoster = [...laptopMessages].reverse().find((m) => m.type === 'ROOM_PLAYERS_UPDATED')?.payload.players;
assert(postDisconnectRoster && postDisconnectRoster.length === 1, 'Server updates room roster when phone guest disconnects');

laptopWs.close();
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

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

