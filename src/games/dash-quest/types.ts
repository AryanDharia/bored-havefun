export type TileType = 
  | 'empty' 
  | 'solid' 
  | 'one_way' 
  | 'spike' 
  | 'spring' 
  | 'checkpoint' 
  | 'finish';

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
  shape?: 'square' | 'circle' | 'sparkle';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  animFrame: number;
}

export interface Spring {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  compression: number; // 0 = normal, 1 = fully squished
  timer: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  activated: boolean;
  sparkleTimer: number;
}

export interface MovingPlatform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number;
  direction: 1 | -1;
  dx: number;
  dy: number;
}

export interface Enemy {
  id: string;
  type: 'crawler' | 'drone';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  minX: number;
  maxX: number;
  facing: 1 | -1;
  alive: boolean;
  deathTimer: number;
  animTimer: number;
  startY?: number; // For drone sine-wave hovering
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  facing: 1 | -1;
  animState: 'idle' | 'run' | 'jump' | 'fall' | 'stomp' | 'hurt';
  animTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  invulnerableTimer: number;
  squash: number; // For landing/jumping juice
  stretch: number;
  ridingPlatform: MovingPlatform | null;
}

export interface LevelConfig {
  id: number;
  name: string;
  theme: 'valley' | 'cavern' | 'citadel';
  width: number; // In tiles
  height: number; // In tiles
  tileSize: number;
  playerStart: { x: number; y: number };
  checkpoint: { x: number; y: number };
  finish: { x: number; y: number };
  tiles: number[][]; // 0=empty, 1=solid, 2=one-way platform, 3=spike
  movingPlatforms: Omit<MovingPlatform, 'dx' | 'dy' | 'direction' | 'progress'>[];
  springs: { x: number; y: number }[];
  coins: { x: number; y: number }[];
  enemies: {
    type: 'crawler' | 'drone';
    x: number;
    y: number;
    minX: number;
    maxX: number;
  }[];
}

export type GameStatus = 
  | 'title' 
  | 'playing' 
  | 'paused' 
  | 'level_complete' 
  | 'game_over' 
  | 'victory';
