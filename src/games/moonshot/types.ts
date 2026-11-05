export interface Vector2D {
  x: number;
  y: number;
}

export interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians, 0 is straight up
  rotationSpeed: number; // angular velocity rad/s
  fuel: number;
  maxFuel: number;
  gearExtension: number; // 0 = retracted, 1 = fully deployed
  gearTarget: number; // 0 or 1
  isThrusting: boolean;
  isRotatingLeft: boolean;
  isRotatingRight: boolean;
  ammo: number;
  maxAmmo: number;
  width: number;
  height: number;
}

export interface LandingPad {
  id: string;
  name: string;
  x1: number;
  x2: number;
  y: number;
  isLaunchPad?: boolean;
  isDestination?: boolean;
  visited?: boolean;
}

export type TargetType = 'bubble' | 'asteroid' | 'satellite';

export interface Target {
  id: string;
  type: TargetType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  points: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  vertices?: Vector2D[]; // For craggy asteroids
  pulse?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

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
  shape?: 'square' | 'spark' | 'smoke' | 'ring';
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  startingFuel: number;
  startingAmmo: number;
  spawnRocket: {
    x: number;
    y: number;
    angle?: number;
  };
  pads: LandingPad[];
  terrain: TerrainPoint[];
  targets: Omit<Target, 'id' | 'rotation'>[];
}

export type GameStatus =
  | 'title'
  | 'ready'
  | 'launching'
  | 'flying'
  | 'landing_approach'
  | 'landing'
  | 'landed'
  | 'refueling'
  | 'ready_for_takeoff'
  | 'crashed'
  | 'game_over'
  | 'level_cleared'
  | 'game_win'
  | 'paused';

export interface LandingEvaluation {
  isSafe: boolean;
  reason?: string;
  pad?: LandingPad;
}

export interface ContactPoints {
  nose: Vector2D;
  leftFoot: Vector2D;
  rightFoot: Vector2D;
  leftEngine: Vector2D;
  rightEngine: Vector2D;
}
