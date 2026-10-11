// 3D Perspective Camera & Highway World Geometry Constants
export const ROAD_LANES = 4;
export const LANE_CENTERS = [-0.75, -0.25, 0.25, 0.75]; // Normalized road centers
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

  const collisionHitbox = (playerWidth + carWidth) * 0.48; // ~0.22
  if (zOverlap && xDistance < collisionHitbox) {
    return 'COLLISION';
  }
  if (playerSpeed >= 95 && carZ < playerZFront && carZ > playerZBack - 0.8 && xDistance < 0.38 && xDistance >= collisionHitbox) {
    return 'NEAR_MISS';
  }
  return 'SAFE';
};
