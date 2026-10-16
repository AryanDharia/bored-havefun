export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type RotationState = 0 | 1 | 2 | 3;

export interface Piece {
  type: TetrominoType;
  rotation: RotationState;
  x: number;
  y: number;
  shape: number[][];
}

export type GridCell = TetrominoType | null;
export type BoardGrid = GridCell[][];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingNotice {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface LineClearEvent {
  rows: number[];
  count: number;
  isTetris: boolean;
  scoreGained: number;
  combo: number;
  backToBack: boolean;
}

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  lines: number;
  combo: number;
  backToBack: boolean;
}
