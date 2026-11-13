import {
  ROAD_LANES,
  LANE_CENTERS,
  LANE_CHANGE_DURATION,
  computeShiftedLane,
  smoothstep,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HORIZON_Y,
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  ROAD_WORLD_WIDTH,
  CAR_WORLD_WIDTH,
  CAR_WORLD_HEIGHT,
  DRAW_DISTANCE,
  PLAYER_Z,
  clampLane,
  getLaneCenter,
  MAX_SPEED,
  CRUISE_ACCEL,
  BRAKE_DECEL,
  NATURAL_DECEL,
  MIN_SPEED,
  project3D,
  evaluateTrafficInteraction
} from '../src/games/retro-racing/racingPhysics';

console.log('--- Testing Highway Rush Long Run Simulation ---');

const s = {
  gameState: 'GAME',
  difficulty: 'MEDIUM',
  trafficDensityInterval: 1.1,
  maxTrafficCount: 8,
  speedMultiplier: 1.0,
  keyAccelerate: true,
  keyBrake: false,
  playerLane: 1,
  playerX: LANE_CENTERS[1],
  laneChangeFromX: LANE_CENTERS[1],
  laneChangeToX: LANE_CENTERS[1],
  laneChangeProgress: 1.0,
  isChangingLane: false,
  chassisTilt: 0,
  speed: 180,
  distance: 0,
  score: 0,
  combo: 1,
  comboTimer: 0,
  maxComboAchieved: 1,
  nearMisses: 0,
  crashAnimation: 0,
  roadTrackZ: 0,
  roadCurve: 0,
  currentCurve: 0,
  curveTimer: 0,
  traffic: [] as any[],
  trafficIdCounter: 1,
  lastSpawnTime: 0,
  floatingTexts: [] as any[],
  cameraShake: 0
};

let frame = 0;
let currentTime = 0;
const dt = 1 / 60;

function spawnTraffic(currentTimeSec: number) {
  if (s.traffic.length >= s.maxTrafficCount) return;
  if (currentTimeSec - s.lastSpawnTime < s.trafficDensityInterval) return;
  const candidateLanes = [0, 1, 2, 3].filter((lane) => {
    return !s.traffic.some((t) => t.lane === lane && t.z > DRAW_DISTANCE - 10);
  });
  if (candidateLanes.length === 0) return;
  const chosenLane = candidateLanes[Math.floor(Math.random() * candidateLanes.length)];
  const spawnZ = DRAW_DISTANCE + (Math.random() * 5);
  const baseSpeed = (80 + Math.random() * 45) * s.speedMultiplier;
  s.traffic.push({
    id: s.trafficIdCounter++,
    lane: chosenLane,
    x: LANE_CENTERS[chosenLane],
    targetX: LANE_CENTERS[chosenLane],
    z: spawnZ,
    speed: baseSpeed,
    baseSpeed,
    carColor: 'blue',
    widthNorm: 0.15,
    lengthZ: 1.1,
    isChangingLane: false,
    laneChangeTimer: 0,
    passed: false,
    nearMissAwarded: false,
  });
  s.lastSpawnTime = currentTimeSec;
}

const milestones = [5000, 10000, 20000, 30000, 40000, 50000];
let nextMilestoneIdx = 0;

for (frame = 0; frame < 150000; frame++) {
  currentTime += 1000 / 60;
  if (s.keyAccelerate) s.speed += CRUISE_ACCEL * dt;
  s.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, s.speed));

  if (!s.isChangingLane && Math.random() < 0.05) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const target = computeShiftedLane(s.playerLane, dir as -1 | 1);
    if (target !== s.playerLane) {
      s.laneChangeFromX = s.playerX;
      s.laneChangeToX = LANE_CENTERS[target];
      s.playerLane = target;
      s.laneChangeProgress = 0;
      s.isChangingLane = true;
    }
  }

  if (s.isChangingLane) {
    s.laneChangeProgress += dt / LANE_CHANGE_DURATION;
    if (s.laneChangeProgress >= 1.0) {
      s.laneChangeProgress = 1.0;
      s.isChangingLane = false;
      s.playerX = LANE_CENTERS[s.playerLane];
      s.chassisTilt = 0;
    } else {
      const eased = smoothstep(s.laneChangeProgress);
      s.playerX = s.laneChangeFromX + (s.laneChangeToX - s.laneChangeFromX) * eased;
    }
  }

  s.curveTimer -= dt;
  if (s.curveTimer <= 0) {
    s.curveTimer = 4.0 + Math.random() * 4.0;
    s.roadCurve = (Math.random() - 0.5) * 1.6;
  }
  s.currentCurve += (s.roadCurve - s.currentCurve) * (dt * 0.8);

  const speedMps = (s.speed * 1000) / 3600;
  s.distance += speedMps * dt;
  s.roadTrackZ += (speedMps * dt) * 0.5;

  const speedScore = Math.floor((s.speed / 10) * dt * 8 * s.combo);
  s.score += speedScore;

  if (s.comboTimer > 0) {
    s.comboTimer -= dt;
    if (s.comboTimer <= 0) s.combo = 1;
  }

  spawnTraffic(currentTime / 1000.0);

  for (let i = s.traffic.length - 1; i >= 0; i--) {
    const car = s.traffic[i];
    const trafficSpeedMps = (car.speed * 1000) / 3600;
    const relSpeedMps = trafficSpeedMps - speedMps;
    car.z += (relSpeedMps * 0.1) * dt;

    const interaction = evaluateTrafficInteraction(s.playerX, s.speed, car.x, car.z);
    if (interaction === 'COLLISION') {
      // Simulate player dodging
      s.playerX = s.playerX > 0 ? -0.5 : 0.5;
    }
    if (interaction === 'NEAR_MISS' && !car.nearMissAwarded) {
      car.nearMissAwarded = true;
      s.nearMisses++;
      s.combo = Math.min(10, s.combo + 1);
      s.comboTimer = 3.5;
      s.score += 350 * s.combo;
      s.floatingTexts.push({ text: 'Near miss', opacity: 1, y: 300 });
    }
    if (!car.passed && car.z < 0.8) {
      car.passed = true;
      s.score += 50 * s.combo;
    }
    if (car.z < -6.0 || car.z > DRAW_DISTANCE + 10.0) {
      s.traffic.splice(i, 1);
    }
  }

  // Floating text update
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    const ft = s.floatingTexts[i];
    ft.y -= 45 * dt;
    ft.opacity -= 0.8 * dt;
    if (ft.opacity <= 0) s.floatingTexts.splice(i, 1);
  }

  if (nextMilestoneIdx < milestones.length && s.score >= milestones[nextMilestoneIdx]) {
    console.log(
      `Milestone reached: Score ${s.score} at frame ${frame} (traffic count: ${s.traffic.length}, distance: ${(s.distance / 1000).toFixed(2)} km, roadTrackZ: ${s.roadTrackZ.toFixed(1)})`
    );
    nextMilestoneIdx++;
  }

  if (s.score >= 60000) break;
}

console.log('Simulation finished successfully! Final Score:', s.score, 'frames:', frame);
