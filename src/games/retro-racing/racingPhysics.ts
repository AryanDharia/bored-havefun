// 3D Perspective Camera & Highway World Geometry Constants
export const ROAD_LANES = 4;
export const LANE_CENTERS = [-0.75, -0.25, 0.25, 0.75] as const; // Normalized road centers (Lanes 1, 2, 3, 4)
export const LANE_DIVIDERS = [-0.5, 0.0, 0.5] as const;          // Visible lane divider coordinates
export const LANE_CHANGE_DURATION = 0.12;                        // Snappy 120ms transition for arcade responsiveness
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 720;
export const HORIZON_Y = 270;
export const CAMERA_DEPTH = 0.84;
export const CAMERA_HEIGHT = 686;       // World units
export const ROAD_WORLD_WIDTH = 2400;   // 4 lanes * 600
export const CAR_WORLD_WIDTH = 350;     // ~58% of lane
export const CAR_WORLD_HEIGHT = 270;    // 176x138 ratio (~1.29)
export const DRAW_DISTANCE = 55.0;      // Maximum visible horizon Z
export const PLAYER_Z = 1.6;            // Stable player position

// Discrete 4-Lane Helpers
export const clampLane = (lane: number): number => {
  return Math.max(0, Math.min(ROAD_LANES - 1, Math.round(lane)));
};

export const getLaneCenter = (lane: number): number => {
  return LANE_CENTERS[clampLane(lane)];
};

export const computeShiftedLane = (currentLane: number, direction: -1 | 1): number => {
  const target = currentLane + direction;
  return clampLane(target);
};

export const smoothstep = (t: number): number => {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
};

// Player Dynamics
export const MAX_SPEED = 240;           // km/h
export const CRUISE_ACCEL = 55;         // km/h per second
export const BRAKE_DECEL = 95;          // km/h per second
export const NATURAL_DECEL = 25;        // km/h per second coasting
export const MIN_SPEED = 30;            // km/h minimum roll

// Perspective Projection function
export const project3D = (normRoadX: number, worldZ: number, curveOffset = 0) => {
  if (worldZ <= 0.4) worldZ = 0.4;
  const scale = CAMERA_DEPTH / worldZ;
  const worldX = (normRoadX * (ROAD_WORLD_WIDTH * 0.5)) + curveOffset;
  const screenX = (CANVAS_WIDTH * 0.5) + (worldX * scale);
  const screenY = HORIZON_Y + (CAMERA_HEIGHT * scale);
  const roadWidthOnScreen = ROAD_WORLD_WIDTH * scale;
  const carWidthOnScreen = CAR_WORLD_WIDTH * scale;
  const carHeightOnScreen = CAR_WORLD_HEIGHT * scale;
  return {
    screenX,
    screenY,
    scale,
    roadWidthOnScreen,
    carWidthOnScreen,
    carHeightOnScreen
  };
};

// Hitbox evaluation function
export const evaluateTrafficInteraction = (playerX: number, playerSpeed: number, carX: number, carZ: number) => {
  const playerZFront = 2.4;
  const playerZBack = 0.9;
  const playerWidth = 0.22;
  const carWidth = 0.24;
  const zOverlap = carZ < playerZFront && carZ + 1.2 > playerZBack;
  const xDistance = Math.abs(playerX - carX);

  // Hitbox threshold for collision (~0.22) and adjacent-lane near-miss (~0.50)
  const collisionHitbox = (playerWidth + carWidth) * 0.48; // ~0.22
  if (zOverlap && xDistance < collisionHitbox) {
    return 'COLLISION';
  }
  // Passing traffic in adjacent lanes (distance ~0.50) at high speed (>=95 km/h) awards near-miss
  if (playerSpeed >= 95 && carZ < playerZFront && carZ > playerZBack - 0.8 && xDistance < 0.62 && xDistance >= collisionHitbox) {
    return 'NEAR_MISS';
  }
  return 'SAFE';
};
