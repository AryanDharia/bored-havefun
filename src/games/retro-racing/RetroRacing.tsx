import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ArrowLeft, Trophy, Gauge, Shield, Flag } from 'lucide-react';

/**
 * 2D Car Racing Game - Browser Port
 * Original C++ / OpenGL / GLUT implementation by UMAR SAADAT (MIT License, 2025).
 * Re-implemented cleanly for PlayBreak / React HTML5 Canvas.
 *
 * Preserves the exact mechanics, coordinate systems, math, physics, road scrolling,
 * AI logic, health (5 HP), laps (3 laps), difficulty levels, and original art assets:
 * - ROAD.png, PLAYER.png, CAR1.png, CAR2.png, CAR3.png, audio.mp3, CRASH.mpeg
 */

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type GameState = 'MENU' | 'GAME' | 'SCORES' | 'SELECT_LEVEL' | 'GAME_OVER' | 'PAUSED';

interface AICar {
  x: number;
  y: number;
  speed: number;
  texture: HTMLImageElement;
  health: number;
}

interface ScoreRecord {
  score: number;
  difficulty: Difficulty;
  date: string;
}

// Coordinate constants matching original C++ main.cpp
const VIRTUAL_WIDTH = 2048;
const VIRTUAL_HEIGHT = 1152;

const ROAD_LEFT_BOUND = 300.0;
const ROAD_RIGHT_BOUND = 1400.0;

const CAR_WIDTH = 300.0;
const CAR_HEIGHT = 500.0;
const BOTTOM_MARGIN = 50.0;
const HORIZONTAL_MARGIN = 50.0;
const COLLISION_GAP = 5.0;
const COLLISION_BUFFER = 10.0;

const MAX_SPEED = 250.0;
const ACCELERATION = 0.5;
const BRAKE_DECEL = 1.5;
const LAP_DISTANCE = 20000.0;
const TOTAL_LAPS = 3;

export const RetroRacing: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'retro-racing')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level game state
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // HUD stats for UI overlay
  const [hudStats, setHudStats] = useState({
    speed: 30,
    lap: 1,
    distanceKm: 0,
    totalDistanceKm: (LAP_DISTANCE * TOTAL_LAPS) / 1000,
    health: 5,
    position: 1,
    score: 0,
  });

  const [gameOverStats, setGameOverStats] = useState({
    isWin: false,
    finalScore: 0,
    finalLap: 1,
    finalPosition: 1,
  });

  const [highScores, setHighScores] = useState<ScoreRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pb_retro_racing_scores');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      { score: 14200, difficulty: 'HARD', date: 'Record 1' },
      { score: 9850, difficulty: 'MEDIUM', date: 'Record 2' },
      { score: 5400, difficulty: 'EASY', date: 'Record 3' },
    ];
  });

  // Mutable game simulation refs
  const simState = useRef({
    gameState: 'MENU' as GameState,
    difficulty: 'MEDIUM' as Difficulty,
    minSpeed: 20.0,
    playerSpeed: 20.0,
    scoreMultiplier: 2.0,
    aiSpawnInterval: 2.0,
    maxAICars: 3,

    // Keys
    keyUp: false,
    keyLeft: false,
    keyRight: false,
    keyBrake: false,

    // Coordinates & dynamics
    roadOffset: 0,
    raceDistance: 0,
    lap: 1,
    playerPosition: 1,
    score: 0,
    gameOverTime: 0,
    lastAISpawnTime: 0,

    player: {
      x: 800.0,
      y: VIRTUAL_HEIGHT - CAR_HEIGHT - BOTTOM_MARGIN,
      health: 5,
    },
    aiCars: [] as AICar[],
  });

  // Audio references
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastCrashTimeRef = useRef<number>(0);

  // Asset image refs
  const assetsRef = useRef<{
    road: HTMLImageElement;
    player: HTMLImageElement;
    car1: HTMLImageElement;
    car2: HTMLImageElement;
    car3: HTMLImageElement;
    loaded: boolean;
  }>({
    road: new Image(),
    player: new Image(),
    car1: new Image(),
    car2: new Image(),
    car3: new Image(),
    loaded: false,
  });

  // Load original assets
  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = 5;
    const onAssetLoad = () => {
      loadedCount++;
      if (loadedCount >= totalAssets) {
        assetsRef.current.loaded = true;
      }
    };

    const assets = assetsRef.current;
    assets.road.src = '/games/retro-racing/ROAD.png';
    assets.player.src = '/games/retro-racing/PLAYER.png';
    assets.car1.src = '/games/retro-racing/CAR1.png';
    assets.car2.src = '/games/retro-racing/CAR2.png';
    assets.car3.src = '/games/retro-racing/CAR3.png';

    assets.road.onload = onAssetLoad;
    assets.player.onload = onAssetLoad;
    assets.car1.onload = onAssetLoad;
    assets.car2.onload = onAssetLoad;
    assets.car3.onload = onAssetLoad;

    // Audio setup
    try {
      const bgm = new Audio('/games/retro-racing/audio.mp3');
      bgm.loop = true;
      bgm.volume = 0.35;
      bgmRef.current = bgm;

      const crash = new Audio('/games/retro-racing/CRASH.mpeg');
      crash.volume = 0.55;
      crashAudioRef.current = crash;
    } catch {
      // Audio autoplay policy fallback
    }

    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Update difficulty configuration
  const applyDifficulty = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    simState.current.difficulty = diff;
    if (diff === 'EASY') {
      simState.current.minSpeed = 10.0;
      simState.current.scoreMultiplier = 1.0;
      simState.current.aiSpawnInterval = 4.0;
      simState.current.maxAICars = 2;
    } else if (diff === 'MEDIUM') {
      simState.current.minSpeed = 20.0;
      simState.current.scoreMultiplier = 2.0;
      simState.current.aiSpawnInterval = 2.0;
      simState.current.maxAICars = 3;
    } else {
      simState.current.minSpeed = 40.0;
      simState.current.scoreMultiplier = 3.0;
      simState.current.aiSpawnInterval = 1.0;
      simState.current.maxAICars = 4;
    }
    simState.current.playerSpeed = simState.current.minSpeed;
  }, []);

  const resetGame = useCallback(() => {
    const s = simState.current;
    s.player.x = 800.0;
    s.player.y = VIRTUAL_HEIGHT - CAR_HEIGHT - BOTTOM_MARGIN;
    s.player.health = 5;
    s.aiCars = [];
    s.raceDistance = 0;
    s.lap = 1;
    s.playerPosition = 1;
    s.score = 0;
    s.lastAISpawnTime = 0;
    s.roadOffset = 0;
    s.playerSpeed = s.minSpeed;
    s.keyUp = false;
    s.keyLeft = false;
    s.keyRight = false;
    s.keyBrake = false;
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    simState.current.gameState = 'GAME';
    setGameState('GAME');
    if (soundEnabled && bgmRef.current) {
      bgmRef.current.play().catch(() => {});
    }
  }, [resetGame, soundEnabled]);

  const pauseGame = useCallback(() => {
    if (simState.current.gameState === 'GAME') {
      simState.current.gameState = 'PAUSED';
      setGameState('PAUSED');
      if (bgmRef.current) bgmRef.current.pause();
    } else if (simState.current.gameState === 'PAUSED') {
      simState.current.gameState = 'GAME';
      setGameState('GAME');
      if (soundEnabled && bgmRef.current) {
        bgmRef.current.play().catch(() => {});
      }
    }
  }, [soundEnabled]);

  const saveHighScore = useCallback((scoreVal: number, diffVal: Difficulty) => {
    setHighScores((prev) => {
      const updated = [
        ...prev,
        {
          score: scoreVal,
          difficulty: diffVal,
          date: new Date().toLocaleDateString(),
        },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      try {
        localStorage.setItem('pb_retro_racing_scores', JSON.stringify(updated));
      } catch {
        // ignore storage quota errors
      }
      return updated;
    });
  }, []);

  const playCrashSound = () => {
    if (!soundEnabled || !crashAudioRef.current) return;
    const now = Date.now();
    if (now - lastCrashTimeRef.current > 400) {
      try {
        crashAudioRef.current.currentTime = 0;
        crashAudioRef.current.play().catch(() => {});
      } catch {
        // Audio error fallback
      }
      lastCrashTimeRef.current = now;
    }
  };

  // Keyboard driving controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scroll when using arrow keys / space in game
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      if (simState.current.gameState === 'GAME') {
        if (key === 'arrowup' || key === 'w') simState.current.keyUp = true;
        if (key === 'arrowdown' || key === 's' || key === ' ') simState.current.keyBrake = true;
        if (key === 'arrowleft' || key === 'a') simState.current.keyLeft = true;
        if (key === 'arrowright' || key === 'd') simState.current.keyRight = true;
        if (key === 'escape' || key === 'p') pauseGame();
      } else if (simState.current.gameState === 'PAUSED') {
        if (key === 'escape' || key === 'p') pauseGame();
      } else if (simState.current.gameState === 'MENU') {
        if (key === 'n' || key === 'enter') startGame();
        if (key === 's') setGameState('SCORES');
        if (key === 'l') setGameState('SELECT_LEVEL');
      } else if (simState.current.gameState === 'SCORES' || simState.current.gameState === 'SELECT_LEVEL') {
        if (key === 'b' || key === 'escape') setGameState('MENU');
      } else if (simState.current.gameState === 'GAME_OVER') {
        if (key === 'enter' || key === ' ' || key === 'r') startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') simState.current.keyUp = false;
      if (key === 'arrowdown' || key === 's' || key === ' ') simState.current.keyBrake = false;
      if (key === 'arrowleft' || key === 'a') simState.current.keyLeft = false;
      if (key === 'arrowright' || key === 'd') simState.current.keyRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pauseGame, startGame]);

  // Main Canvas Render & Physics Loop (Exact C++ reproduction)
  useEffect(() => {
    let animationFrameId: number;

    const checkCollision = (
      ax: number,
      ay: number,
      bx: number,
      by: number
    ) => {
      return (
        Math.abs(ax - bx) < CAR_WIDTH - COLLISION_BUFFER &&
        Math.abs(ay - by) < CAR_HEIGHT - COLLISION_BUFFER
      );
    };

    const resolvePlayerAICollision = (player: { x: number; y: number }, aiCar: AICar) => {
      const overlapX = CAR_WIDTH - Math.abs(player.x - aiCar.x);
      const overlapY = CAR_HEIGHT - Math.abs(player.y - aiCar.y);
      const s = simState.current;

      if (overlapY < overlapX) {
        if (player.y < aiCar.y) {
          aiCar.y = player.y + CAR_HEIGHT + COLLISION_GAP;
          aiCar.speed = Math.max(s.minSpeed, s.playerSpeed * 0.9);
        } else {
          player.y = aiCar.y + CAR_HEIGHT + COLLISION_GAP;
          s.playerSpeed = Math.max(s.minSpeed, aiCar.speed * 0.9);
        }
      } else {
        if (player.x < aiCar.x) {
          player.x = aiCar.x - CAR_WIDTH - COLLISION_GAP;
        } else {
          player.x = aiCar.x + CAR_WIDTH + COLLISION_GAP;
        }
        s.playerSpeed = Math.max(s.minSpeed, s.playerSpeed * 0.95);
        aiCar.speed = Math.max(s.minSpeed, aiCar.speed * 0.95);
      }

      if (player.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) player.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
      if (player.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) player.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;
      if (aiCar.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) aiCar.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
      if (aiCar.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) aiCar.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;
    };

    const resolveAICarCollision = (c1: AICar, c2: AICar) => {
      const overlapX = CAR_WIDTH - Math.abs(c1.x - c2.x);
      const overlapY = CAR_HEIGHT - Math.abs(c1.y - c2.y);
      const s = simState.current;

      if (overlapY < overlapX) {
        if (c1.y < c2.y) {
          c2.y = c1.y + CAR_HEIGHT + COLLISION_GAP;
          c2.speed = Math.max(s.minSpeed, c1.speed * 0.9);
        } else {
          c1.y = c2.y + CAR_HEIGHT + COLLISION_GAP;
          c1.speed = Math.max(s.minSpeed, c2.speed * 0.9);
        }
      } else {
        if (c1.x < c2.x) {
          c1.x = c2.x - CAR_WIDTH - COLLISION_GAP;
        } else {
          c1.x = c2.x + CAR_WIDTH + COLLISION_GAP;
        }
        c1.speed = Math.max(s.minSpeed, c1.speed * 0.95);
        c2.speed = Math.max(s.minSpeed, c2.speed * 0.95);
      }

      if (c1.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) c1.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
      if (c1.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) c1.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;
      if (c2.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) c2.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
      if (c2.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) c2.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;
    };

    const renderLoop = (timestamp: number) => {
      const s = simState.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx && assetsRef.current.loaded) {
        const assets = assetsRef.current;

        // Ensure canvas internal resolution matches original 2048x1152 coordinate space
        if (canvas.width !== VIRTUAL_WIDTH || canvas.height !== VIRTUAL_HEIGHT) {
          canvas.width = VIRTUAL_WIDTH;
          canvas.height = VIRTUAL_HEIGHT;
        }

        // --- GAMEPLAY UPDATE STEP ---
        if (s.gameState === 'GAME') {
          // Acceleration & Braking
          if (s.keyUp) s.playerSpeed += ACCELERATION;
          if (s.keyBrake) s.playerSpeed -= BRAKE_DECEL;
          s.playerSpeed = Math.min(MAX_SPEED, Math.max(s.minSpeed, s.playerSpeed));

          // Steering
          if (s.keyLeft) s.player.x -= 10;
          if (s.keyRight) s.player.x += 10;

          // Road clamping
          if (s.player.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) {
            s.player.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
          }
          if (s.player.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) {
            s.player.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;
          }

          if (s.player.y < BOTTOM_MARGIN) s.player.y = BOTTOM_MARGIN;
          if (s.player.y > VIRTUAL_HEIGHT - CAR_HEIGHT - BOTTOM_MARGIN) {
            s.player.y = VIRTUAL_HEIGHT - CAR_HEIGHT - BOTTOM_MARGIN;
          }

          // Distance and score
          s.raceDistance += s.playerSpeed * 0.5;
          s.score += Math.floor((s.raceDistance / 1000.0) * s.scoreMultiplier * 0.05);

          // Laps
          if (s.raceDistance >= LAP_DISTANCE * s.lap && s.lap <= TOTAL_LAPS) {
            s.lap++;
          }

          // Check win condition
          if (s.lap > TOTAL_LAPS && s.playerPosition === 1) {
            s.gameState = 'GAME_OVER';
            setGameState('GAME_OVER');
            s.gameOverTime = timestamp / 1000.0;
            setGameOverStats({
              isWin: true,
              finalScore: s.score,
              finalLap: TOTAL_LAPS,
              finalPosition: 1,
            });
            saveHighScore(s.score, s.difficulty);
          }

          // Road scrolling
          s.roadOffset += s.playerSpeed * 0.5;
          if (s.roadOffset >= VIRTUAL_HEIGHT) {
            s.roadOffset = 0;
          }

          // --- AI CARS UPDATE ---
          const currentTimeSec = timestamp / 1000.0;
          const aggression = 1.0 + (s.lap - 1) * 0.5;

          // Spawn new AI cars
          if (
            currentTimeSec - s.lastAISpawnTime > s.aiSpawnInterval &&
            s.aiCars.length < s.maxAICars
          ) {
            const availableWidth = ROAD_RIGHT_BOUND - ROAD_LEFT_BOUND - 2 * HORIZONTAL_MARGIN - CAR_WIDTH;
            const spawnX = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN + Math.random() * availableWidth;
            const texChoices = [assets.car1, assets.car2, assets.car3];
            const chosenTex = texChoices[Math.floor(Math.random() * texChoices.length)];

            s.aiCars.push({
              x: spawnX,
              y: -600 - Math.random() * 400,
              speed: s.playerSpeed * (0.85 + Math.random() * 0.3),
              texture: chosenTex,
              health: 5,
            });
            s.lastAISpawnTime = currentTimeSec;
          }

          // Update AI movement & collisions
          for (let i = s.aiCars.length - 1; i >= 0; i--) {
            const car = s.aiCars[i];
            const relativeSpeed = s.playerSpeed * (0.85 + Math.random() * 0.3);
            car.speed = relativeSpeed;
            car.y += car.speed * 0.5;

            if (car.y > -CAR_HEIGHT) {
              if (car.x < s.player.x) car.x += 2.0 * aggression;
              else if (car.x > s.player.x) car.x -= 2.0 * aggression;

              const zigzag = Math.sin(timestamp * 0.001 + car.y * 0.01) * 1.5;
              car.x += zigzag;

              if (car.x < ROAD_LEFT_BOUND + HORIZONTAL_MARGIN) car.x = ROAD_LEFT_BOUND + HORIZONTAL_MARGIN;
              if (car.x > ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN) car.x = ROAD_RIGHT_BOUND - HORIZONTAL_MARGIN;

              // AI vs AI collision
              for (let j = 0; j < s.aiCars.length; j++) {
                if (i !== j && checkCollision(car.x, car.y, s.aiCars[j].x, s.aiCars[j].y)) {
                  resolveAICarCollision(car, s.aiCars[j]);
                }
              }
            }

            // Recycle off-screen car
            if (car.y > VIRTUAL_HEIGHT + 200) {
              car.y = -600 - Math.random() * 400;
              car.speed = s.playerSpeed * (0.85 + Math.random() * 0.3);
            }

            // Player vs AI Collision
            if (checkCollision(s.player.x, s.player.y, car.x, car.y)) {
              s.player.health--;
              playCrashSound();
              resolvePlayerAICollision(s.player, car);
              s.aiCars.splice(i, 1);

              if (s.player.health <= 0) {
                s.gameState = 'GAME_OVER';
                setGameState('GAME_OVER');
                s.gameOverTime = timestamp / 1000.0;
                setGameOverStats({
                  isWin: false,
                  finalScore: s.score,
                  finalLap: s.lap,
                  finalPosition: s.playerPosition,
                });
                saveHighScore(s.score, s.difficulty);
                if (bgmRef.current) bgmRef.current.pause();
              }
            }
          }

          // Calculate race position (1 + count of AI cars ahead of player)
          let pos = 1;
          for (const car of s.aiCars) {
            if (car.y > s.player.y) pos++;
          }
          s.playerPosition = Math.min(4, Math.max(1, pos));

          // Sync HUD state for overlay
          setHudStats({
            speed: Math.round(s.playerSpeed),
            lap: Math.min(TOTAL_LAPS, s.lap),
            distanceKm: Number((s.raceDistance / 1000.0).toFixed(1)),
            totalDistanceKm: (LAP_DISTANCE * TOTAL_LAPS) / 1000,
            health: Math.max(0, s.player.health),
            position: s.playerPosition,
            score: s.score,
          });
        }

        // --- DRAWING STEP (Exact C++ DrawScene) ---
        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Infinite Road Texture Blitting
        if (s.gameState === 'MENU' || s.gameState === 'SCORES' || s.gameState === 'SELECT_LEVEL') {
          ctx.drawImage(assets.road, 0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        } else {
          // Double road tile scrolling
          ctx.drawImage(assets.road, 0, s.roadOffset - VIRTUAL_HEIGHT, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
          ctx.drawImage(assets.road, 0, s.roadOffset, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

          // Draw Opponent Cars
          for (const car of s.aiCars) {
            ctx.drawImage(car.texture, car.x, car.y, CAR_WIDTH, CAR_HEIGHT);
          }

          // Draw Player Car
          ctx.drawImage(assets.player, s.player.x, s.player.y, CAR_WIDTH, CAR_HEIGHT);
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [playCrashSound, saveHighScore]);

  return (
    <GameLayout
      game={gameInfo}
      score={hudStats.score}
      onRestart={startGame}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (!next && bgmRef.current) bgmRef.current.pause();
              if (next && gameState === 'GAME' && bgmRef.current) {
                bgmRef.current.play().catch(() => {});
              }
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center gap-1.5"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-violet-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Difficulty Indicator / Selector */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => applyDifficulty(d)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  difficulty === d
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d === 'EASY' ? 'Easy' : d === 'MEDIUM' ? 'Medium' : 'Hard'}
              </button>
            ))}
          </div>

          {/* Pause / Resume button if playing */}
          {gameState === 'GAME' && (
            <button
              onClick={pauseGame}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              title="Pause Game"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      }
    >
      <div className="w-full max-w-4xl flex flex-col items-center select-none">
        {/* Main Canvas Container */}
        <div className="relative w-full aspect-[16/9] bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain block"
            style={{ imageRendering: 'auto' }}
          />

          {/* HUD OVERLAY DURING ACTIVE GAMEPLAY */}
          {(gameState === 'GAME' || gameState === 'PAUSED') && (
            <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex flex-wrap items-center justify-between gap-2 pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              {/* Left Stats: Speed & Position */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-black/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-white shadow-lg">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm font-black font-mono tracking-wider">
                    {hudStats.speed} <span className="text-[10px] text-slate-400 font-normal">KM/H</span>
                  </span>
                </div>

                <div className="bg-black/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-white shadow-lg">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-black font-mono">
                    POS {hudStats.position} <span className="text-[10px] text-slate-400 font-normal">/ 4</span>
                  </span>
                </div>
              </div>

              {/* Center Stats: Health (5 Hearts) */}
              <div className="bg-black/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-lg">
                <Shield className="w-4 h-4 text-violet-400 mr-1" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-4 sm:w-3 sm:h-5 rounded-sm transition-all duration-200 ${
                      i < hudStats.health
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-slate-800/80 border border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Right Stats: Lap & Distance & Score */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-black/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl flex items-center gap-2 text-white shadow-lg">
                  <Flag className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs sm:text-sm font-black font-mono">
                    LAP {hudStats.lap}/{TOTAL_LAPS}
                  </span>
                </div>

                <div className="bg-black/70 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-black font-mono text-purple-300 shadow-lg">
                  {hudStats.score.toLocaleString()} PTS
                </div>
              </div>
            </div>
          )}

          {/* PAUSE OVERLAY */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">GAME PAUSED</h2>
              <p className="text-sm text-slate-400 mb-6">Press ESC or resume to get back into the race</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={pauseGame}
                  className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 font-bold text-white shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" /> Resume Race
                </button>
                <button
                  onClick={() => {
                    setGameState('MENU');
                    simState.current.gameState = 'MENU';
                  }}
                  className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" /> Main Menu
                </button>
              </div>
            </div>
          )}

          {/* MENU SCREEN OVERLAY */}
          {gameState === 'MENU' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  Classic 2D Arcade Racer
                </span>
                <h1 className="text-4xl sm:text-5xl font-black text-white mt-2 tracking-tight">
                  2D CAR RACING
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm">
                  Dodge AI racers, manage your speed & steer 3 laps to victory.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-64">
                <button
                  onClick={startGame}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-bold text-white shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" /> Start Game
                </button>

                <button
                  onClick={() => setGameState('SELECT_LEVEL')}
                  className="w-full py-3 rounded-2xl bg-[#141624] hover:bg-[#1e2136] border border-slate-800 text-slate-200 font-bold transition-all"
                >
                  Select Level ({difficulty})
                </button>

                <button
                  onClick={() => setGameState('SCORES')}
                  className="w-full py-3 rounded-2xl bg-[#141624] hover:bg-[#1e2136] border border-slate-800 text-slate-200 font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400" /> High Scores
                </button>
              </div>

              <div className="mt-8 text-[11px] text-slate-500 font-mono">
                Keyboard: N (New) • L (Level) • S (Scores) • WASD / Arrows
              </div>
            </div>
          )}

          {/* LEVEL SELECT OVERLAY */}
          {gameState === 'SELECT_LEVEL' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <h2 className="text-3xl font-black text-white mb-2">SELECT DIFFICULTY</h2>
              <p className="text-xs text-slate-400 mb-6">Choose AI speed and traffic density</p>

              <div className="flex flex-col gap-3 w-64 mb-6">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      applyDifficulty(d);
                      setGameState('MENU');
                    }}
                    className={`py-3 rounded-2xl border font-bold transition-all ${
                      difficulty === d
                        ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/30'
                        : 'bg-[#141624] hover:bg-[#1e2136] border-slate-800 text-slate-300'
                    }`}
                  >
                    {d === 'EASY' ? '🟢 Easy (Relaxed)' : d === 'MEDIUM' ? '🟡 Medium (Standard)' : '🔴 Hard (Chaos)'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setGameState('MENU')}
                className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Menu
              </button>
            </div>
          )}

          {/* HIGH SCORES OVERLAY */}
          {gameState === 'SCORES' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <h2 className="text-3xl font-black text-white mb-1 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" /> HIGH SCORES
              </h2>
              <p className="text-xs text-slate-400 mb-5">Your best track performances</p>

              <div className="w-80 max-h-56 overflow-y-auto bg-[#141624]/90 border border-slate-800 rounded-2xl p-3 mb-6 divide-y divide-slate-800/60">
                {highScores.map((rec, i) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">#{i + 1}</span>
                    <span className="font-bold text-white">{rec.score.toLocaleString()} pts</span>
                    <span className="text-violet-400">{rec.difficulty}</span>
                    <span className="text-slate-500 text-[10px]">{rec.date}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setGameState('MENU')}
                className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Menu
              </button>
            </div>
          )}
        </div>

        {/* MOBILE ON-SCREEN TOUCH CONTROLS */}
        <div className="w-full mt-4 flex items-center justify-between gap-3 px-2">
          {/* Steering D-Pad */}
          <div className="flex gap-2">
            <button
              onMouseDown={() => (simState.current.keyLeft = true)}
              onMouseUp={() => (simState.current.keyLeft = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                simState.current.keyLeft = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                simState.current.keyLeft = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#141624] active:bg-violet-600/40 border border-slate-800 flex items-center justify-center text-2xl font-black text-white shadow-lg active:scale-95 transition-all select-none touch-none"
              aria-label="Steer Left"
            >
              ◀
            </button>
            <button
              onMouseDown={() => (simState.current.keyRight = true)}
              onMouseUp={() => (simState.current.keyRight = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                simState.current.keyRight = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                simState.current.keyRight = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#141624] active:bg-violet-600/40 border border-slate-800 flex items-center justify-center text-2xl font-black text-white shadow-lg active:scale-95 transition-all select-none touch-none"
              aria-label="Steer Right"
            >
              ▶
            </button>
          </div>

          {/* Quick Pause / Restart Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={pauseGame}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 active:scale-95"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button
              onClick={startGame}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart
            </button>
          </div>

          {/* Pedals: Brake & Gas */}
          <div className="flex gap-2">
            <button
              onMouseDown={() => (simState.current.keyBrake = true)}
              onMouseUp={() => (simState.current.keyBrake = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                simState.current.keyBrake = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                simState.current.keyBrake = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-950/40 active:bg-rose-600 border border-rose-900/50 flex flex-col items-center justify-center font-bold text-rose-300 shadow-lg active:scale-95 transition-all select-none touch-none"
              aria-label="Brake"
            >
              <span className="text-xs">BRAKE</span>
              <span className="text-lg">🛑</span>
            </button>
            <button
              onMouseDown={() => (simState.current.keyUp = true)}
              onMouseUp={() => (simState.current.keyUp = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                simState.current.keyUp = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                simState.current.keyUp = false;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-950/40 active:bg-emerald-600 border border-emerald-900/50 flex flex-col items-center justify-center font-bold text-emerald-300 shadow-lg active:scale-95 transition-all select-none touch-none"
              aria-label="Gas / Accelerate"
            >
              <span className="text-xs">GAS</span>
              <span className="text-lg">⚡</span>
            </button>
          </div>
        </div>

        {/* License & Attribution Notice (Retaining MIT License per requirements) */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          Car Racing Engine Port based on 2D Car Racing Game (C++ / OpenGL) • © 2025 UMAR SAADAT (MIT License).
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameState === 'GAME_OVER'}
        title={gameOverStats.isWin ? '🏆 1st Place Victory!' : '💥 Wrecked / Game Over'}
        score={gameOverStats.finalScore}
        message={
          gameOverStats.isWin
            ? `Spectacular driving! You finished all 3 laps in 1st position with ${gameOverStats.finalScore.toLocaleString()} points!`
            : `Car health depleted. You finished at Position ${gameOverStats.finalPosition}/4 on Lap ${gameOverStats.finalLap}.`
        }
        onRestart={startGame}
      />
    </GameLayout>
  );
};
