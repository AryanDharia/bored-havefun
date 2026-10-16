import type { LevelConfig } from './types';

const TILE_SIZE = 24;
const ROWS = 15; // 15 * 24 = 360px height

function createEmptyGrid(cols: number, rows: number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push(new Array(cols).fill(0));
  }
  return grid;
}

// ==========================================
// LEVEL 1: GREEN VALLEY
// ==========================================
function buildLevel1(): LevelConfig {
  const COLS = 95;
  const grid = createEmptyGrid(COLS, ROWS);

  // Helper to fill rectangle of tiles
  const fill = (r1: number, c1: number, r2: number, c2: number, type: number) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          grid[r][c] = type;
        }
      }
    }
  };

  // Section 1: Starting plains (Cols 0 to 18)
  fill(12, 0, 14, 18, 1);

  // Section 2: First small gap (Cols 19-20 is pit), Island (Cols 21 to 28)
  fill(12, 21, 14, 28, 1);

  // Floating platforms (one-way type 2)
  fill(9, 23, 9, 26, 2);

  // Section 3: Pit (29-30), Island with step-up (Cols 31 to 42)
  fill(12, 31, 14, 42, 1);
  fill(10, 36, 11, 42, 1);

  // Section 4: Checkpoint plateau (Cols 43 to 54)
  fill(10, 43, 14, 54, 1);

  // High secret island reached by spring (Cols 46 to 51 at row 5)
  fill(5, 46, 5, 51, 2);

  // Section 5: River chasm (Cols 55 to 68) with floor spikes
  fill(14, 55, 14, 68, 1);
  fill(13, 56, 13, 67, 3); // Spikes along chasm bed

  // Middle rest pillar (Cols 61 to 62)
  fill(10, 61, 14, 62, 1);

  // Section 6: Landing hill & ascending steps (Cols 69 to 82)
  fill(12, 69, 14, 82, 1);
  fill(11, 73, 14, 82, 1);
  fill(10, 77, 14, 82, 1);

  // Floating high steps (Cols 80-84)
  fill(7, 81, 7, 85, 2);

  // Section 7: Final Summit with finish flag (Cols 85 to 94)
  fill(9, 85, 14, 94, 1);

  // Moving Platforms
  const movingPlatforms = [
    // Oscillating horizontally over the chasm (Cols 56-60)
    {
      id: 'mp-1-1',
      x: 55 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 54 * TILE_SIZE,
      startY: 9 * TILE_SIZE,
      endX: 60 * TILE_SIZE,
      endY: 9 * TILE_SIZE,
      speed: 1.2,
    },
    // Oscillating horizontally over second half of chasm (Cols 63-68)
    {
      id: 'mp-1-2',
      x: 63 * TILE_SIZE,
      y: 8 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 63 * TILE_SIZE,
      startY: 8 * TILE_SIZE,
      endX: 68 * TILE_SIZE,
      endY: 8 * TILE_SIZE,
      speed: 1.4,
    },
  ];

  // Springs (boing pads)
  const springs = [
    // Spring on checkpoint plateau launching to high coin island
    { x: 44 * TILE_SIZE, y: 9 * TILE_SIZE },
    // Spring on landing hill launching to summit shortcuts
    { x: 74 * TILE_SIZE, y: 10 * TILE_SIZE },
  ];

  // Coins
  const coins: { x: number; y: number }[] = [
    // Intro coin arc
    { x: 7 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 8 * TILE_SIZE, y: 9 * TILE_SIZE },
    { x: 9 * TILE_SIZE, y: 9 * TILE_SIZE },
    { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE },
    // Floating platform coins
    { x: 24 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 25 * TILE_SIZE, y: 7 * TILE_SIZE },
    // Stash on high secret island
    { x: 47 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 48 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 49 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 50 * TILE_SIZE, y: 3 * TILE_SIZE },
    // Over chasm
    { x: 57 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 61 * TILE_SIZE, y: 8 * TILE_SIZE },
    { x: 65 * TILE_SIZE, y: 6 * TILE_SIZE },
    // Summit coins
    { x: 82 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 83 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 88 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 89 * TILE_SIZE, y: 7 * TILE_SIZE },
  ];

  // Enemies
  const enemies = [
    // Ground Crawlers
    {
      type: 'crawler' as const,
      x: 12 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      minX: 10 * TILE_SIZE,
      maxX: 17 * TILE_SIZE,
    },
    {
      type: 'crawler' as const,
      x: 23 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      minX: 21 * TILE_SIZE,
      maxX: 27 * TILE_SIZE,
    },
    {
      type: 'crawler' as const,
      x: 38 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      minX: 36 * TILE_SIZE,
      maxX: 41 * TILE_SIZE,
    },
    // Flying Drone over hill
    {
      type: 'drone' as const,
      x: 75 * TILE_SIZE,
      y: 6 * TILE_SIZE,
      minX: 72 * TILE_SIZE,
      maxX: 79 * TILE_SIZE,
    },
  ];

  return {
    id: 1,
    name: 'Green Valley',
    theme: 'valley',
    width: COLS,
    height: ROWS,
    tileSize: TILE_SIZE,
    playerStart: { x: 3 * TILE_SIZE, y: 10 * TILE_SIZE },
    checkpoint: { x: 47 * TILE_SIZE, y: 8 * TILE_SIZE },
    finish: { x: 90 * TILE_SIZE, y: 7 * TILE_SIZE },
    tiles: grid,
    movingPlatforms,
    springs,
    coins,
    enemies,
  };
}

// ==========================================
// LEVEL 2: AMBER CAVERNS
// ==========================================
function buildLevel2(): LevelConfig {
  const COLS = 105;
  const grid = createEmptyGrid(COLS, ROWS);

  const fill = (r1: number, c1: number, r2: number, c2: number, type: number) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          grid[r][c] = type;
        }
      }
    }
  };

  // Ceiling stalactites & rock roof throughout
  fill(0, 0, 1, COLS - 1, 1);

  // Section 1: Entrance cavern (Cols 0 to 14)
  fill(12, 0, 14, 14, 1);

  // Section 2: Crystal stepping stones over spike pit (Cols 15 to 30)
  fill(14, 15, 14, 30, 1);
  fill(13, 15, 13, 30, 3); // Spikes
  fill(10, 17, 10, 19, 2);
  fill(8, 22, 8, 25, 2);
  fill(10, 27, 10, 29, 2);

  // Section 3: Mid Plateau (Cols 31 to 40)
  fill(11, 31, 14, 40, 1);

  // Section 4: Vertical shaft with bounce spring (Cols 41 to 52)
  fill(12, 41, 14, 52, 1);
  fill(7, 44, 7, 48, 2); // High ledge
  fill(4, 47, 4, 51, 2); // Super high secret ledge

  // Section 5: Checkpoint Chamber (Cols 53 to 64)
  fill(9, 53, 14, 64, 1);

  // Section 6: Long Abyss with vertical & horizontal moving platforms (Cols 65 to 84)
  fill(14, 65, 14, 84, 1);
  fill(13, 65, 13, 84, 3); // Spikes

  // Section 7: Final Crystal Ledge & Exit Portal (Cols 85 to 104)
  fill(11, 85, 14, 94, 1);
  fill(9, 95, 14, 104, 1);

  // Moving Platforms
  const movingPlatforms = [
    // Vertical elevator platform in cavern (Cols 35-37)
    {
      id: 'mp-2-1',
      x: 37 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 37 * TILE_SIZE,
      startY: 10 * TILE_SIZE,
      endX: 37 * TILE_SIZE,
      endY: 4 * TILE_SIZE,
      speed: 1.0,
    },
    // Horizontal platform over spike abyss (Cols 66-72)
    {
      id: 'mp-2-2',
      x: 67 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 66 * TILE_SIZE,
      startY: 9 * TILE_SIZE,
      endX: 74 * TILE_SIZE,
      endY: 9 * TILE_SIZE,
      speed: 1.5,
    },
    // Vertical moving platform over spike abyss (Cols 76-82)
    {
      id: 'mp-2-3',
      x: 77 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 77 * TILE_SIZE,
      startY: 10 * TILE_SIZE,
      endX: 77 * TILE_SIZE,
      endY: 5 * TILE_SIZE,
      speed: 1.2,
    },
  ];

  // Springs
  const springs = [
    // Launch up the vertical shaft
    { x: 42 * TILE_SIZE, y: 11 * TILE_SIZE },
    // Launch across the spike ledge
    { x: 88 * TILE_SIZE, y: 10 * TILE_SIZE },
  ];

  // Coins
  const coins = [
    { x: 6 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 7 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 18 * TILE_SIZE, y: 8 * TILE_SIZE },
    { x: 23 * TILE_SIZE, y: 6 * TILE_SIZE },
    { x: 28 * TILE_SIZE, y: 8 * TILE_SIZE },
    // High shaft treasure
    { x: 45 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 46 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 48 * TILE_SIZE, y: 2 * TILE_SIZE },
    { x: 49 * TILE_SIZE, y: 2 * TILE_SIZE },
    { x: 50 * TILE_SIZE, y: 2 * TILE_SIZE },
    // Over abyss
    { x: 70 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 77 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 81 * TILE_SIZE, y: 7 * TILE_SIZE },
    // Exit coins
    { x: 91 * TILE_SIZE, y: 9 * TILE_SIZE },
    { x: 92 * TILE_SIZE, y: 9 * TILE_SIZE },
    { x: 98 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 99 * TILE_SIZE, y: 7 * TILE_SIZE },
  ];

  // Enemies
  const enemies = [
    // Patrols in entry cavern
    {
      type: 'crawler' as const,
      x: 8 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      minX: 5 * TILE_SIZE,
      maxX: 12 * TILE_SIZE,
    },
    // Flying Drone guarding stepping stones
    {
      type: 'drone' as const,
      x: 23 * TILE_SIZE,
      y: 4 * TILE_SIZE,
      minX: 19 * TILE_SIZE,
      maxX: 27 * TILE_SIZE,
    },
    // Crawler on mid plateau
    {
      type: 'crawler' as const,
      x: 35 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      minX: 32 * TILE_SIZE,
      maxX: 39 * TILE_SIZE,
    },
    // Drone hovering in abyss
    {
      type: 'drone' as const,
      x: 72 * TILE_SIZE,
      y: 5 * TILE_SIZE,
      minX: 68 * TILE_SIZE,
      maxX: 75 * TILE_SIZE,
    },
    // Final crawler before portal
    {
      type: 'crawler' as const,
      x: 90 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      minX: 86 * TILE_SIZE,
      maxX: 93 * TILE_SIZE,
    },
  ];

  return {
    id: 2,
    name: 'Amber Caverns',
    theme: 'cavern',
    width: COLS,
    height: ROWS,
    tileSize: TILE_SIZE,
    playerStart: { x: 3 * TILE_SIZE, y: 10 * TILE_SIZE },
    checkpoint: { x: 56 * TILE_SIZE, y: 7 * TILE_SIZE },
    finish: { x: 100 * TILE_SIZE, y: 7 * TILE_SIZE },
    tiles: grid,
    movingPlatforms,
    springs,
    coins,
    enemies,
  };
}

// ==========================================
// LEVEL 3: CYBER CITADEL
// ==========================================
function buildLevel3(): LevelConfig {
  const COLS = 120;
  const grid = createEmptyGrid(COLS, ROWS);

  const fill = (r1: number, c1: number, r2: number, c2: number, type: number) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          grid[r][c] = type;
        }
      }
    }
  };

  // Section 1: Citadel Base Deck (Cols 0 to 15)
  fill(12, 0, 14, 15, 1);

  // Section 2: Void Chasms with floating high-tech beams (Cols 16 to 34)
  fill(10, 17, 10, 20, 2);
  fill(8, 23, 8, 27, 2);
  fill(6, 29, 6, 33, 2);

  // Section 3: Central High-Tech Bastion (Cols 35 to 48)
  fill(11, 35, 14, 48, 1);
  fill(8, 40, 8, 44, 2); // Upper control deck

  // Section 4: Lasers / Spikes & Spring Launch Section (Cols 49 to 62)
  fill(12, 49, 14, 62, 1);
  fill(11, 52, 11, 55, 3); // Spikes on floor

  // Section 5: Checkpoint Sky Deck (Cols 63 to 75)
  fill(9, 63, 14, 75, 1);

  // Section 6: High Sky Route vs Low Hazard Route (Cols 76 to 98)
  // Low route with spikes & moving platform
  fill(14, 76, 14, 98, 1);
  fill(13, 76, 13, 98, 3);
  // High aerial route (floating beams)
  fill(7, 78, 7, 82, 2);
  fill(5, 85, 5, 89, 2);
  fill(7, 92, 7, 96, 2);

  // Section 7: Final Apex Summit (Cols 99 to 119)
  fill(11, 99, 14, 119, 1);
  fill(9, 106, 14, 119, 1);
  fill(7, 112, 14, 119, 1); // Apex podium for trophy flag

  // Moving Platforms
  const movingPlatforms = [
    // Fast horizontal transit over void (Cols 20-25)
    {
      id: 'mp-3-1',
      x: 20 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 20 * TILE_SIZE,
      startY: 9 * TILE_SIZE,
      endX: 25 * TILE_SIZE,
      endY: 9 * TILE_SIZE,
      speed: 1.8,
    },
    // High-altitude floating platform (Cols 78-85)
    {
      id: 'mp-3-2',
      x: 82 * TILE_SIZE,
      y: 6 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 80 * TILE_SIZE,
      startY: 6 * TILE_SIZE,
      endX: 87 * TILE_SIZE,
      endY: 6 * TILE_SIZE,
      speed: 1.6,
    },
    // Vertical lift to apex (Cols 96-98)
    {
      id: 'mp-3-3',
      x: 96 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      width: 48,
      height: 12,
      startX: 96 * TILE_SIZE,
      startY: 11 * TILE_SIZE,
      endX: 96 * TILE_SIZE,
      endY: 6 * TILE_SIZE,
      speed: 1.4,
    },
  ];

  // Springs
  const springs = [
    // Spring to clear floor spikes in Section 4
    { x: 50 * TILE_SIZE, y: 11 * TILE_SIZE },
    // High launch pad to access high aerial route
    { x: 74 * TILE_SIZE, y: 8 * TILE_SIZE },
    // Launch pad on low route to jump out
    { x: 93 * TILE_SIZE, y: 12 * TILE_SIZE },
  ];

  // Coins
  const coins = [
    // Starting deck
    { x: 7 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 8 * TILE_SIZE, y: 10 * TILE_SIZE },
    { x: 9 * TILE_SIZE, y: 10 * TILE_SIZE },
    // Floating beams
    { x: 18 * TILE_SIZE, y: 8 * TILE_SIZE },
    { x: 25 * TILE_SIZE, y: 6 * TILE_SIZE },
    { x: 31 * TILE_SIZE, y: 4 * TILE_SIZE },
    // Upper bastion deck
    { x: 41 * TILE_SIZE, y: 6 * TILE_SIZE },
    { x: 42 * TILE_SIZE, y: 6 * TILE_SIZE },
    { x: 43 * TILE_SIZE, y: 6 * TILE_SIZE },
    // High aerial arc
    { x: 80 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 86 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 87 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 88 * TILE_SIZE, y: 3 * TILE_SIZE },
    { x: 94 * TILE_SIZE, y: 5 * TILE_SIZE },
    // Apex victory trail
    { x: 102 * TILE_SIZE, y: 9 * TILE_SIZE },
    { x: 108 * TILE_SIZE, y: 7 * TILE_SIZE },
    { x: 113 * TILE_SIZE, y: 5 * TILE_SIZE },
    { x: 114 * TILE_SIZE, y: 5 * TILE_SIZE },
  ];

  // Enemies
  const enemies = [
    // Fast Crawler on deck
    {
      type: 'crawler' as const,
      x: 10 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      minX: 6 * TILE_SIZE,
      maxX: 14 * TILE_SIZE,
    },
    // Drone guarding void jump
    {
      type: 'drone' as const,
      x: 27 * TILE_SIZE,
      y: 5 * TILE_SIZE,
      minX: 23 * TILE_SIZE,
      maxX: 31 * TILE_SIZE,
    },
    // Crawler on bastion
    {
      type: 'crawler' as const,
      x: 44 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      minX: 37 * TILE_SIZE,
      maxX: 47 * TILE_SIZE,
    },
    // Drone guarding checkpoint
    {
      type: 'drone' as const,
      x: 58 * TILE_SIZE,
      y: 8 * TILE_SIZE,
      minX: 54 * TILE_SIZE,
      maxX: 61 * TILE_SIZE,
    },
    // Aerial Drone over high route
    {
      type: 'drone' as const,
      x: 84 * TILE_SIZE,
      y: 2 * TILE_SIZE,
      minX: 81 * TILE_SIZE,
      maxX: 89 * TILE_SIZE,
    },
    // Final Crawler before victory flag
    {
      type: 'crawler' as const,
      x: 103 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      minX: 100 * TILE_SIZE,
      maxX: 106 * TILE_SIZE,
    },
  ];

  return {
    id: 3,
    name: 'Cyber Citadel',
    theme: 'citadel',
    width: COLS,
    height: ROWS,
    tileSize: TILE_SIZE,
    playerStart: { x: 3 * TILE_SIZE, y: 10 * TILE_SIZE },
    checkpoint: { x: 67 * TILE_SIZE, y: 7 * TILE_SIZE },
    finish: { x: 114 * TILE_SIZE, y: 5 * TILE_SIZE },
    tiles: grid,
    movingPlatforms,
    springs,
    coins,
    enemies,
  };
}

export const LEVELS: LevelConfig[] = [
  buildLevel1(),
  buildLevel2(),
  buildLevel3(),
];
