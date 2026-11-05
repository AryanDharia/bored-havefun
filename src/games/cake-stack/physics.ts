import type {
  CakeGameMode,
  CakeLayer,
  FallingSlice,
  PlacementResult,
  SpecialLayerType,
  MedalInfo,
  CakeFlavor
} from './types';

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 700;
export const LAYER_HEIGHT = 28;
export const INITIAL_LAYER_WIDTH = 240;
export const MIN_LAYER_WIDTH = 6;
export const PERFECT_TOLERANCE = 2.5; // pixels
export const BASE_SPEED = 3.6;
export const MAX_SPEED = 8.0;
export const STRAWBERRY_RESCUE_AMOUNT = 18;
export const BASE_PEDESTAL_Y = 570;

export const CAKE_FLAVORS: CakeFlavor[] = [
  {
    name: 'Vanilla Bean Chiffon',
    spongeTop: '#fef3c7',
    spongeBottom: '#fde68a',
    spongeCrumb: '#d97706',
    cream: '#fffbeb',
    glaze: '#fef08a',
    accent: '#fb7185',
    particleColor: '#fde68a'
  },
  {
    name: 'Belgian Dark Truffle',
    spongeTop: '#451a03',
    spongeBottom: '#290f01',
    spongeCrumb: '#1c0a00',
    cream: '#fef3c7',
    glaze: '#572005',
    accent: '#f59e0b',
    particleColor: '#78350f'
  },
  {
    name: 'Pink Strawberry Delight',
    spongeTop: '#fbcfe8',
    spongeBottom: '#f472b6',
    spongeCrumb: '#db2777',
    cream: '#fff1f2',
    glaze: '#fb7185',
    accent: '#e11d48',
    particleColor: '#f472b6'
  },
  {
    name: 'Blueberry Indigo Velvet',
    spongeTop: '#c7d2fe',
    spongeBottom: '#818cf8',
    spongeCrumb: '#4f46e5',
    cream: '#eef2ff',
    glaze: '#6366f1',
    accent: '#312e81',
    particleColor: '#818cf8'
  },
  {
    name: 'Matcha Pistachio Swirl',
    spongeTop: '#bbf7d0',
    spongeBottom: '#4ade80',
    spongeCrumb: '#16a34a',
    cream: '#f0fdf4',
    glaze: '#22c55e',
    accent: '#15803d',
    particleColor: '#4ade80'
  },
  {
    name: 'Salted Caramel Toffee',
    spongeTop: '#fed7aa',
    spongeBottom: '#fb923c',
    spongeCrumb: '#c2410c',
    cream: '#fff7ed',
    glaze: '#ea580c',
    accent: '#7c2d12',
    particleColor: '#fb923c'
  },
  {
    name: 'Red Velvet Royale',
    spongeTop: '#e11d48',
    spongeBottom: '#9f1239',
    spongeCrumb: '#881337',
    cream: '#ffffff',
    glaze: '#be123c',
    accent: '#f43f5e',
    particleColor: '#e11d48'
  },
  {
    name: 'Lemon Citrus Meringue',
    spongeTop: '#fef08a',
    spongeBottom: '#eab308',
    spongeCrumb: '#ca8a04',
    cream: '#ffffff',
    glaze: '#facc15',
    accent: '#f97316',
    particleColor: '#fef08a'
  },
  {
    name: 'Tiramisu Espresso',
    spongeTop: '#d6d3d1',
    spongeBottom: '#a8a29e',
    spongeCrumb: '#57534e',
    cream: '#fafaf9',
    glaze: '#78716c',
    accent: '#44403c',
    particleColor: '#a8a29e'
  },
  {
    name: 'Golden Honey Glaze',
    spongeTop: '#fef08a',
    spongeBottom: '#f59e0b',
    spongeCrumb: '#b45309',
    cream: '#fffbeb',
    glaze: '#fbbf24',
    accent: '#d97706',
    particleColor: '#fbbf24'
  }
];

export const STREAK_MEDALS: MedalInfo[] = [
  {
    tier: 'bronze',
    name: 'Bronze Baker',
    icon: '🥉',
    streakRequired: 3,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/15 border-amber-500/30'
  },
  {
    tier: 'silver',
    name: 'Silver Pâtissier',
    icon: '🥈',
    streakRequired: 7,
    color: 'text-slate-300',
    bgColor: 'bg-slate-300/15 border-slate-300/30'
  },
  {
    tier: 'gold',
    name: 'Master Pâtissier',
    icon: '🥇',
    streakRequired: 15,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/15 border-amber-400/30'
  },
  {
    tier: 'diamond',
    name: 'Grand Cake Artist',
    icon: '💎',
    streakRequired: 25,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/15 border-cyan-400/30'
  }
];

/**
 * Calculates current horizontal layer movement speed based on height and game mode.
 */
export function calculateSpeed(stackLength: number, mode: CakeGameMode): number {
  let speed = BASE_SPEED + Math.min(stackLength * 0.12, 4.4);
  if (mode === 'time') {
    // Time mode moves slightly faster to test quick reflexes
    speed *= 1.15;
  }
  return Math.min(speed, MAX_SPEED);
}

/**
 * Determines whether a special bonus layer should spawn based on layer index and current width.
 */
export function getSpecialTypeForLayer(layerIndex: number, currentWidth: number): SpecialLayerType {
  // If player lost substantial width, periodically award a strawberry rescue layer
  if (currentWidth < INITIAL_LAYER_WIDTH * 0.65 && layerIndex > 4 && layerIndex % 7 === 0) {
    return 'strawberry';
  }

  // Golden layer every 10 layers
  if (layerIndex > 0 && layerIndex % 10 === 0) {
    return 'golden';
  }

  // Rainbow layer every 15 layers
  if (layerIndex > 0 && layerIndex % 15 === 0) {
    return 'rainbow';
  }

  return 'normal';
}

/**
 * Evaluates overlap between moving layer and top stacked layer.
 * Returns deterministic placement type, retained layer, and optional sliced piece.
 */
export function evaluatePlacement(
  movingLayer: CakeLayer,
  previousLayer: CakeLayer
): PlacementResult {
  const dx = movingLayer.x - previousLayer.x;
  const absDx = Math.abs(dx);

  // 1. Perfect Placement: within tolerance
  if (absDx <= PERFECT_TOLERANCE) {
    let retainedWidth = previousLayer.width;
    let retainedX = previousLayer.x;
    let specialEffect: 'golden_3x' | 'rainbow_boost' | 'strawberry_rescue' | undefined;

    if (movingLayer.specialType === 'strawberry') {
      const restored = Math.min(INITIAL_LAYER_WIDTH, retainedWidth + STRAWBERRY_RESCUE_AMOUNT);
      const midX = retainedX + retainedWidth / 2;
      retainedX = Math.max(10, Math.min(CANVAS_WIDTH - restored - 10, midX - restored / 2));
      retainedWidth = restored;
      specialEffect = 'strawberry_rescue';
    } else if (movingLayer.specialType === 'golden') {
      specialEffect = 'golden_3x';
    } else if (movingLayer.specialType === 'rainbow') {
      specialEffect = 'rainbow_boost';
    }

    const retainedLayer: CakeLayer = {
      ...movingLayer,
      x: retainedX,
      width: retainedWidth
    };

    return {
      type: 'perfect',
      retainedLayer,
      dx: 0,
      widthDelta: 0,
      specialEffect
    };
  }

  // 2. Overlap Check
  let overlap = 0;
  let sliceX = 0;
  let sliceWidth = 0;
  let retainedX = 0;
  let retainedWidth = 0;
  let sliceVx = 0;
  let sliceAngularVel = 0;

  if (dx > 0) {
    // Moving layer dropped to the right of the previous layer
    overlap = previousLayer.width - dx;
    if (overlap >= MIN_LAYER_WIDTH) {
      retainedX = movingLayer.x;
      retainedWidth = overlap;
      sliceX = previousLayer.x + previousLayer.width;
      sliceWidth = dx;
      sliceVx = 2.0 + Math.random() * 1.5;
      sliceAngularVel = 0.08;
    }
  } else {
    // Moving layer dropped to the left of the previous layer (dx < 0)
    overlap = previousLayer.width + dx;
    if (overlap >= MIN_LAYER_WIDTH) {
      retainedX = previousLayer.x;
      retainedWidth = overlap;
      sliceX = movingLayer.x;
      sliceWidth = -dx;
      sliceVx = -2.0 - Math.random() * 1.5;
      sliceAngularVel = -0.08;
    }
  }

  // If overlap is too thin or zero, it is a complete miss
  if (overlap < MIN_LAYER_WIDTH) {
    // Whole layer falls away
    const fallingSlice: FallingSlice = {
      id: Date.now() + Math.random(),
      x: movingLayer.x,
      y: movingLayer.y,
      width: movingLayer.width,
      height: movingLayer.height,
      vx: dx >= 0 ? 3.0 : -3.0,
      vy: -1.0,
      rotation: 0,
      angularVelocity: dx >= 0 ? 0.09 : -0.09,
      alpha: 1,
      flavorIndex: movingLayer.flavorIndex,
      specialType: movingLayer.specialType
    };

    return {
      type: 'miss',
      retainedLayer: movingLayer,
      fallingSlice,
      dx,
      widthDelta: -movingLayer.width
    };
  }

  // Sliced off overhang piece
  const fallingSlice: FallingSlice = {
    id: Date.now() + Math.random(),
    x: sliceX,
    y: movingLayer.y,
    width: sliceWidth,
    height: movingLayer.height,
    vx: sliceVx,
    vy: -1.2,
    rotation: 0,
    angularVelocity: sliceAngularVel,
    alpha: 1,
    flavorIndex: movingLayer.flavorIndex,
    specialType: movingLayer.specialType
  };

  let specialEffect: 'golden_3x' | 'rainbow_boost' | 'strawberry_rescue' | undefined;
  if (movingLayer.specialType === 'strawberry') {
    const restored = Math.min(INITIAL_LAYER_WIDTH, retainedWidth + STRAWBERRY_RESCUE_AMOUNT);
    const midX = retainedX + retainedWidth / 2;
    retainedX = Math.max(10, Math.min(CANVAS_WIDTH - restored - 10, midX - restored / 2));
    retainedWidth = restored;
    specialEffect = 'strawberry_rescue';
  } else if (movingLayer.specialType === 'golden') {
    specialEffect = 'golden_3x';
  } else if (movingLayer.specialType === 'rainbow') {
    specialEffect = 'rainbow_boost';
  }

  const retainedLayer: CakeLayer = {
    ...movingLayer,
    x: retainedX,
    width: retainedWidth
  };

  return {
    type: 'overlap',
    retainedLayer,
    fallingSlice,
    dx,
    widthDelta: retainedWidth - previousLayer.width,
    specialEffect
  };
}

/**
 * Updates falling slice physics (gravity, horizontal velocity, air resistance, rotation).
 * Returns false when the slice falls completely out of bounds.
 */
export function updateFallingSlice(
  slice: FallingSlice,
  canvasHeight: number = CANVAS_HEIGHT,
  dtScale: number = 1.0
): boolean {
  slice.x += slice.vx * dtScale;
  slice.y += slice.vy * dtScale;
  slice.vy += 0.38 * dtScale; // gravity
  slice.rotation += slice.angularVelocity * dtScale;
  slice.alpha = Math.max(0, slice.alpha - 0.008 * dtScale);

  return slice.y < canvasHeight + 150 && slice.alpha > 0.05;
}

/**
 * Computes score earned based on placement type, streak, and special bonuses.
 */
export function calculateScore(
  placementType: 'perfect' | 'overlap',
  streak: number,
  specialType: SpecialLayerType
): { points: number; comboText: string; isMilestone: boolean } {
  let basePoints = placementType === 'perfect' ? 100 : 35;
  let comboText = '';
  let isMilestone = false;

  if (placementType === 'perfect') {
    // Multiplier increases every 2 streak increments: 1x, 2x, 3x, 4x, etc.
    const multiplier = 1 + Math.floor(streak / 2);
    basePoints *= multiplier;

    if (streak >= 2) {
      comboText = `PERFECT x${streak}!`;
    } else {
      comboText = 'PERFECT!';
    }

    if (streak === 5 || streak === 10 || streak === 15 || streak === 20 || streak === 30) {
      isMilestone = true;
      basePoints += streak * 50; // extra milestone jackpot!
    }
  } else {
    comboText = 'NICE CUT!';
  }

  if (specialType === 'golden') {
    basePoints *= 3;
    comboText = comboText ? `${comboText} • GOLD 3X!` : 'GOLDEN BONUS 3X!';
  } else if (specialType === 'rainbow') {
    basePoints *= 2;
    comboText = comboText ? `${comboText} • RAINBOW BOOST!` : 'RAINBOW BOOST!';
  } else if (specialType === 'strawberry') {
    basePoints += 150;
    comboText = '🍓 CAKE EXPANDED!';
  }

  return { points: basePoints, comboText, isMilestone };
}

/**
 * Returns streak medal if player reached required milestone.
 */
export function getStreakMedal(streak: number): MedalInfo | null {
  for (let i = STREAK_MEDALS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_MEDALS[i].streakRequired) {
      return STREAK_MEDALS[i];
    }
  }
  return null;
}
