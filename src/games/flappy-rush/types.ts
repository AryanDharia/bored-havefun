export type FlappyGameStatus = 'ready' | 'playing' | 'paused' | 'game-over';

export interface PipBird {
  x: number;
  y: number;
  vy: number;
  radius: number;
  rotation: number;
  wingFrame: number;
  wingTimer: number;
  bobTimer: number;
  isDead: boolean;
}

export interface PipePair {
  id: number;
  x: number;
  topHeight: number;
  bottomY: number;
  gap: number;
  width: number;
  scored: boolean;
  gemCollected: boolean;
}

export interface FlappyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation?: number;
  shape?: 'circle' | 'feather' | 'spark' | 'star';
}

export interface FloatingScore {
  id: string;
  text: string;
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}
