import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { getHighScore, setStorageItem } from '../../lib/storage';
import { Gauge, Play } from 'lucide-react';

interface RoadSegment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  color: {
    grass: string;
    rumble: string;
    road: string;
    lane?: string;
  };
  sprites: RoadSprite[];
  cars: RivalCar[];
}

interface RoadSprite {
  type: 'tree' | 'billboard' | 'light' | 'grandstand' | 'finish';
  offset: number; // -2 to 2 (negative left, positive right)
  text?: string;
}

interface RivalCar {
  id: number;
  z: number;
  x: number;
  speed: number;
  color: string;
  name: string;
}

const NUM_RIVALS = 9; // 9 AI rivals + 1 player = 10 total racers
const RIVAL_COLORS = ['#ef4444', '#eab308', '#10b981', '#f97316', '#a855f7', '#ec4899', '#06b6d4', '#e2e8f0', '#fb923c'];
const RIVAL_NAMES = ['Prost', 'Senna', 'Mansell', 'Piquet', 'Berger', 'Alesi', 'Schumacher', 'Hill', 'Hakkinen'];

const SEGMENT_LENGTH = 200;
const DRAW_DISTANCE = 160;
const ROAD_WIDTH = 2000;
const CAMERA_HEIGHT = 1000;
const CAMERA_DEPTH = 0.84;
const TOTAL_SEGMENTS = 2000;
const TRACK_LENGTH = TOTAL_SEGMENTS * SEGMENT_LENGTH;
const TOTAL_LAPS = 3;
const MAX_SPEED = 12500; // ~185 MPH
const ACCEL = MAX_SPEED / 4.5;
const DECEL = -MAX_SPEED / 6.0;
const BRAKING = -MAX_SPEED / 2.2;
const OFFROAD_DECEL = -MAX_SPEED / 2.0;
const OFFROAD_LIMIT = MAX_SPEED / 3.0;

function formatTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "0'00\"00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${m}'${s.toString().padStart(2, '0')}"${cs.toString().padStart(2, '0')}`;
}

export const RetroRacing: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'retro-racing') || {
    id: 'retro-racing',
    name: 'Retro Racing',
    subtitle: 'Dodge traffic. Overtake rivals. Beat your best.',
    description: '16-bit pseudo-3D perspective arcade racer with traffic, rivals, and retro HUD.',
    icon: '🏎️',
    category: 'Arcade',
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 4,
    howToPlay: [
      'Accelerate with UP / W or Green Gas pedal.',
      'Steer with LEFT/RIGHT or Arrow keys to overtake traffic and take corners.',
      'Brake with DOWN / S or Red Brake pedal.',
      'Avoid collisions with rivals and stay on asphalt to maintain top speed.',
      'Complete 3 fast laps to finish 1st on the podium!'
    ],
    controls: [
      { key: '↑ / W / Gas', action: 'Accelerate' },
      { key: '← → / A D', action: 'Steer Left / Right' },
      { key: '↓ / S / Brake', action: 'Brake' },
      { key: 'P / Esc', action: 'Pause Race' }
    ],
    tags: ['arcade', 'racing', 'retro', 'speed', 'cars']
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'finished'>('ready');
  const [speedMph, setSpeedMph] = useState<number>(0);
  const [position, setPosition] = useState<number>(NUM_RIVALS + 1); // Start at last place = 10th
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [lapTime, setLapTime] = useState<number>(0);
  const [bestLapTime, setBestLapTime] = useState<number>(() => {
    return getHighScore('retro_racing_best_lap') || 0;
  });
  const [gapToLeader, setGapToLeader] = useState<number>(8.5);
  const [gameOverModal, setGameOverModal] = useState<boolean>(false);
  const [finalPosition, setFinalPosition] = useState<number>(NUM_RIVALS + 1);
  const [collisionFlash, setCollisionFlash] = useState<boolean>(false);
  const [trackProgress, setTrackProgress] = useState<number>(0);

  // Mobile virtual controls input state
  const touchSteerLeft = useRef<boolean>(false);
  const touchSteerRight = useRef<boolean>(false);
  const touchGas = useRef<boolean>(false);
  const touchBrake = useRef<boolean>(false);

  // Engine internal refs
  const roadRef = useRef<RoadSegment[]>([]);
  const rivalsRef = useRef<RivalCar[]>([]);
  const playerZRef = useRef<number>(0);
  const playerXRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const lapStartTimeRef = useRef<number>(0);
  const currentLapRef = useRef<number>(1);
  const lapTimesRef = useRef<number[]>([]);
  const shakeRef = useRef<number>(0);

  // Input keys
  const keysRef = useRef<{ left: boolean; right: boolean; faster: boolean; slower: boolean }>({
    left: false,
    right: false,
    faster: false,
    slower: false,
  });

  // Track builder
  const buildTrack = useCallback(() => {
    const segments: RoadSegment[] = [];

    const addSegment = (curve: number, y: number) => {
      const n = segments.length;
      const isEven = Math.floor(n / 4) % 2 === 0;

      const isFinishLine = n >= 0 && n <= 3;
      const color = {
        grass: isEven ? '#15803d' : '#166534',
        rumble: isEven ? '#ef4444' : '#f8fafc',
        road: isFinishLine && n === 1 ? '#e2e8f0' : isEven ? '#334155' : '#1e293b',
        lane: isEven ? '#f8fafc' : '#334155',
      };

      const sprites: RoadSprite[] = [];
      // Roadside scenery
      if (n % 16 === 0) {
        sprites.push({ type: 'tree', offset: -1.7 });
        sprites.push({ type: 'tree', offset: 1.7 });
      }
      if (n % 40 === 0) {
        sprites.push({ type: 'billboard', offset: -1.8, text: 'PLAYBREAK' });
      } else if (n % 60 === 20) {
        sprites.push({ type: 'billboard', offset: 1.8, text: 'TURBO' });
      }
      if (n % 24 === 8) {
        sprites.push({ type: 'light', offset: -1.4 });
        sprites.push({ type: 'light', offset: 1.4 });
      }
      if (n >= 10 && n <= 60 && n % 10 === 0) {
        sprites.push({ type: 'grandstand', offset: 2.1 });
      }

      segments.push({
        index: n,
        p1: { world: { x: 0, y: y, z: n * SEGMENT_LENGTH }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        p2: { world: { x: 0, y: y, z: (n + 1) * SEGMENT_LENGTH }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        curve,
        color,
        sprites,
        cars: [],
      });
    };

    const addSection = (num: number, curve: number, heightDelta: number = 0) => {
      const startY = segments.length > 0 ? segments[segments.length - 1].p2.world.y : 0;
      for (let i = 0; i < num; i++) {
        const y = startY + (heightDelta * Math.sin((i / num) * Math.PI));
        addSegment(curve, y);
      }
    };

    // Track layout: 2000 segments loop
    addSection(120, 0, 0);          // Start line straight
    addSection(150, 1.8, 600);      // Gentle hill right
    addSection(120, 0, -400);       // Straight down
    addSection(180, -2.4, 0);       // Sharp left turn
    addSection(160, 0, 800);        // Long rise straight
    addSection(140, 2.0, -800);     // Right downhill
    addSection(160, -1.8, 0);       // Chicane left
    addSection(160, 2.2, 0);        // Chicane right
    addSection(200, 0, 0);          // Fast straightaway
    addSection(180, -3.0, 300);     // Hairpin left
    addSection(150, 1.5, -300);     // Sweeper right
    addSection(280, 0, 0);          // Long home straight to finish

    roadRef.current = segments;

    // Spawn NUM_RIVALS AI cars (9 rivals + player = 10 total)
    const rivals: RivalCar[] = [];
    for (let i = 0; i < NUM_RIVALS; i++) {
      // Position rivals ahead along the track at staggered intervals
      const zPos = 600 * SEGMENT_LENGTH + i * (TRACK_LENGTH / (NUM_RIVALS + 2));
      const lane = ((i % 3) - 1) * 0.5;
      rivals.push({
        id: i,
        z: zPos % TRACK_LENGTH,
        x: lane,
        speed: MAX_SPEED * (0.60 + (i * 0.025)), // stagger speeds
        color: RIVAL_COLORS[i % RIVAL_COLORS.length],
        name: RIVAL_NAMES[i % RIVAL_NAMES.length],
      });
    }
    rivalsRef.current = rivals;
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.faster = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.slower = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) keysRef.current.faster = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keysRef.current.slower = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keysRef.current.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      sounds.stopEngineSound();
    };
  }, []);

  // Start / restart race
  const startRace = useCallback(() => {
    buildTrack();
    playerZRef.current = 0;
    playerXRef.current = 0;
    speedRef.current = 0;
    currentLapRef.current = 1;
    setCurrentLap(1);
    lapTimesRef.current = [];
    lapStartTimeRef.current = performance.now();
    setLapTime(0);
    setPosition(16);
    setGameOverModal(false);
    setGameState('playing');
    sounds.playMove();
  }, [buildTrack]);

  // Main game loop (RAF)
  useEffect(() => {
    if (gameState !== 'playing') {
      sounds.stopEngineSound();
      return;
    }

    let animId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const road = roadRef.current;
      const rivals = rivalsRef.current;
      const keys = keysRef.current;

      // Combine keyboard and touch input
      const isFaster = keys.faster || touchGas.current;
      const isSlower = keys.slower || touchBrake.current;
      const isLeft = keys.left || touchSteerLeft.current;
      const isRight = keys.right || touchSteerRight.current;

      // Physics acceleration & braking
      let currentSpeed = speedRef.current;
      if (isFaster) {
        currentSpeed += ACCEL * dt;
      } else if (isSlower) {
        currentSpeed += BRAKING * dt;
      } else {
        currentSpeed += DECEL * dt;
      }

      // Off-road penalty
      const isOffRoad = Math.abs(playerXRef.current) > 1.05;
      if (isOffRoad) {
        if (currentSpeed > OFFROAD_LIMIT) {
          currentSpeed += OFFROAD_DECEL * dt;
        }
        shakeRef.current = Math.min(shakeRef.current + 2, 6);
      } else {
        shakeRef.current = Math.max(shakeRef.current - 0.2, 0);
      }

      currentSpeed = Math.max(0, Math.min(currentSpeed, MAX_SPEED));
      speedRef.current = currentSpeed;
      const speedRatio = currentSpeed / MAX_SPEED;

      // Update engine audio pitch dynamically
      sounds.updateEngineSound(speedRatio);

      // Steering with centrifugal force
      const dx = dt * 2.2 * (currentSpeed / MAX_SPEED);
      if (isLeft) playerXRef.current -= dx;
      if (isRight) playerXRef.current += dx;

      // Current segment & curve pull
      const playerSegmentIndex = Math.floor(playerZRef.current / SEGMENT_LENGTH) % TOTAL_SEGMENTS;
      const playerSegment = road[playerSegmentIndex];
      if (playerSegment && playerSegment.curve !== 0) {
        playerXRef.current -= dx * (currentSpeed / MAX_SPEED) * playerSegment.curve * 1.6;
        if (Math.abs(playerSegment.curve) > 2.0 && currentSpeed > MAX_SPEED * 0.7) {
          if (Math.random() < 0.15) sounds.playTireScreech();
        }
      }

      // Constrain player position within landscape
      playerXRef.current = Math.max(-2.5, Math.min(playerXRef.current, 2.5));

      // Advance player position along track
      const prevZ = playerZRef.current;
      playerZRef.current += currentSpeed * dt;

      // Lap tracking
      const currentLapTimeSec = (time - lapStartTimeRef.current) / 1000;
      setLapTime(currentLapTimeSec);

      if (Math.floor(playerZRef.current / TRACK_LENGTH) > Math.floor(prevZ / TRACK_LENGTH)) {
        // Crossed lap finish line!
        sounds.playLapFanfare();
        lapTimesRef.current.push(currentLapTimeSec);

        // Update best lap record
        if (bestLapTime === 0 || currentLapTimeSec < bestLapTime) {
          setBestLapTime(currentLapTimeSec);
          setStorageItem('highscore_retro_racing_best_lap', Math.round(currentLapTimeSec));
        }

        if (currentLapRef.current >= TOTAL_LAPS) {
          // Finished race!
          setGameState('finished');
          setFinalPosition(position);
          setGameOverModal(true);
          sounds.playWin();
          return;
        } else {
          currentLapRef.current += 1;
          setCurrentLap(currentLapRef.current);
          lapStartTimeRef.current = time;
        }
      }

      // Advance AI rivals
      let carsAhead = 0;
      for (const rival of rivals) {
        rival.z = (rival.z + rival.speed * dt) % TRACK_LENGTH;

        // Lane wander AI
        if (Math.random() < 0.02) {
          rival.x += (Math.random() - 0.5) * 0.2;
          rival.x = Math.max(-0.85, Math.min(rival.x, 0.85));
        }

        // Rank comparison
        const playerTrackDist = (currentLapRef.current - 1) * TRACK_LENGTH + (playerZRef.current % TRACK_LENGTH);
        const rivalTrackDist = (currentLapRef.current - 1) * TRACK_LENGTH + rival.z;
        if (rivalTrackDist > playerTrackDist) {
          carsAhead++;
        }

        // Collision detection
        const relZ = (rival.z - (playerZRef.current % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
        if (relZ < 180 && relZ > -100 && Math.abs(playerXRef.current - rival.x) < 0.55) {
          // Collision impact!
          sounds.playCarCrash();
          speedRef.current = currentSpeed * 0.35;
          shakeRef.current = 14;
          setCollisionFlash(true);
          setTimeout(() => setCollisionFlash(false), 120);

          // Push rival away
          rival.x += playerXRef.current > rival.x ? -0.4 : 0.4;
        }
      }

      const calculatedPosition = Math.min(NUM_RIVALS + 1, Math.max(1, carsAhead + 1));
      setPosition(calculatedPosition);
      setSpeedMph(Math.round((currentSpeed / MAX_SPEED) * 185));
      setGapToLeader(Math.max(0, Number((carsAhead * 0.55).toFixed(2))));
      setTrackProgress(((playerZRef.current / TRACK_LENGTH) % 1 + 1) % 1);

      // ==========================================
      // CANVAS DRAWING (Pseudo-3D Projection)
      // ==========================================
      const width = canvas.width;
      const height = canvas.height;

      ctx.save();
      if (shakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * shakeRef.current;
        const shakeY = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Sky & Horizon Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      skyGrad.addColorStop(0, '#0284c7');   // Sky blue
      skyGrad.addColorStop(0.7, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.45);

      // Horizon Green Hills Background (Parallax with player curve)
      const horizonY = height * 0.42;
      const curveOffset = ((playerSegment?.curve || 0) * 12);

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.bezierCurveTo(width * 0.25 + curveOffset, horizonY - 40, width * 0.45 + curveOffset, horizonY - 60, width * 0.7 + curveOffset, horizonY - 25);
      ctx.bezierCurveTo(width * 0.85 + curveOffset, horizonY - 10, width, horizonY - 30, width, horizonY);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // 2. Project Segments
      const baseSegment = road[playerSegmentIndex];
      const cameraX = playerXRef.current * ROAD_WIDTH;
      const cameraY = CAMERA_HEIGHT + (baseSegment ? baseSegment.p1.world.y : 0);
      const cameraZ = playerZRef.current;

      let maxy = height;

      // Project all segments in draw distance
      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segment = road[(playerSegmentIndex + n) % TOTAL_SEGMENTS];
        if (!segment) continue;

        // Loop segment Z forward if wrapped
        const loopedZ = segment.index < playerSegmentIndex ? segment.p1.world.z + TRACK_LENGTH : segment.p1.world.z;
        const z1 = loopedZ - cameraZ;
        const z2 = z1 + SEGMENT_LENGTH;

        if (z1 <= CAMERA_DEPTH) continue;

        const scale1 = CAMERA_DEPTH / z1;
        const scale2 = CAMERA_DEPTH / z2;

        segment.p1.screen.scale = scale1;
        segment.p1.screen.x = Math.round((width / 2) + (scale1 * (segment.p1.world.x - cameraX) * (width / 2)));
        segment.p1.screen.y = Math.round((height / 2) - (scale1 * (segment.p1.world.y - cameraY) * (height / 2)));
        segment.p1.screen.w = Math.round(scale1 * ROAD_WIDTH * (width / 2));

        segment.p2.screen.scale = scale2;
        segment.p2.screen.x = Math.round((width / 2) + (scale2 * (segment.p2.world.x - cameraX) * (width / 2)));
        segment.p2.screen.y = Math.round((height / 2) - (scale2 * (segment.p2.world.y - cameraY) * (height / 2)));
        segment.p2.screen.w = Math.round(scale2 * ROAD_WIDTH * (width / 2));

        if (segment.p1.screen.y >= maxy || segment.p2.screen.y >= segment.p1.screen.y) continue;

        // Draw Grass
        ctx.fillStyle = segment.color.grass;
        ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y);

        // Draw Rumble Curbs
        const rumbleW1 = segment.p1.screen.w * 0.18;
        const rumbleW2 = segment.p2.screen.w * 0.18;
        ctx.fillStyle = segment.color.rumble;
        // Left rumble
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x - segment.p1.screen.w - rumbleW1, segment.p1.screen.y);
        ctx.lineTo(segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x - segment.p2.screen.w - rumbleW2, segment.p2.screen.y);
        ctx.fill();
        // Right rumble
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p1.screen.x + segment.p1.screen.w + rumbleW1, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x + segment.p2.screen.w + rumbleW2, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y);
        ctx.fill();

        // Draw Road Pavement
        ctx.fillStyle = segment.color.road;
        ctx.beginPath();
        ctx.moveTo(segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y);
        ctx.lineTo(segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y);
        ctx.lineTo(segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y);
        ctx.fill();

        // Draw Center Lane Divider
        if (segment.color.lane && segment.index % 2 === 0) {
          const laneW1 = segment.p1.screen.w * 0.035;
          const laneW2 = segment.p2.screen.w * 0.035;
          ctx.fillStyle = segment.color.lane;
          ctx.beginPath();
          ctx.moveTo(segment.p1.screen.x - laneW1, segment.p1.screen.y);
          ctx.lineTo(segment.p1.screen.x + laneW1, segment.p1.screen.y);
          ctx.lineTo(segment.p2.screen.x + laneW2, segment.p2.screen.y);
          ctx.lineTo(segment.p2.screen.x - laneW2, segment.p2.screen.y);
          ctx.fill();
        }

        maxy = segment.p1.screen.y;
      }

      // 3. Render Sprites & Rivals (Back to Front)
      for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
        const segment = road[(playerSegmentIndex + n) % TOTAL_SEGMENTS];
        if (!segment) continue;

        // Roadside scenery sprites
        for (const sprite of segment.sprites) {
          const spriteX = segment.p1.screen.x + (segment.p1.screen.scale * sprite.offset * ROAD_WIDTH * (width / 2));
          const spriteY = segment.p1.screen.y;
          const scale = segment.p1.screen.scale;
          if (scale <= 0) continue;

          if (sprite.type === 'tree') {
            const treeW = Math.round(1800 * scale);
            const treeH = Math.round(3200 * scale);
            ctx.fillStyle = '#14532d';
            ctx.beginPath();
            ctx.arc(spriteX, spriteY - treeH * 0.6, treeW * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#78350f';
            ctx.fillRect(spriteX - treeW * 0.1, spriteY - treeH * 0.3, treeW * 0.2, treeH * 0.3);
          } else if (sprite.type === 'billboard') {
            const bbW = Math.round(3200 * scale);
            const bbH = Math.round(1800 * scale);
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(spriteX - bbW / 2, spriteY - bbH, bbW, bbH);
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = Math.max(1, Math.round(4 * scale * 100));
            ctx.strokeRect(spriteX - bbW / 2, spriteY - bbH, bbW, bbH);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(10, Math.round(18 * scale * 100))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(sprite.text || 'PLAYBREAK', spriteX, spriteY - bbH * 0.4);
          }
        }

        // Draw Rivals on this segment
        for (const rival of rivals) {
          const rivalSegIdx = Math.floor(rival.z / SEGMENT_LENGTH);
          if (rivalSegIdx === segment.index) {
            const rivalX = segment.p1.screen.x + (segment.p1.screen.scale * rival.x * ROAD_WIDTH * (width / 2));
            const rivalY = segment.p1.screen.y;
            const carScale = segment.p1.screen.scale * 1600;
            if (carScale <= 1) continue;

            const carW = Math.round(carScale * 1.5);
            const carH = Math.round(carScale * 0.85);

            // Rival Car Body
            ctx.fillStyle = rival.color;
            ctx.beginPath();
            ctx.roundRect(rivalX - carW / 2, rivalY - carH, carW, carH * 0.7, 4);
            ctx.fill();

            // Rival Spoiler
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rivalX - carW * 0.6, rivalY - carH * 1.15, carW * 1.2, carH * 0.2);

            // Rival Rear Tires
            ctx.fillStyle = '#000000';
            ctx.fillRect(rivalX - carW * 0.65, rivalY - carH * 0.5, carW * 0.25, carH * 0.5);
            ctx.fillRect(rivalX + carW * 0.4, rivalY - carH * 0.5, carW * 0.25, carH * 0.5);

            // Taillights
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(rivalX - carW * 0.35, rivalY - carH * 0.45, carW * 0.15, carH * 0.15);
            ctx.fillRect(rivalX + carW * 0.2, rivalY - carH * 0.45, carW * 0.15, carH * 0.15);
          }
        }
      }

      // 4. Render Player Car (Cockpit / Chase Camera View in deep cobalt blue)
      const playerScreenX = width / 2;
      const playerScreenY = height - 15;
      const bounce = (currentSpeed > 0 ? Math.sin(time * 0.04) * 2.5 : 0);
      const steerTilt = isLeft ? -0.1 : isRight ? 0.1 : 0;

      ctx.save();
      ctx.translate(playerScreenX, playerScreenY + bounce);
      ctx.rotate(steerTilt);

      // Player F1 Chassis (Cobalt Blue #1d4ed8)
      const pw = Math.round(width * 0.32);
      const ph = Math.round(height * 0.22);

      // Wide Rear Tires
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-pw * 0.58, -ph * 0.55, pw * 0.24, ph * 0.58); // Left tire
      ctx.fillRect(pw * 0.34, -ph * 0.55, pw * 0.24, ph * 0.58);  // Right tire
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-pw * 0.54, -ph * 0.45, pw * 0.16, ph * 0.4);
      ctx.fillRect(pw * 0.38, -ph * 0.45, pw * 0.16, ph * 0.4);

      // Rear Spoiler Wing
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-pw * 0.52, -ph * 0.85, pw * 1.04, ph * 0.18);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-pw * 0.48, -ph * 0.82, pw * 0.96, ph * 0.08);

      // Main Blue Aerodynamic Engine Body
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(-pw * 0.32, -ph * 0.65);
      ctx.lineTo(pw * 0.32, -ph * 0.65);
      ctx.lineTo(pw * 0.26, 0);
      ctx.lineTo(-pw * 0.26, 0);
      ctx.closePath();
      ctx.fill();

      // Cockpit & Windscreen
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(0, -ph * 0.48, pw * 0.16, ph * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Driver Helmet (Yellow #eab308)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -ph * 0.48, pw * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a'; // Visor
      ctx.fillRect(-pw * 0.06, -ph * 0.52, pw * 0.12, ph * 0.05);

      // Exhaust Fire / Glow when accelerating at high speeds
      if (isFaster && currentSpeed > MAX_SPEED * 0.5) {
        ctx.fillStyle = Math.random() < 0.5 ? '#f97316' : '#eab308';
        ctx.beginPath();
        ctx.moveTo(-pw * 0.18, 0);
        ctx.lineTo(-pw * 0.14, ph * 0.15 + Math.random() * 8);
        ctx.lineTo(-pw * 0.1, 0);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pw * 0.1, 0);
        ctx.lineTo(pw * 0.14, ph * 0.15 + Math.random() * 8);
        ctx.lineTo(pw * 0.18, 0);
        ctx.fill();
      }

      ctx.restore();

      // 5. Retro Rear-View Mirror (Top Center - inspired by screenshot!)
      const mirrorW = Math.round(width * 0.26);
      const mirrorH = Math.round(height * 0.14);
      const mirrorX = (width - mirrorW) / 2;
      const mirrorY = 8;

      ctx.save();
      // Mirror frame
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mirrorX, mirrorY, mirrorW, mirrorH, 6);
      ctx.fill();
      ctx.stroke();

      // Mirror view (clipped)
      ctx.beginPath();
      ctx.roundRect(mirrorX + 2, mirrorY + 2, mirrorW - 4, mirrorH - 4, 4);
      ctx.clip();

      // Mirror reflection: reversed road
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(mirrorX, mirrorY, mirrorW, mirrorH * 0.4);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(mirrorX, mirrorY + mirrorH * 0.4, mirrorW, mirrorH * 0.6);

      // Mirror road
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(mirrorX + mirrorW * 0.4, mirrorY + mirrorH * 0.4);
      ctx.lineTo(mirrorX + mirrorW * 0.6, mirrorY + mirrorH * 0.4);
      ctx.lineTo(mirrorX + mirrorW * 0.9, mirrorY + mirrorH);
      ctx.lineTo(mirrorX + mirrorW * 0.1, mirrorY + mirrorH);
      ctx.fill();

      // Draw closest car behind in mirror
      for (const rival of rivals) {
        const behindZ = (playerZRef.current - rival.z + TRACK_LENGTH) % TRACK_LENGTH;
        if (behindZ > 0 && behindZ < 800) {
          const mScale = 1 - (behindZ / 800);
          const mCarX = mirrorX + mirrorW / 2 + (rival.x * mirrorW * 0.3);
          const mCarY = mirrorY + mirrorH * 0.4 + (mScale * mirrorH * 0.5);
          ctx.fillStyle = rival.color;
          ctx.fillRect(mCarX - 8 * mScale, mCarY, 16 * mScale, 8 * mScale);
        }
      }
      ctx.restore();

      ctx.restore(); // end screen shake

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      sounds.stopEngineSound();
    };
  }, [gameState, bestLapTime, position]);

  return (
    <GameLayout
      game={gameInfo}
      onRestart={startRace}
      headerControls={
        <div className="flex items-center gap-2">
          {gameState === 'playing' && (
            <button
              onClick={() => setGameState('paused')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              Pause
            </button>
          )}
          {gameState === 'paused' && (
            <button
              onClick={() => setGameState('playing')}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-violet-600/30"
            >
              Resume
            </button>
          )}
        </div>
      }
    >
      <div className="w-full max-w-4xl flex flex-col items-center select-none relative font-mono-telemetry">
        {/* Collision Red Flash Overlay */}
        {collisionFlash && (
          <div className="absolute inset-0 z-30 bg-rose-600/25 pointer-events-none rounded-2xl animate-pulse" />
        )}

        {/* Arcade Cabinet Screen Container */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-2xl sm:rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={440}
            className="w-full h-full object-cover"
          />

          {/* ========================================================
              AUTHENTIC RETRO RACING HUD (Faithful to Arcade Screenshot)
             ======================================================== */}
          {gameState === 'playing' && (
            <div className="absolute inset-0 pointer-events-none p-3 sm:p-5 flex flex-col justify-between text-white font-mono-telemetry tracking-wider">
              {/* Top HUD Row */}
              <div className="flex items-start justify-between w-full">
                {/* Top Left: Leader Gap & Best Lap */}
                <div className="flex flex-col text-left">
                  <div className="text-amber-400 font-black text-xs sm:text-base drop-shadow-md">
                    {position === 1 ? 'LEADER 1ST' : `${gapToLeader.toFixed(2)}" TO 1ST`}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-300 font-bold">
                    BEST LAP {formatTime(bestLapTime)}
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-amber-200 font-bold">
                    3 LAPS • FORMULA GP
                  </div>
                </div>

                {/* Top Right: Running Time & Lap Splits */}
                <div className="flex flex-col text-right">
                  <div className="text-rose-500 font-black text-xs sm:text-base drop-shadow-md">
                    TIME {formatTime(lapTime)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-300 font-bold">
                    LAP TIME {formatTime(lapTime)}
                  </div>
                </div>
              </div>

              {/* Mid HUD: Position & Lap + Minimap */}
              <div className="flex items-center justify-between w-full my-auto">
                {/* Center Left: Large Bold Position & Tachometer */}
                <div className="flex flex-col items-start">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs sm:text-sm font-black text-rose-500 uppercase">POSITION:</span>
                    <span className="text-3xl sm:text-5xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {position}
                      <span className="text-base sm:text-xl font-bold text-rose-400 ml-0.5">
                        {position === 1 ? 'ST' : position === 2 ? 'ND' : position === 3 ? 'RD' : 'TH'}
                      </span>
                    </span>
                  </div>

                  {/* Tachometer RPM Display */}
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-amber-500/40">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>{Math.round((speedMph / 185) * 11000)} RPM</span>
                    <span className="text-emerald-400 text-[9px] font-mono font-black ml-1">AUTO</span>
                  </div>
                </div>

                {/* Center Right: Lap Counter & Mini Track Map */}
                <div className="flex flex-col items-end">
                  <div className="text-sm sm:text-lg font-black text-amber-400 drop-shadow">
                    LAP <span className="text-white text-lg sm:text-2xl">{currentLap}</span>/{TOTAL_LAPS}
                  </div>

                  {/* Circuit Minimap */}
                  <div className="relative w-16 h-20 sm:w-20 sm:h-24 bg-black/70 border border-slate-700/80 rounded-xl p-1 mt-1 shadow-inner flex items-center justify-center">
                    <svg viewBox="0 0 100 120" className="w-full h-full stroke-slate-500 fill-none stroke-[6]">
                      <path d="M 25 110 L 25 25 Q 25 10 45 10 L 75 10 Q 85 10 85 30 L 85 60 Q 85 75 65 75 L 45 75 Q 35 75 35 90 L 35 110 Z" />
                    </svg>
                    {/* Player Beacon */}
                    <div
                      className="absolute w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-ping"
                      style={{
                        left: `${20 + trackProgress * 60}%`,
                        top: `${80 - trackProgress * 60}%`,
                      }}
                    />
                    <div
                      className="absolute w-2.5 h-2.5 rounded-full bg-sky-400 border border-white"
                      style={{
                        left: `${20 + trackProgress * 60}%`,
                        top: `${80 - trackProgress * 60}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom HUD: Speedometer */}
              <div className="flex items-end justify-between w-full">
                <div className="text-[10px] text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-slate-700 hidden sm:block">
                  CONTROLS: ARROWS / WASD TO DRIVE
                </div>

                {/* Big Arcade Speedometer */}
                <div className="flex items-baseline gap-1 text-right ml-auto bg-black/70 px-3 py-1 rounded-xl border border-amber-500/30 shadow-lg">
                  <span className="text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.5)]">
                    {speedMph}
                  </span>
                  <span className="text-xs sm:text-base font-bold text-rose-500">MPH</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              START / READY SCREEN
             ======================================================== */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/25 border border-violet-500/50 flex items-center justify-center text-3xl mb-3 shadow-lg">
                🏎️
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight mb-1">
                RETRO RACING
              </h2>
              <p className="text-amber-400 font-bold text-xs sm:text-sm mb-4">
                16-Bit Grand Prix • 3 Laps • 9 Rivals • 10 Cars Total
              </p>
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-xs text-slate-300 max-w-sm mb-6 space-y-1.5 text-left">
                <p>🚦 <strong>Goal:</strong> Pass rivals and finish in 1st place.</p>
                <p>🕹️ <strong>Controls:</strong> Arrow Keys / WASD or Onscreen Pedals.</p>
                <p>💥 <strong>Warning:</strong> Collisions with rival cars and driving onto the grass slows you down!</p>
              </div>
              <button
                onClick={startRace}
                className="px-8 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-base shadow-xl shadow-violet-600/40 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>START RACE</span>
              </button>
            </div>
          )}

          {/* ========================================================
              PAUSE SCREEN
             ======================================================== */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center">
              <h2 className="text-3xl font-black mb-4">RACE PAUSED</h2>
              <button
                onClick={() => setGameState('playing')}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg mb-3 cursor-pointer"
              >
                Resume Race
              </button>
              <button
                onClick={startRace}
                className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Restart
              </button>
            </div>
          )}
        </div>

        {/* ========================================================
            MOBILE TOUCH CONTROLS (Steering & Pedals)
           ======================================================== */}
        <div className="w-full mt-4 flex items-center justify-between gap-4 px-2 select-none touch-manipulation">
          {/* Left / Right Steering Buttons */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => { e.preventDefault(); touchSteerLeft.current = true; }}
              onPointerUp={(e) => { e.preventDefault(); touchSteerLeft.current = false; }}
              onPointerLeave={() => { touchSteerLeft.current = false; }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 active:bg-violet-600 border-2 border-slate-700 active:border-violet-400 text-white font-black text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Steer Left"
            >
              ◀
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); touchSteerRight.current = true; }}
              onPointerUp={(e) => { e.preventDefault(); touchSteerRight.current = false; }}
              onPointerLeave={() => { touchSteerRight.current = false; }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 active:bg-violet-600 border-2 border-slate-700 active:border-violet-400 text-white font-black text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Steer Right"
            >
              ▶
            </button>
          </div>

          {/* Brake & Gas Pedals */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => { e.preventDefault(); touchBrake.current = true; }}
              onPointerUp={(e) => { e.preventDefault(); touchBrake.current = false; }}
              onPointerLeave={() => { touchBrake.current = false; }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-950/80 active:bg-rose-600 border-2 border-rose-600 text-rose-300 active:text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Brake"
            >
              <span>BRAKE</span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); touchGas.current = true; }}
              onPointerUp={(e) => { e.preventDefault(); touchGas.current = false; }}
              onPointerLeave={() => { touchGas.current = false; }}
              className="w-20 h-16 sm:w-24 sm:h-20 rounded-2xl bg-emerald-950/80 active:bg-emerald-600 border-2 border-emerald-500 text-emerald-300 active:text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Gas / Accelerate"
            >
              <span>GAS</span>
              <span className="text-[10px] opacity-70">▲</span>
            </button>
          </div>
        </div>

        {/* Game Over / Victory Modal */}
        <GameOverModal
          isOpen={gameOverModal}
          title={finalPosition === 1 ? '🏆 1ST PLACE PODIUM!' : `🏁 RACE FINISHED: ${finalPosition}${finalPosition === 1 ? 'ST' : finalPosition === 2 ? 'ND' : finalPosition === 3 ? 'RD' : 'TH'} / ${NUM_RIVALS + 1}`}
          message={
            finalPosition === 1
              ? `Outstanding driving! You conquered the Grand Prix and beat all ${NUM_RIVALS} rivals!`
              : `Great race! You finished in ${finalPosition}th out of ${NUM_RIVALS + 1} cars. Can you reach 1st?`
          }
          score={Math.max(1, (NUM_RIVALS + 1 - finalPosition) * 100)}
          highScore={bestLapTime > 0 ? Math.round(bestLapTime) : undefined}
          onRestart={startRace}
        />
      </div>
    </GameLayout>
  );
};
