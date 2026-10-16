export type GameMode = 'speed-run' | 'endless' | 'time-attack' | 'practice';

export type GameStatus = 'ready' | 'countdown' | 'playing' | 'paused' | 'finished' | 'game-over';

export interface SpeedRunTrackOption {
  id: string;
  name: string;
  distance: number; // in meters
  characterCount: number;
  description: string;
}

export interface TypingStats {
  wpm: number;
  netWpm: number;
  peakWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalChars: number;
  streak: number;
  maxStreak: number;
  combo: number;
  distance: number; // in meters
  targetDistance: number;
  elapsedTime: number; // in seconds
  timeRemaining: number; // in seconds (for time attack)
  wordsCompleted: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  shape?: 'circle' | 'spark' | 'ring';
}

export interface FloatingNotice {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SpeedOrb {
  x: number;
  y: number;
  collected: boolean;
  type: 'boost' | 'coin';
  floatOffset: number;
}

export interface RunnerState {
  x: number;
  y: number;
  speed: number;
  targetSpeed: number;
  animationFrame: number;
  animationTimer: number;
  stumbleTimer: number;
  boostTimer: number;
  streakLevel: number;
}
