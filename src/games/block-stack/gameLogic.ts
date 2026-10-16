import type { TetrominoType, RotationState, Piece, BoardGrid } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINO_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// Initial shapes in orientation 0
export const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
};

export interface BlockPalette {
  primary: string;
  light: string;
  dark: string;
  glow: string;
  bgTailwind: string;
  borderTailwind: string;
}

export const PALETTES: Record<TetrominoType, BlockPalette> = {
  I: {
    primary: '#06b6d4', // Cyan
    light: '#67e8f9',
    dark: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.4)',
    bgTailwind: 'bg-cyan-500',
    borderTailwind: 'border-cyan-400'
  },
  J: {
    primary: '#3b82f6', // Vivid Blue
    light: '#93c5fd',
    dark: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.4)',
    bgTailwind: 'bg-blue-500',
    borderTailwind: 'border-blue-400'
  },
  L: {
    primary: '#f97316', // PlayBreak Orange
    light: '#fdba74',
    dark: '#c2410c',
    glow: 'rgba(249, 115, 22, 0.4)',
    bgTailwind: 'bg-orange-500',
    borderTailwind: 'border-orange-400'
  },
  O: {
    primary: '#eab308', // PlayBreak Amber / Gold
    light: '#fef08a',
    dark: '#a16207',
    glow: 'rgba(234, 179, 8, 0.4)',
    bgTailwind: 'bg-amber-400',
    borderTailwind: 'border-amber-300'
  },
  S: {
    primary: '#10b981', // Emerald Green
    light: '#6ee7b7',
    dark: '#047857',
    glow: 'rgba(16, 185, 129, 0.4)',
    bgTailwind: 'bg-emerald-500',
    borderTailwind: 'border-emerald-400'
  },
  T: {
    primary: '#a855f7', // Electric Violet
    light: '#d8b4fe',
    dark: '#7e22ce',
    glow: 'rgba(168, 85, 247, 0.4)',
    bgTailwind: 'bg-purple-500',
    borderTailwind: 'border-purple-400'
  },
  Z: {
    primary: '#ef4444', // Crimson Red
    light: '#fca5a5',
    dark: '#b91c1c',
    glow: 'rgba(239, 68, 68, 0.4)',
    bgTailwind: 'bg-red-500',
    borderTailwind: 'border-red-400'
  }
};

/**
 * Creates a clean 10x20 empty board grid
 */
export function createEmptyGrid(): BoardGrid {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

/**
 * Generates a standard fair 7-bag permutation
 */
export function generate7Bag(): TetrominoType[] {
  const bag: TetrominoType[] = [...TETROMINO_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * Spawns a piece centered horizontally at top of board
 */
export function spawnPiece(type: TetrominoType): Piece {
  const shape = SHAPES[type].map((row) => [...row]);
  // Horizontal centering
  const width = shape[0].length;
  const x = Math.floor((BOARD_WIDTH - width) / 2);
  // O and I pieces spawn neatly on row 0; others spawn at row 0 with row 0 empty
  const y = type === 'I' ? -1 : 0;

  return {
    type,
    rotation: 0,
    x,
    y,
    shape
  };
}

/**
 * Rotates a 2D matrix clockwise or counterclockwise
 */
export function rotateMatrix(matrix: number[][], dir: 'cw' | 'ccw'): number[][] {
  const n = matrix.length;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (dir === 'cw') {
        result[c][n - 1 - r] = matrix[r][c];
      } else {
        result[n - 1 - c][r] = matrix[r][c];
      }
    }
  }
  return result;
}

/**
 * Checks if a piece collides with board edges or existing locked blocks
 */
export function checkCollision(
  grid: BoardGrid,
  piece: Piece,
  offsetX = 0,
  offsetY = 0,
  testShape?: number[][]
): boolean {
  const shape = testShape || piece.shape;
  const targetX = piece.x + offsetX;
  const targetY = piece.y + offsetY;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const boardX = targetX + c;
        const boardY = targetY + r;

        // Horizontal boundary checks
        if (boardX < 0 || boardX >= BOARD_WIDTH) {
          return true;
        }

        // Bottom floor check
        if (boardY >= BOARD_HEIGHT) {
          return true;
        }

        // Block collision check (ignore above ceiling)
        if (boardY >= 0 && grid[boardY] && grid[boardY][boardX] !== null) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Standard Super Rotation System (SRS) Wall Kick Offsets
 * Coordinates are formatted for screen grid: [dx, dy] where +dy is DOWNWARD.
 */
type KickTable = Record<string, [number, number][]>;

const KICKS_JLSTZ: KickTable = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
};

const KICKS_I: KickTable = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
};

/**
 * Attempts to rotate piece with full SRS wall kick evaluations
 */
export function tryRotatePiece(
  grid: BoardGrid,
  piece: Piece,
  dir: 'cw' | 'ccw'
): Piece | null {
  if (piece.type === 'O') {
    return piece; // O tetromino does not need rotation
  }

  const newShape = rotateMatrix(piece.shape, dir);
  const nextRotation: RotationState = dir === 'cw'
    ? (((piece.rotation + 1) % 4) as RotationState)
    : (((piece.rotation + 3) % 4) as RotationState);

  const transitionKey = `${piece.rotation}->${nextRotation}`;
  const kickList = piece.type === 'I' ? KICKS_I[transitionKey] : KICKS_JLSTZ[transitionKey];
  const kicks = kickList || [[0, 0]];

  for (const [dx, dy] of kicks) {
    if (!checkCollision(grid, piece, dx, dy, newShape)) {
      return {
        ...piece,
        rotation: nextRotation,
        x: piece.x + dx,
        y: piece.y + dy,
        shape: newShape
      };
    }
  }

  return null; // All kicks failed, cannot rotate
}

/**
 * Calculates ghost piece target Y (drop shadow)
 */
export function getGhostY(grid: BoardGrid, piece: Piece): number {
  let dropDistance = 0;
  while (!checkCollision(grid, piece, 0, dropDistance + 1)) {
    dropDistance++;
  }
  return piece.y + dropDistance;
}

/**
 * Locks an active piece into the board grid
 */
export function lockPiece(grid: BoardGrid, piece: Piece): BoardGrid {
  const newGrid = grid.map((row) => [...row]);

  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c] !== 0) {
        const boardX = piece.x + c;
        const boardY = piece.y + r;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newGrid[boardY][boardX] = piece.type;
        }
      }
    }
  }

  return newGrid;
}

/**
 * Finds all completely filled rows
 */
export function findCompleteLines(grid: BoardGrid): number[] {
  const completed: number[] = [];
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    if (grid[r].every((cell) => cell !== null)) {
      completed.push(r);
    }
  }
  return completed;
}

/**
 * Clears rows and collapses upper rows down
 */
export function clearLines(grid: BoardGrid, rowsToClear: number[]): BoardGrid {
  if (rowsToClear.length === 0) return grid;

  const rowsSet = new Set(rowsToClear);
  const remainingRows = grid.filter((_, idx) => !rowsSet.has(idx));
  const newEmptyRows = Array.from({ length: rowsToClear.length }, () =>
    Array(BOARD_WIDTH).fill(null)
  );

  return [...newEmptyRows, ...remainingRows];
}

/**
 * Calculates score for cleared lines with combo & back-to-back rewards
 */
export function calculateLineClearScore(
  linesCleared: number,
  level: number,
  combo: number,
  isBackToBack: boolean
): { score: number; label: string; isTetris: boolean } {
  let base = 0;
  let label = '';
  const isTetris = linesCleared === 4;

  switch (linesCleared) {
    case 1:
      base = 100 * level;
      label = 'SINGLE';
      break;
    case 2:
      base = 300 * level;
      label = 'DOUBLE!';
      break;
    case 3:
      base = 500 * level;
      label = 'TRIPLE!!';
      break;
    case 4:
      base = 800 * level;
      if (isBackToBack) {
        base = Math.floor(base * 1.5);
        label = 'B2B QUAD CLEANSWEEP!!';
      } else {
        label = 'QUAD CLEANSWEEP!!';
      }
      break;
    default:
      return { score: 0, label: '', isTetris: false };
  }

  // Combo multiplier
  const comboBonus = combo > 0 ? 50 * combo * level : 0;
  return {
    score: base + comboBonus,
    label: combo > 1 ? `${label} (${combo}x COMBO)` : label,
    isTetris
  };
}

/**
 * Calculates player level based on total lines cleared
 */
export function calculateLevel(totalLines: number): number {
  return Math.min(25, Math.floor(totalLines / 10) + 1);
}

/**
 * Calculates automatic gravity drop interval in milliseconds based on level
 */
export function getDropInterval(level: number): number {
  return Math.max(50, Math.floor(800 * Math.pow(0.85, level - 1)));
}
