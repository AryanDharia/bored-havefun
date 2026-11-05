export type PieceType = 'R' | 'RK' | 'B' | 'BK' | null; // Red (P1/bottom) vs Black (P2/AI/top), K = King
export type PieceColor = 'red' | 'black';

export interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  isJump: boolean;
  jumpR?: number;
  jumpC?: number;
}

export interface MoveResult {
  nextBoard: PieceType[][];
  justPromoted: boolean;
  capturedPiece: PieceType;
  piece: PieceType;
  furtherJumps: Move[];
}

/**
 * Initializes standard 8x8 Checkers board.
 * Dark squares only: (r + c) % 2 === 1.
 * Rows 0..2: Black pieces ('B')
 * Rows 5..7: Red pieces ('R')
 */
export function initCheckersBoard(): PieceType[][] {
  const b: PieceType[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = 'B';
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) b[r][c] = 'R';
    }
  }
  return b;
}

/**
 * Returns all valid capture jumps for a piece at (r, c) on board b.
 */
export function getJumpsForPiece(b: PieceType[][], r: number, c: number): Move[] {
  const piece = b[r]?.[c];
  if (!piece) return [];

  const isRed = piece === 'R' || piece === 'RK';
  const isKing = piece === 'RK' || piece === 'BK';

  const directions: [number, number][] = [];
  if (isRed || isKing) directions.push([-1, -1], [-1, 1]); // Upward
  if (!isRed || isKing) directions.push([1, -1], [1, 1]);  // Downward

  const jumps: Move[] = [];

  for (const [dr, dc] of directions) {
    const midR = r + dr;
    const midC = c + dc;
    const landR = r + dr * 2;
    const landC = c + dc * 2;

    if (
      landR >= 0 && landR < 8 &&
      landC >= 0 && landC < 8 &&
      b[landR][landC] === null
    ) {
      const midPiece = b[midR][midC];
      if (midPiece) {
        const midIsRed = midPiece === 'R' || midPiece === 'RK';
        if (midIsRed !== isRed) {
          jumps.push({
            fromR: r,
            fromC: c,
            toR: landR,
            toC: landC,
            isJump: true,
            jumpR: midR,
            jumpC: midC,
          });
        }
      }
    }
  }

  return jumps;
}

/**
 * Returns all legal moves (simple steps and jumps) for a piece at (r, c).
 */
export function getMovesForPiece(b: PieceType[][], r: number, c: number): Move[] {
  const piece = b[r]?.[c];
  if (!piece) return [];

  const isRed = piece === 'R' || piece === 'RK';
  const isKing = piece === 'RK' || piece === 'BK';

  const directions: [number, number][] = [];
  if (isRed || isKing) directions.push([-1, -1], [-1, 1]); // Red moves upwards
  if (!isRed || isKing) directions.push([1, -1], [1, 1]);  // Black moves downwards

  const moves: Move[] = [];

  // 1. Simple steps
  for (const [dr, dc] of directions) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === null) {
      moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, isJump: false });
    }
  }

  // 2. Jumps (captures)
  const jumps = getJumpsForPiece(b, r, c);
  moves.push(...jumps);

  return moves;
}

/**
 * Returns all legal moves for a given color.
 * Standard Checkers rule: if any capture/jump is available, captures are mandatory.
 */
export function getAllMovesForColor(b: PieceType[][], color: PieceColor): Move[] {
  let allMoves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = b[r][c];
      if (piece) {
        const pieceColor = (piece === 'R' || piece === 'RK') ? 'red' : 'black';
        if (pieceColor === color) {
          allMoves = allMoves.concat(getMovesForPiece(b, r, c));
        }
      }
    }
  }

  const jumps = allMoves.filter((m) => m.isJump);
  if (jumps.length > 0) return jumps;
  return allMoves;
}

/**
 * Applies a move to the board, removing any captured piece and handling king promotion.
 * If the move was a jump, recalculates available further jumps for the same piece
 * using the updated board state (unless newly promoted to King, which ends the turn in American Checkers).
 */
export function executeMove(b: PieceType[][], move: Move): MoveResult {
  const nextBoard = b.map((row) => [...row]);
  let piece = nextBoard[move.fromR][move.fromC];
  if (!piece) {
    throw new Error(`Invalid move: no piece at (${move.fromR}, ${move.fromC})`);
  }

  // Clear original square
  nextBoard[move.fromR][move.fromC] = null;

  // Remove captured piece
  let capturedPiece: PieceType = null;
  if (move.isJump && move.jumpR !== undefined && move.jumpC !== undefined) {
    capturedPiece = nextBoard[move.jumpR][move.jumpC];
    nextBoard[move.jumpR][move.jumpC] = null;
  }

  // Check king promotion
  let justPromoted = false;
  if (piece === 'R' && move.toR === 0) {
    piece = 'RK';
    justPromoted = true;
  } else if (piece === 'B' && move.toR === 7) {
    piece = 'BK';
    justPromoted = true;
  }

  // Place piece at destination
  nextBoard[move.toR][move.toC] = piece;

  // Determine if further jumps are available with this same piece
  let furtherJumps: Move[] = [];
  if (move.isJump) {
    // In American Checkers, when a man reaches the kings row, it becomes a king and the turn ends
    if (!justPromoted) {
      furtherJumps = getJumpsForPiece(nextBoard, move.toR, move.toC);
    }
  }

  return {
    nextBoard,
    justPromoted,
    capturedPiece,
    piece,
    furtherJumps
  };
}
