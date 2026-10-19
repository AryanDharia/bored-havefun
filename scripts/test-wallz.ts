import {
  getInitialState,
  getLegalPawnMoves,
  validateWallPlacement,
  applyAction,
  undoAction,
  findShortestPath,
  checkWallCollision,
  areCellsEqual
} from '../src/games/wallz/gameEngine';
import { getAIMove } from '../src/games/wallz/ai';
import type { GameState, Wall } from '../src/games/wallz/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧱 WALLZ: STRATEGY ARENA ENGINE & AI TEST AUDIT');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: INITIAL STATE & LEGAL MOVES
// ----------------------------------------------------
console.log('📍 TEST SUITE 1: Initial Board State & Legal Pawn Moves');
const s0 = getInitialState('pass-and-play', 'medium', 1);
assert(s0.p1.r === 8 && s0.p1.c === 4, 'P1 starts at (8, 4)');
assert(s0.p2.r === 0 && s0.p2.c === 4, 'P2 starts at (0, 4)');
assert(s0.p1WallsLeft === 10, 'P1 starts with 10 walls');
assert(s0.p2WallsLeft === 10, 'P2 starts with 10 walls');
assert(s0.currentTurn === 1, 'Player 1 moves first');
assert(s0.winner === null, 'No winner at start');

const p1InitialMoves = getLegalPawnMoves(s0, 1);
assert(p1InitialMoves.length === 3, 'P1 has 3 opening moves from bottom edge (up, left, right)');
assert(
  p1InitialMoves.some((m) => m.r === 7 && m.c === 4) &&
    p1InitialMoves.some((m) => m.r === 8 && m.c === 3) &&
    p1InitialMoves.some((m) => m.r === 8 && m.c === 5),
  'P1 moves are (7, 4), (8, 3), (8, 5)'
);

// ----------------------------------------------------
// TEST 2: BASIC STEPPING & TURN SWITCHING
// ----------------------------------------------------
console.log('\n👣 TEST SUITE 2: Pawn Step Execution & Turn Alternation');
const s1 = applyAction(s0, {
  type: 'move',
  player: 1,
  from: s0.p1,
  to: { r: 7, c: 4 }
});
assert(s1.p1.r === 7 && s1.p1.c === 4, 'P1 advances to (7, 4)');
assert(s1.currentTurn === 2, 'Turn switches to Player 2');
assert(s1.moveHistory.length === 1, 'Move history tracks action');

const s2 = applyAction(s1, {
  type: 'move',
  player: 2,
  from: s1.p2,
  to: { r: 1, c: 4 }
});
assert(s2.p2.r === 1 && s2.p2.c === 4, 'P2 advances to (1, 4)');
assert(s2.currentTurn === 1, 'Turn switches back to Player 1');

// ----------------------------------------------------
// TEST 3: STRAIGHT JUMP OVER OPPONENT
// ----------------------------------------------------
console.log('\n🦘 TEST SUITE 3: Adjacent Pawn Straight Jump');
let jumpState: GameState = {
  ...getInitialState(),
  p1: { r: 4, c: 4 },
  p2: { r: 3, c: 4 },
  currentTurn: 1
};

const jumpMoves = getLegalPawnMoves(jumpState, 1);
assert(
  jumpMoves.some((m) => m.r === 2 && m.c === 4),
  'P1 can jump straight over P2 to (2, 4)'
);
assert(
  !jumpMoves.some((m) => m.r === 3 && m.c === 3) && !jumpMoves.some((m) => m.r === 3 && m.c === 5),
  'Diagonal jump not available when straight jump is clear'
);

// ----------------------------------------------------
// TEST 4: DIAGONAL JUMP WHEN STRAIGHT JUMP IS BLOCKED
// ----------------------------------------------------
console.log('\n↗️ TEST SUITE 4: Diagonal Jump When Straight Jump is Blocked by Wall');
const wallBehindP2: Wall = { r: 2, c: 4, orientation: 'H', player: 2 };
jumpState = {
  ...jumpState,
  walls: [wallBehindP2]
};

const diagMoves = getLegalPawnMoves(jumpState, 1);
assert(
  !diagMoves.some((m) => m.r === 2 && m.c === 4),
  'Straight jump is blocked by horizontal wall'
);
assert(
  diagMoves.some((m) => m.r === 3 && m.c === 3) && diagMoves.some((m) => m.r === 3 && m.c === 5),
  'Diagonal jumps to (3, 3) and (3, 5) are legal when straight jump is blocked'
);

// ----------------------------------------------------
// TEST 5: WALL PLACEMENT & BLOCKING MOVEMENT
// ----------------------------------------------------
console.log('\n🧱 TEST SUITE 5: Wall Placement & Path Blocking');
let wallState = getInitialState('pass-and-play', 'medium', 1);

const val1 = validateWallPlacement(wallState, 7, 4, 'H', 1);
assert(val1.valid, 'Placing H wall at (7, 4) is valid');

wallState = applyAction(wallState, {
  type: 'wall',
  player: 1,
  wall: { r: 7, c: 4, orientation: 'H', player: 1 }
});

assert(wallState.walls.length === 1, 'Wall added to board');
assert(wallState.p1WallsLeft === 9, 'P1 walls left decremented to 9');
assert(wallState.currentTurn === 2, 'Turn passed to P2');

const p1MovesAfterWall = getLegalPawnMoves(wallState, 1);
assert(
  !p1MovesAfterWall.some((m) => m.r === 7 && m.c === 4),
  'Pawn cannot step across placed horizontal wall'
);

// ----------------------------------------------------
// TEST 6: WALL COLLISION & OVERLAPPING RULES
// ----------------------------------------------------
console.log('\n🚫 TEST SUITE 6: Wall Overlap & Crossing Prevention');
const dupCheck = checkWallCollision(7, 4, 'H', wallState.walls);
assert(dupCheck.collides, 'Identical wall placement rejected');

const overlapLeft = checkWallCollision(7, 3, 'H', wallState.walls);
assert(overlapLeft.collides, 'Overlapping H wall to the left (7, 3) rejected');

const overlapRight = checkWallCollision(7, 5, 'H', wallState.walls);
assert(overlapRight.collides, 'Overlapping H wall to the right (7, 5) rejected');

const nonOverlapH = checkWallCollision(7, 2, 'H', wallState.walls);
assert(!nonOverlapH.collides, 'Adjacent non-overlapping H wall at (7, 2) allowed');

const crossCheck = checkWallCollision(7, 4, 'V', wallState.walls);
assert(crossCheck.collides, 'Crossing V wall at (7, 4) rejected');

const cornerV = checkWallCollision(7, 5, 'V', wallState.walls);
assert(!cornerV.collides, 'Perpendicular corner wall at (7, 5) allowed');

assert(checkWallCollision(-1, 0, 'H', []).collides, 'Negative row wall rejected');
assert(checkWallCollision(0, 8, 'H', []).collides, 'Row/col >= 8 wall slot rejected');

// ----------------------------------------------------
// TEST 7: PATHFINDING (BFS) & FULL TRAP PREVENTION
// ----------------------------------------------------
console.log('\n🧭 TEST SUITE 7: BFS Pathfinding & Goal Route Protection');
// Box P1 at bottom using V at (7, 3) and V at (7, 4)
const enclosingWalls: Wall[] = [
  { r: 7, c: 3, orientation: 'V', player: 2 },
  { r: 7, c: 4, orientation: 'V', player: 2 }
];

let trapBoxState: GameState = {
  ...getInitialState('pass-and-play', 'medium', 2),
  walls: enclosingWalls
};

// Before placing H at (6, 3), P1 still has a path (moving up through (7, 4) -> (6, 4))
const pathBeforeSeal = findShortestPath(trapBoxState.p1, 1, trapBoxState.walls);
assert(pathBeforeSeal.distance !== Infinity, 'P1 has path before top wall is placed');

// Placing H at (6, 3) would completely seal P1 at (8, 4) and (7, 4)
const trapValidation = validateWallPlacement(trapBoxState, 6, 3, 'H', 2);
assert(!trapValidation.valid, 'Placing wall that completely seals all routes to goal is rejected');
assert(
  Boolean(trapValidation.reason && trapValidation.reason.includes('completely blocks')),
  `Validation specifies route blockage reason: "${trapValidation.reason}"`
);

// ----------------------------------------------------
// TEST 8: WALL COUNTER DEPLETION
// ----------------------------------------------------
console.log('\n🔢 TEST SUITE 8: Wall Counter Depletion');
const zeroWallsState: GameState = {
  ...getInitialState('pass-and-play', 'medium', 1),
  p1WallsLeft: 0
};
const noWallVal = validateWallPlacement(zeroWallsState, 3, 3, 'H', 1);
assert(!noWallVal.valid, 'Cannot place wall when walls count is 0');
assert(noWallVal.reason?.includes('No walls remaining'), 'Reason states no walls remaining');

// ----------------------------------------------------
// TEST 9: VICTORY DETECTION
// ----------------------------------------------------
console.log('\n🏆 TEST SUITE 9: Immediate Victory Detection');
// P1 steps onto row 0 (P2 is at (0, 0) so (0, 4) is open)
const nearWinP1: GameState = {
  ...getInitialState('pass-and-play', 'medium', 1),
  p1: { r: 1, c: 4 },
  p2: { r: 0, c: 0 },
  currentTurn: 1
};
const winStateP1 = applyAction(nearWinP1, {
  type: 'move',
  player: 1,
  from: { r: 1, c: 4 },
  to: { r: 0, c: 4 }
});
assert(winStateP1.winner === 1, 'Player 1 wins immediately upon reaching row 0');

// P2 steps onto row 8 (P1 is at (8, 0) so (8, 4) is open)
const nearWinP2: GameState = {
  ...getInitialState('pass-and-play', 'medium', 2),
  p1: { r: 8, c: 0 },
  p2: { r: 7, c: 4 },
  currentTurn: 2
};
const winStateP2 = applyAction(nearWinP2, {
  type: 'move',
  player: 2,
  from: { r: 7, c: 4 },
  to: { r: 8, c: 4 }
});
assert(winStateP2.winner === 2, 'Player 2 wins immediately upon reaching row 8');

// ----------------------------------------------------
// TEST 10: UNDO IN PASS & PLAY AND AI MODES
// ----------------------------------------------------
console.log('\n⏪ TEST SUITE 10: Undo State Restoration');
let undoTest = getInitialState('pass-and-play', 'medium', 1);
undoTest = applyAction(undoTest, {
  type: 'move',
  player: 1,
  from: { r: 8, c: 4 },
  to: { r: 7, c: 4 }
});
assert(undoTest.p1.r === 7, 'P1 moved to (7, 4)');

undoTest = undoAction(undoTest, 1);
assert(undoTest.p1.r === 8, 'Undo restores P1 back to (8, 4)');
assert(undoTest.currentTurn === 1, 'Undo restores currentTurn to 1');
assert(undoTest.moveHistory.length === 0, 'Move history trimmed');

let aiUndoTest = getInitialState('ai', 'medium', 1);
aiUndoTest = applyAction(aiUndoTest, {
  type: 'move',
  player: 1,
  from: { r: 8, c: 4 },
  to: { r: 7, c: 4 }
});
aiUndoTest = applyAction(aiUndoTest, {
  type: 'move',
  player: 2,
  from: { r: 0, c: 4 },
  to: { r: 1, c: 4 }
});
assert(aiUndoTest.moveHistory.length === 2, 'Human + AI moves completed');

aiUndoTest = undoAction(aiUndoTest, 2);
assert(aiUndoTest.p1.r === 8 && aiUndoTest.p2.r === 0, 'Undo 2 steps restores both players');
assert(aiUndoTest.currentTurn === 1, 'Human player has the turn after undo');

// ----------------------------------------------------
// TEST 11: AI ENGINE LEGALITY ACROSS ALL DIFFICULTIES
// ----------------------------------------------------
console.log('\n🤖 TEST SUITE 11: AI Legal Decision Making Across Difficulties');

for (const diff of ['easy', 'medium', 'hard'] as const) {
  let simState = getInitialState('ai', diff, 2);
  let movesCount = 0;
  let allLegal = true;

  while (movesCount < 10 && simState.winner === null) {
    const aiMove = getAIMove(simState, diff, simState.currentTurn);

    if (aiMove.type === 'move') {
      const legal = getLegalPawnMoves(simState, simState.currentTurn);
      const isOk = legal.some((m) => areCellsEqual(m, aiMove.to));
      if (!isOk) allLegal = false;
    } else if (aiMove.type === 'wall') {
      const val = validateWallPlacement(
        simState,
        aiMove.wall.r,
        aiMove.wall.c,
        aiMove.wall.orientation,
        simState.currentTurn
      );
      if (!val.valid) allLegal = false;
    }

    simState = applyAction(simState, aiMove);
    movesCount++;
  }

  assert(allLegal, `AI (${diff}) played 10 consecutive verified legal actions`);
}

console.log('\n====================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
