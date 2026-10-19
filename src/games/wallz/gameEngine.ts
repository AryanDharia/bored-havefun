import type {
  PlayerId,
  WallOrientation,
  Cell,
  Wall,
  MoveAction,
  GameState,
  WallSlotValidation,
  ShortestPathResult,
  GameMode,
  AIDifficulty
} from './types';

export const BOARD_SIZE = 9;
export const WALL_GRID_SIZE = 8;
export const STARTING_WALLS = 10;

export const P1_START: Cell = { r: 8, c: 4 };
export const P2_START: Cell = { r: 0, c: 4 };

export function isWithinBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function isWallSlotInBounds(r: number, c: number): boolean {
  return r >= 0 && r < WALL_GRID_SIZE && c >= 0 && c < WALL_GRID_SIZE;
}

export function areCellsEqual(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

/**
 * Checks if movement between two adjacent cells (r1, c1) and (r2, c2) is blocked by any wall.
 */
export function isBlockedByWall(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  walls: Wall[]
): boolean {
  const dr = r2 - r1;
  const dc = c2 - c1;

  // Only direct orthogonal neighbors can be moved to
  if (Math.abs(dr) + Math.abs(dc) !== 1) {
    return true;
  }

  // Moving Up: (r1, c1) -> (r1 - 1, c1)
  if (dr === -1) {
    const wallRow = r1 - 1;
    for (const w of walls) {
      if (w.orientation === 'H' && w.r === wallRow && (w.c === c1 || w.c === c1 - 1)) {
        return true;
      }
    }
    return false;
  }

  // Moving Down: (r1, c1) -> (r1 + 1, c1)
  if (dr === 1) {
    const wallRow = r1;
    for (const w of walls) {
      if (w.orientation === 'H' && w.r === wallRow && (w.c === c1 || w.c === c1 - 1)) {
        return true;
      }
    }
    return false;
  }

  // Moving Left: (r1, c1) -> (r1, c1 - 1)
  if (dc === -1) {
    const wallCol = c1 - 1;
    for (const w of walls) {
      if (w.orientation === 'V' && w.c === wallCol && (w.r === r1 || w.r === r1 - 1)) {
        return true;
      }
    }
    return false;
  }

  // Moving Right: (r1, c1) -> (r1, c1 + 1)
  if (dc === 1) {
    const wallCol = c1;
    for (const w of walls) {
      if (w.orientation === 'V' && w.c === wallCol && (w.r === r1 || w.r === r1 - 1)) {
        return true;
      }
    }
    return false;
  }

  return false;
}

/**
 * Calculates all legal pawn destinations for the specified player according to Quoridor rules.
 * Handles single orthogonal steps, straight jumps over opponent, and diagonal jumps when straight jump is blocked.
 */
export function getLegalPawnMoves(state: GameState, player: PlayerId): Cell[] {
  if (state.winner !== null) return [];

  const current = player === 1 ? state.p1 : state.p2;
  const opponent = player === 1 ? state.p2 : state.p1;
  const legalMoves: Cell[] = [];

  const directions: [number, number][] = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1]   // Right
  ];

  for (const [dr, dc] of directions) {
    const nr = current.r + dr;
    const nc = current.c + dc;

    if (!isWithinBounds(nr, nc)) continue;
    if (isBlockedByWall(current.r, current.c, nr, nc, state.walls)) continue;

    // Normal unoccupied cell move
    if (nr !== opponent.r || nc !== opponent.c) {
      legalMoves.push({ r: nr, c: nc });
      continue;
    }

    // Opponent is in this adjacent cell - check jump rules!
    const straightR = opponent.r + dr;
    const straightC = opponent.c + dc;

    const straightInBounds = isWithinBounds(straightR, straightC);
    const straightWallBlocked =
      !straightInBounds || isBlockedByWall(opponent.r, opponent.c, straightR, straightC, state.walls);

    if (straightInBounds && !straightWallBlocked) {
      // Straight jump is legal and available
      legalMoves.push({ r: straightR, c: straightC });
    } else {
      // Straight jump is blocked by a wall or board edge -> Diagonal jumps are allowed!
      const perpendiculars: [number, number][] =
        dr !== 0
          ? [
              [0, -1],
              [0, 1]
            ]
          : [
              [-1, 0],
              [1, 0]
            ];

      for (const [pdr, pdc] of perpendiculars) {
        const diagR = opponent.r + pdr;
        const diagC = opponent.c + pdc;

        if (
          isWithinBounds(diagR, diagC) &&
          !isBlockedByWall(opponent.r, opponent.c, diagR, diagC, state.walls)
        ) {
          legalMoves.push({ r: diagR, c: diagC });
        }
      }
    }
  }

  return legalMoves;
}

/**
 * Checks if a proposed wall overlaps or intersects illegally with existing walls.
 */
export function checkWallCollision(
  r: number,
  c: number,
  orientation: WallOrientation,
  walls: Wall[]
): { collides: boolean; reason?: string } {
  if (!isWallSlotInBounds(r, c)) {
    return { collides: true, reason: 'Wall position is outside the board boundaries.' };
  }

  for (const w of walls) {
    // 1. Two walls cannot share the exact same slot and orientation
    if (w.r === r && w.c === c && w.orientation === orientation) {
      return { collides: true, reason: 'A wall is already placed here.' };
    }

    // 2. Horizontal walls cannot overlap horizontally
    if (orientation === 'H' && w.orientation === 'H') {
      if (w.r === r && (w.c === c - 1 || w.c === c + 1)) {
        return { collides: true, reason: 'Horizontal walls cannot overlap.' };
      }
    }

    // 3. Vertical walls cannot overlap vertically
    if (orientation === 'V' && w.orientation === 'V') {
      if (w.c === c && (w.r === r - 1 || w.r === r + 1)) {
        return { collides: true, reason: 'Vertical walls cannot overlap.' };
      }
    }

    // 4. Horizontal and Vertical walls cannot cross at the same center intersection
    if (w.r === r && w.c === c && w.orientation !== orientation) {
      return { collides: true, reason: 'Walls cannot cross each other.' };
    }
  }

  return { collides: false };
}

/**
 * Breadth-First Search (BFS) to find the shortest path from a start cell to any cell in the goal row.
 * Goal for Player 1: row 0.
 * Goal for Player 2: row 8.
 */
export function findShortestPath(
  from: Cell,
  goalPlayer: PlayerId,
  walls: Wall[]
): ShortestPathResult {
  const targetRow = goalPlayer === 1 ? 0 : 8;

  if (from.r === targetRow) {
    return { distance: 0, path: [from] };
  }

  const queue: Cell[] = [from];
  let head = 0;

  const parent = new Map<number, Cell>();
  const visited = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  visited[from.r * BOARD_SIZE + from.c] = 1;

  let targetCell: Cell | null = null;

  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  while (head < queue.length) {
    const cur = queue[head++];

    if (cur.r === targetRow) {
      targetCell = cur;
      break;
    }

    for (const [dr, dc] of directions) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;

      if (!isWithinBounds(nr, nc)) continue;
      const key = nr * BOARD_SIZE + nc;
      if (visited[key]) continue;

      if (isBlockedByWall(cur.r, cur.c, nr, nc, walls)) continue;

      visited[key] = 1;
      parent.set(key, cur);
      queue.push({ r: nr, c: nc });
    }
  }

  if (!targetCell) {
    return { distance: Infinity, path: [] };
  }

  // Reconstruct path
  const path: Cell[] = [];
  let curr: Cell | undefined = targetCell;

  while (curr) {
    path.push(curr);
    const key = curr.r * BOARD_SIZE + curr.c;
    curr = parent.get(key);
  }

  path.reverse();
  return {
    distance: path.length - 1,
    path
  };
}

/**
 * Validates whether a wall can be legally placed at (r, c) with given orientation by player.
 * Checks bounds, available walls, wall collisions, and the critical pathfinding rule
 * (both players must maintain at least one valid path to their goal).
 */
export function validateWallPlacement(
  state: GameState,
  r: number,
  c: number,
  orientation: WallOrientation,
  player: PlayerId
): WallSlotValidation {
  if (state.winner !== null) {
    return { valid: false, reason: 'Game has already ended.' };
  }

  if (state.currentTurn !== player) {
    return { valid: false, reason: "It is not this player's turn." };
  }

  const wallsLeft = player === 1 ? state.p1WallsLeft : state.p2WallsLeft;
  if (wallsLeft <= 0) {
    return { valid: false, reason: 'No walls remaining for this player.' };
  }

  const collision = checkWallCollision(r, c, orientation, state.walls);
  if (collision.collides) {
    return { valid: false, reason: collision.reason };
  }

  // Test pathfinding with the hypothetical wall added
  const testWalls: Wall[] = [...state.walls, { r, c, orientation, player }];

  const p1Path = findShortestPath(state.p1, 1, testWalls);
  if (p1Path.distance === Infinity) {
    return {
      valid: false,
      reason: 'Illegal: this wall completely blocks Player 1 from reaching their goal!'
    };
  }

  const p2Path = findShortestPath(state.p2, 2, testWalls);
  if (p2Path.distance === Infinity) {
    return {
      valid: false,
      reason: 'Illegal: this wall completely blocks Player 2 from reaching their goal!'
    };
  }

  return { valid: true };
}

/**
 * Initializes a new clean game state.
 */
export function getInitialState(
  mode: GameMode = 'ai',
  aiDifficulty: AIDifficulty = 'medium',
  startingPlayer: PlayerId = 1
): GameState {
  return {
    p1: { ...P1_START },
    p2: { ...P2_START },
    p1WallsLeft: STARTING_WALLS,
    p2WallsLeft: STARTING_WALLS,
    walls: [],
    currentTurn: startingPlayer,
    winner: null,
    moveHistory: [],
    turnCount: 1,
    startingPlayer,
    mode,
    aiDifficulty
  };
}

/**
 * Applies a move action to the state and returns the updated state.
 * Validates the move before executing.
 */
export function applyAction(state: GameState, action: MoveAction): GameState {
  if (state.winner !== null) return state;
  if (state.currentTurn !== action.player) return state;

  if (action.type === 'move') {
    const legalMoves = getLegalPawnMoves(state, action.player);
    const isLegal = legalMoves.some((m) => areCellsEqual(m, action.to));
    if (!isLegal) {
      throw new Error(`Illegal pawn move to (${action.to.r}, ${action.to.c})`);
    }

    const nextP1 = action.player === 1 ? { ...action.to } : { ...state.p1 };
    const nextP2 = action.player === 2 ? { ...action.to } : { ...state.p2 };

    let winner: PlayerId | null = null;
    if (nextP1.r === 0) winner = 1;
    if (nextP2.r === 8) winner = 2;

    const nextTurn: PlayerId = winner !== null ? state.currentTurn : action.player === 1 ? 2 : 1;

    return {
      ...state,
      p1: nextP1,
      p2: nextP2,
      winner,
      currentTurn: nextTurn,
      turnCount: state.turnCount + 1,
      moveHistory: [...state.moveHistory, action]
    };
  }

  if (action.type === 'wall') {
    const validation = validateWallPlacement(
      state,
      action.wall.r,
      action.wall.c,
      action.wall.orientation,
      action.player
    );

    if (!validation.valid) {
      throw new Error(validation.reason || 'Illegal wall placement');
    }

    const nextWalls = [...state.walls, { ...action.wall }];
    const nextP1Walls = action.player === 1 ? state.p1WallsLeft - 1 : state.p1WallsLeft;
    const nextP2Walls = action.player === 2 ? state.p2WallsLeft - 1 : state.p2WallsLeft;

    const nextTurn: PlayerId = action.player === 1 ? 2 : 1;

    return {
      ...state,
      walls: nextWalls,
      p1WallsLeft: nextP1Walls,
      p2WallsLeft: nextP2Walls,
      currentTurn: nextTurn,
      turnCount: state.turnCount + 1,
      moveHistory: [...state.moveHistory, action]
    };
  }

  return state;
}

/**
 * Reverts the last `steps` actions in history (e.g. 1 step for Pass & Play, 2 steps for AI mode).
 */
export function undoAction(state: GameState, steps: number = 1): GameState {
  if (state.moveHistory.length === 0) return state;

  const targetLength = Math.max(0, state.moveHistory.length - steps);
  const actionsToReplay = state.moveHistory.slice(0, targetLength);

  let reconstructed = getInitialState(state.mode, state.aiDifficulty, state.startingPlayer);

  for (const action of actionsToReplay) {
    reconstructed = applyAction(reconstructed, action);
  }

  return reconstructed;
}
