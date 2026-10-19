export type PlayerId = 1 | 2;

export type WallOrientation = 'H' | 'V';

export type GameMode = 'ai' | 'pass-and-play';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface Cell {
  r: number; // 0 to 8 (row)
  c: number; // 0 to 8 (column)
}

export interface Wall {
  r: number; // 0 to 7 (top-left intersection row)
  c: number; // 0 to 7 (top-left intersection column)
  orientation: WallOrientation;
  player: PlayerId;
}

export type MoveAction =
  | {
      type: 'move';
      player: PlayerId;
      from: Cell;
      to: Cell;
      isJump?: boolean;
      isDiagonalJump?: boolean;
    }
  | {
      type: 'wall';
      player: PlayerId;
      wall: Wall;
    };

export interface GameState {
  p1: Cell;
  p2: Cell;
  p1WallsLeft: number;
  p2WallsLeft: number;
  walls: Wall[];
  currentTurn: PlayerId;
  winner: PlayerId | null;
  moveHistory: MoveAction[];
  turnCount: number;
  startingPlayer: PlayerId;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
}

export interface WallSlotValidation {
  valid: boolean;
  reason?: string;
}

export interface ShortestPathResult {
  distance: number;
  path: Cell[];
}
