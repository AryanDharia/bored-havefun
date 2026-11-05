export type CakeGameMode = 'classic' | 'time' | 'streak' | 'pass-and-play';

export type CakeGameStatus = 'ready' | 'playing' | 'paused' | 'turn-transition' | 'game-over';

export type SpecialLayerType = 'normal' | 'golden' | 'rainbow' | 'strawberry';

export interface CakeFlavor {
  name: string;
  spongeTop: string;
  spongeBottom: string;
  spongeCrumb: string;
  cream: string;
  glaze: string;
  accent: string;
  particleColor: string;
}

export interface CakeLayer {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flavorIndex: number;
  specialType: SpecialLayerType;
  isBase?: boolean;
}

export interface FallingSlice {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  alpha: number;
  flavorIndex: number;
  specialType: SpecialLayerType;
}

export interface CakeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'crumb' | 'spark' | 'star' | 'heart';
}

export interface FloatingBanner {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
  isCombo?: boolean;
}

export interface PassAndPlayPlayer {
  id: number;
  name: string;
  score: number;
  height: number;
  maxStreak: number;
  completed: boolean;
}

export interface MedalInfo {
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  name: string;
  icon: string;
  streakRequired: number;
  color: string;
  bgColor: string;
}

export interface PlacementResult {
  type: 'perfect' | 'overlap' | 'miss';
  retainedLayer: CakeLayer;
  fallingSlice?: FallingSlice;
  dx: number;
  widthDelta: number;
  specialEffect?: 'golden_3x' | 'rainbow_boost' | 'strawberry_rescue';
}
