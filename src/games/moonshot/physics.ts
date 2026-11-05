import type {
  Rocket,
  LandingPad,
  TerrainPoint,
  Vector2D,
  ContactPoints,
  LandingEvaluation,
  Target,
  Projectile
} from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Physics constants
export const GRAVITY = 66; // px / s^2 (gentle lunar gravity)
export const THRUST_FORCE = 165; // px / s^2 (powerful enough to comfortably climb)
export const ROTATION_SPEED = 3.4; // rad / s (~195 deg/s)
export const FUEL_CONSUMPTION_RATE = 14.0; // fuel units consumed per second of thrust
export const GEAR_SPEED = 3.6; // gear extension per second (full deploy in ~0.28s)

// Landing safety thresholds
export const MAX_LANDING_VX = 28; // px / s
export const MAX_LANDING_VY = 44; // px / s
export const MAX_LANDING_SPEED = 50; // px / s
export const MAX_LANDING_ANGLE = 0.28; // ~16 degrees from vertical

/**
 * Calculates world-space contact points for the rocket given position, angle, and gear extension
 */
export function getRocketContactPoints(rocket: Rocket): ContactPoints {
  const { x, y, angle, gearExtension } = rocket;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Helper to transform local offset to world position
  const toWorld = (lx: number, ly: number): Vector2D => ({
    x: x + lx * cos - ly * sin,
    y: y + lx * sin + ly * cos
  });

  // Nose tip
  const nose = toWorld(0, -14);

  // Left & right foot contact points (extend downward and outward when gear is active)
  // When retracted (0): tuck close to body (-5, 9)
  // When deployed (1): extend out and down (-11, 14)
  const footX = 5 + 6 * gearExtension;
  const footY = 9 + 5 * gearExtension;

  const leftFoot = toWorld(-footX, footY);
  const rightFoot = toWorld(footX, footY);

  const leftEngine = toWorld(-6, 9);
  const rightEngine = toWorld(6, 9);

  return {
    nose,
    leftFoot,
    rightFoot,
    leftEngine,
    rightEngine
  };
}

/**
 * Line segment intersection test
 */
export function linesIntersect(
  p1: Vector2D,
  p2: Vector2D,
  p3: Vector2D,
  p4: Vector2D
): boolean {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return false;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Evaluates whether rocket is in safe landing contact with any landing pad
 */
export function evaluateLanding(
  rocket: Rocket,
  pads: LandingPad[]
): { inContact: boolean; evaluation: LandingEvaluation } {
  const contacts = getRocketContactPoints(rocket);
  const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
  const absAngle = Math.abs(normalizeAngle(rocket.angle));

  for (const pad of pads) {
    // Check if rocket feet are near the pad surface
    const padY = pad.y;
    const padMinX = pad.x1;
    const padMaxX = pad.x2;

    // Contact occurs when the feet or base reach pad height while within pad vicinity
    const feetBelowPad =
      (contacts.leftFoot.y >= padY - 3 && contacts.leftFoot.y <= padY + 8) ||
      (contacts.rightFoot.y >= padY - 3 && contacts.rightFoot.y <= padY + 8) ||
      (rocket.y >= padY - 14 && rocket.y <= padY + 4);

    const horizontallyNearPad =
      rocket.x >= padMinX - 25 && rocket.x <= padMaxX + 25;

    if (feetBelowPad && horizontallyNearPad) {
      // Rocket is touching pad area!
      // Check landing gear deployment
      if (rocket.gearExtension < 0.92) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: 'CRASH! Landing gear was not deployed.',
            pad
          }
        };
      }

      // Check horizontal bounds (both feet must be on pad)
      if (
        contacts.leftFoot.x < padMinX - 2 ||
        contacts.rightFoot.x > padMaxX + 2
      ) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: 'CRASH! Landed off the edge of the pad.',
            pad
          }
        };
      }

      // Check angle
      if (absAngle > MAX_LANDING_ANGLE) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: `CRASH! Tilt angle too steep (${(absAngle * (180 / Math.PI)).toFixed(1)}° > 16°).`,
            pad
          }
        };
      }

      // Check vertical velocity
      if (rocket.vy > MAX_LANDING_VY) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: `CRASH! Downward speed too high (${rocket.vy.toFixed(1)} > ${MAX_LANDING_VY} px/s).`,
            pad
          }
        };
      }

      // Check horizontal velocity
      if (Math.abs(rocket.vx) > MAX_LANDING_VX) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: `CRASH! Lateral speed too high (${Math.abs(rocket.vx).toFixed(1)} > ${MAX_LANDING_VX} px/s).`,
            pad
          }
        };
      }

      // Check total speed
      if (speed > MAX_LANDING_SPEED) {
        return {
          inContact: true,
          evaluation: {
            isSafe: false,
            reason: `CRASH! Impact speed too high (${speed.toFixed(1)} > ${MAX_LANDING_SPEED} px/s).`,
            pad
          }
        };
      }

      // All safe criteria met!
      return {
        inContact: true,
        evaluation: {
          isSafe: true,
          pad
        }
      };
    }
  }

  return {
    inContact: false,
    evaluation: { isSafe: false }
  };
}

/**
 * Checks if rocket geometry collides with terrain segments
 */
export function checkTerrainCollision(
  rocket: Rocket,
  terrain: TerrainPoint[],
  pads: LandingPad[]
): boolean {
  const contacts = getRocketContactPoints(rocket);

  // Rocket bounding segments:
  // nose -> leftFoot, leftFoot -> rightFoot, rightFoot -> nose
  const rocketSegments: [Vector2D, Vector2D][] = [
    [contacts.nose, contacts.leftFoot],
    [contacts.leftFoot, contacts.rightFoot],
    [contacts.rightFoot, contacts.nose],
    [contacts.leftEngine, contacts.rightEngine]
  ];

  // Helper: check if a point lies in a landing pad safe clearance zone
  const isInsidePadZone = (pt: Vector2D) => {
    return pads.some(
      (pad) =>
        pt.x >= pad.x1 - 4 &&
        pt.x <= pad.x2 + 4 &&
        Math.abs(pt.y - pad.y) <= 6
    );
  };

  // Check each terrain line segment
  for (let i = 0; i < terrain.length - 1; i++) {
    const t1 = terrain[i];
    const t2 = terrain[i + 1];

    // Skip segments directly overlapping a landing pad surface
    const isPadSegment = pads.some(
      (pad) =>
        Math.abs(t1.y - pad.y) <= 2 &&
        Math.abs(t2.y - pad.y) <= 2 &&
        Math.min(t1.x, t2.x) >= pad.x1 - 5 &&
        Math.max(t1.x, t2.x) <= pad.x2 + 5
    );
    if (isPadSegment) continue;

    for (const [r1, r2] of rocketSegments) {
      if (linesIntersect(r1, r2, t1, t2)) {
        // If the intersecting point is not on a landing pad, it's a terrain crash
        if (!isInsidePadZone(r1) && !isInsidePadZone(r2)) {
          return true;
        }
      }
    }
  }

  // Also check if any key rocket vertex has penetrated below the terrain line directly
  for (const pt of [contacts.nose, contacts.leftFoot, contacts.rightFoot]) {
    if (isInsidePadZone(pt)) continue;
    const groundY = getTerrainHeightAt(terrain, pt.x);
    if (groundY !== null && pt.y >= groundY) {
      return true;
    }
  }

  return false;
}

/**
 * Returns height of terrain at a given X coordinate
 */
export function getTerrainHeightAt(
  terrain: TerrainPoint[],
  x: number
): number | null {
  for (let i = 0; i < terrain.length - 1; i++) {
    const t1 = terrain[i];
    const t2 = terrain[i + 1];
    if (x >= Math.min(t1.x, t2.x) && x <= Math.max(t1.x, t2.x)) {
      if (Math.abs(t2.x - t1.x) < 1e-4) return t1.y;
      const progress = (x - t1.x) / (t2.x - t1.x);
      return t1.y + progress * (t2.y - t1.y);
    }
  }
  return null;
}

/**
 * Normalizes angle to range [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Physics step for the rocket
 */
export function updateRocketPhysics(rocket: Rocket, dt: number): void {
  // 1. Rotation handling
  if (rocket.isRotatingLeft) {
    rocket.angle -= ROTATION_SPEED * dt;
  }
  if (rocket.isRotatingRight) {
    rocket.angle += ROTATION_SPEED * dt;
  }
  rocket.angle = normalizeAngle(rocket.angle);

  // 2. Thrust & fuel handling
  if (rocket.isThrusting && rocket.fuel > 0) {
    // Consume fuel
    rocket.fuel = Math.max(0, rocket.fuel - FUEL_CONSUMPTION_RATE * dt);

    // Apply thrust along rocket's forward orientation
    // Angle 0 is straight up, so direction is (sin(angle), -cos(angle))
    const thrustX = Math.sin(rocket.angle) * THRUST_FORCE;
    const thrustY = -Math.cos(rocket.angle) * THRUST_FORCE;

    rocket.vx += thrustX * dt;
    rocket.vy += thrustY * dt;
  }

  // 3. Gravity
  rocket.vy += GRAVITY * dt;

  // 4. Subtle space vacuum damping to prevent runaway speed
  rocket.vx *= 0.999;
  rocket.vy *= 0.999;

  // Clamp max speed
  const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
  if (speed > 420) {
    const ratio = 420 / speed;
    rocket.vx *= ratio;
    rocket.vy *= ratio;
  }

  // 5. Apply velocity
  rocket.x += rocket.vx * dt;
  rocket.y += rocket.vy * dt;

  // 6. Landing gear transit animation
  if (rocket.gearExtension !== rocket.gearTarget) {
    if (rocket.gearTarget > rocket.gearExtension) {
      rocket.gearExtension = Math.min(
        1.0,
        rocket.gearExtension + GEAR_SPEED * dt
      );
    } else {
      rocket.gearExtension = Math.max(
        0.0,
        rocket.gearExtension - GEAR_SPEED * dt
      );
    }
  }

  // 7. World boundaries
  if (rocket.x < 10) {
    rocket.x = 10;
    rocket.vx = Math.abs(rocket.vx) * 0.3; // gentle bounce off left wall
  } else if (rocket.x > CANVAS_WIDTH - 10) {
    rocket.x = CANVAS_WIDTH - 10;
    rocket.vx = -Math.abs(rocket.vx) * 0.3; // gentle bounce off right wall
  }

  if (rocket.y < 8) {
    rocket.y = 8;
    rocket.vy = Math.max(0, rocket.vy);
  }
}

/**
 * Checks circle-circle or circle-point collision between projectile and target
 */
export function checkProjectileTargetCollision(
  proj: Projectile,
  target: Target
): boolean {
  const dx = proj.x - target.x;
  const dy = proj.y - target.y;
  const distSq = dx * dx + dy * dy;
  const hitRadius = target.radius + 4;
  return distSq <= hitRadius * hitRadius;
}
