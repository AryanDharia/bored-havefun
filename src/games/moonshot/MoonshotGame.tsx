import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore, getStorageItem, setStorageItem } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Pause,
  Play,
  RotateCw,
  Zap,
  Flame,
  Shield,
  ArrowRight
} from 'lucide-react';
import type {
  Rocket,
  GameStatus,
  Target,
  Projectile,
  Particle,
  LandingPad
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  updateRocketPhysics,
  evaluateLanding,
  checkTerrainCollision,
  checkProjectileTargetCollision
} from './physics';
import { LEVELS } from './levels';
import { MoonshotRenderer } from './renderer';
import { moonshotAudio } from './audio';

const GAME_ID = 'moonshot';
const FIXED_DT = 1 / 60; // 60 FPS fixed physics simulation

export const MoonshotGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === GAME_ID)!;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() =>
    getStorageItem('moonshot_unlocked_level', 1)
  );
  const [status, setStatus] = useState<GameStatus>('title');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore(GAME_ID));
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3);
  const [bannerMessage, setBannerMessage] = useState<string>('MISSION READY');

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MoonshotRenderer | null>(null);

  // Active game entity references (to avoid re-instantiating inside animation frame)
  const currentLevel = LEVELS[currentLevelIdx] || LEVELS[0];

  const rocketRef = useRef<Rocket>({
    x: currentLevel.spawnRocket.x,
    y: currentLevel.spawnRocket.y,
    vx: 0,
    vy: 0,
    angle: currentLevel.spawnRocket.angle || 0,
    rotationSpeed: 0,
    fuel: currentLevel.startingFuel,
    maxFuel: currentLevel.startingFuel,
    gearExtension: 1.0, // Start with gear deployed on launch pad
    gearTarget: 1.0,
    isThrusting: false,
    isRotatingLeft: false,
    isRotatingRight: false,
    ammo: currentLevel.startingAmmo,
    maxAmmo: currentLevel.startingAmmo,
    width: 18,
    height: 26
  });

  const targetsRef = useRef<Target[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const padsRef = useRef<LandingPad[]>([]);
  const lastShotTimeRef = useRef<number>(0);

  // Time & Loop Refs
  const animFrameIdRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const bannerTimerRef = useRef<number>(0);

  // Key tracking to prevent repeated triggers
  const keysDownRef = useRef<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // Initialize Renderer & Level
  // ---------------------------------------------------------------------------
  useEffect(() => {
    rendererRef.current = new MoonshotRenderer();
  }, []);

  const initLevel = useCallback(
    (lvlIdx: number) => {
      const lvl = LEVELS[lvlIdx] || LEVELS[0];
      setCurrentLevelIdx(lvlIdx);

      rocketRef.current = {
        x: lvl.spawnRocket.x,
        y: lvl.spawnRocket.y,
        vx: 0,
        vy: 0,
        angle: lvl.spawnRocket.angle || 0,
        rotationSpeed: 0,
        fuel: lvl.startingFuel,
        maxFuel: lvl.startingFuel,
        gearExtension: 1.0, // Deployed on launcher
        gearTarget: 1.0,
        isThrusting: false,
        isRotatingLeft: false,
        isRotatingRight: false,
        ammo: lvl.startingAmmo,
        maxAmmo: lvl.startingAmmo,
        width: 18,
        height: 26
      };

      // Clone pads
      padsRef.current = lvl.pads.map((p) => ({ ...p, visited: false }));

      // Clone targets
      targetsRef.current = lvl.targets.map((t, idx) => ({
        ...t,
        id: `target-${lvl.id}-${idx}`,
        rotation: 0
      }));

      projectilesRef.current = [];
      particlesRef.current = [];
      lastShotTimeRef.current = 0;
      setBannerMessage(`LVL ${lvl.id}: ${lvl.name.toUpperCase()}`);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Spawn Particle Effects
  // ---------------------------------------------------------------------------
  const spawnExplosion = (x: number, y: number, color = '#f97316', count = 24) => {
    const newParticles: Particle[] = [];
    // Expanding shockwave ring
    newParticles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 4,
      color,
      alpha: 1,
      life: 0,
      maxLife: 20,
      shape: 'ring'
    });

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 110;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.5,
        color: Math.random() > 0.3 ? color : '#fef08a',
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 20,
        shape: Math.random() > 0.5 ? 'spark' : 'square'
      });
    }
    particlesRef.current.push(...newParticles);
  };

  const spawnLandingSparkles = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI - Math.PI; // upward burst
      const speed = 20 + Math.random() * 60;
      newParticles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#10b981' : '#38bdf8',
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 15,
        shape: 'spark'
      });
    }
    particlesRef.current.push(...newParticles);
  };

  // ---------------------------------------------------------------------------
  // Shooting Projectiles
  // ---------------------------------------------------------------------------
  const fireProjectile = useCallback(() => {
    const rocket = rocketRef.current;
    if (rocket.ammo <= 0) return;

    const now = performance.now();
    if (now - lastShotTimeRef.current < 160) return; // Fire rate limit
    lastShotTimeRef.current = now;

    rocket.ammo -= 1;
    moonshotAudio.playShoot();

    // Spawn projectile from rocket nose
    const noseDist = 14;
    const projX = rocket.x + Math.sin(rocket.angle) * noseDist;
    const projY = rocket.y - Math.cos(rocket.angle) * noseDist;

    const projSpeed = 460;
    const projVx = Math.sin(rocket.angle) * projSpeed + rocket.vx * 0.3;
    const projVy = -Math.cos(rocket.angle) * projSpeed + rocket.vy * 0.3;

    projectilesRef.current.push({
      id: `proj-${now}-${Math.random()}`,
      x: projX,
      y: projY,
      vx: projVx,
      vy: projVy,
      life: 0,
      maxLife: 1.1 // seconds
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Gear Toggle
  // ---------------------------------------------------------------------------
  const toggleLandingGear = useCallback(() => {
    const rocket = rocketRef.current;
    const newTarget = rocket.gearTarget === 1 ? 0 : 1;
    rocket.gearTarget = newTarget;
    moonshotAudio.playGear(newTarget === 1);
    setBannerMessage(newTarget === 1 ? 'LANDING GEAR DEPLOYED' : 'LANDING GEAR RETRACTED');
  }, []);

  // ---------------------------------------------------------------------------
  // Start Launch Countdown
  // ---------------------------------------------------------------------------
  const startLaunchSequence = useCallback(
    (lvlIdx: number) => {
      initLevel(lvlIdx);
      setStatus('countdown');
      setCountdownSeconds(3);

      let count = 3;
      const timer = window.setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownSeconds(count);
          sounds.playClick();
        } else if (count === 0) {
          setCountdownSeconds(0);
          sounds.playScore();
        } else {
          clearInterval(timer);
          setStatus('flying');
          setBannerMessage('ROCKET LAUNCHED! IGNITE THRUSTERS');
        }
      }, 700);
    },
    [initLevel]
  );

  // ---------------------------------------------------------------------------
  // Main Fixed Physics Step
  // ---------------------------------------------------------------------------
  const stepPhysics = useCallback(
    (dt: number) => {
      const rocket = rocketRef.current;
      const pads = padsRef.current;
      const terrain = currentLevel.terrain;

      // 1. Update Rocket Physics
      if (status === 'flying') {
        updateRocketPhysics(rocket, dt);

        // Sound sync for thrust
        moonshotAudio.setThrust(rocket.isThrusting && rocket.fuel > 0);

        // Trailing exhaust particle sparks
        if (rocket.isThrusting && rocket.fuel > 0 && Math.random() < 0.6) {
          const flameDist = 12;
          const exX = rocket.x - Math.sin(rocket.angle) * flameDist + (Math.random() - 0.5) * 4;
          const exY = rocket.y + Math.cos(rocket.angle) * flameDist + (Math.random() - 0.5) * 4;
          particlesRef.current.push({
            x: exX,
            y: exY,
            vx: -Math.sin(rocket.angle) * (50 + Math.random() * 30) + (Math.random() - 0.5) * 20,
            vy: Math.cos(rocket.angle) * (50 + Math.random() * 30) + (Math.random() - 0.5) * 20,
            size: 1.5 + Math.random() * 2,
            color: Math.random() > 0.4 ? '#f97316' : '#fde047',
            alpha: 0.9,
            life: 0,
            maxLife: 15,
            shape: 'spark'
          });
        }

        // Low fuel warning
        if (rocket.fuel < 20 && rocket.fuel > 0 && Math.random() < 0.05) {
          setBannerMessage('WARNING: FUEL CRITICALLY LOW');
        }

        // 2. Evaluate Landing Pad Collision
        const { inContact, evaluation } = evaluateLanding(rocket, pads);
        if (inContact) {
          if (evaluation.isSafe && evaluation.pad) {
            // SUCCESSFUL LANDING!
            setStatus('landed');
            moonshotAudio.setThrust(false);
            moonshotAudio.playLandingSuccess();
            spawnLandingSparkles(rocket.x, evaluation.pad.y);

            // Anchor rocket safely on pad
            rocket.vx = 0;
            rocket.vy = 0;
            rocket.angle = 0;
            rocket.y = evaluation.pad.y - 12; // Resting feet height
            rocket.isThrusting = false;

            // Refill fuel and ammo
            rocket.fuel = rocket.maxFuel;
            rocket.ammo = rocket.maxAmmo;
            evaluation.pad.visited = true;

            // Award EXACTLY 3 points (user requirement)
            setScore((prev) => {
              const newScore = prev + 3;
              setHighScore((hi) => {
                if (newScore > hi) {
                  saveHighScore(GAME_ID, newScore);
                  setIsNewHighScore(true);
                  return newScore;
                }
                return hi;
              });
              return newScore;
            });

            // Check if this was the final Destination Pad AND all targets cleared
            const allTargetsDestroyed = targetsRef.current.length === 0;
            if (evaluation.pad.isDestination && allTargetsDestroyed) {
              setBannerMessage('MISSION OBJECTIVES COMPLETE! LANDING CONFIRMED');
              setStatus('level_cleared');
              moonshotAudio.playLevelClear();

              // Unlock next level
              const nextLvlNum = currentLevel.id + 1;
              if (nextLvlNum <= LEVELS.length) {
                setUnlockedLevel((curr) => {
                  const updated = Math.max(curr, nextLvlNum);
                  setStorageItem('moonshot_unlocked_level', updated);
                  return updated;
                });
              } else {
                // Completed all 8 levels!
                setStatus('game_win');
                try {
                  confetti({
                    particleCount: 100,
                    spread: 80,
                    origin: { y: 0.6 }
                  });
                } catch {}
              }
            } else if (evaluation.pad.isDestination && !allTargetsDestroyed) {
              setBannerMessage(
                `REFUELED (+3 PTS). ${targetsRef.current.length} TARGETS REMAINING!`
              );
            } else {
              setBannerMessage('SAFE LANDING (+3 PTS)! REFUELED & RELOADED');
            }
            return;
          } else {
            // CRASH ON PAD!
            setStatus('crashed');
            moonshotAudio.playCrash();
            spawnExplosion(rocket.x, rocket.y, '#ef4444', 36);
            setBannerMessage(evaluation.reason || 'CRASH DETECTED ON LANDING PAD');
            return;
          }
        }

        // 3. Evaluate Terrain Collision
        if (checkTerrainCollision(rocket, terrain, pads)) {
          setStatus('crashed');
          moonshotAudio.playCrash();
          spawnExplosion(rocket.x, rocket.y, '#ef4444', 36);
          setBannerMessage('CRASH! COLLIDED WITH LUNAR TERRAIN');
          return;
        }
      }

      // 4. Update Projectiles
      const remainingProjectiles: Projectile[] = [];
      for (const proj of projectilesRef.current) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life += dt;

        let hit = false;
        // Check collision with targets
        for (let tIdx = targetsRef.current.length - 1; tIdx >= 0; tIdx--) {
          const target = targetsRef.current[tIdx];
          if (checkProjectileTargetCollision(proj, target)) {
            hit = true;
            target.hp -= 1;
            moonshotAudio.playHit();
            spawnExplosion(target.x, target.y, target.color, 10);

            if (target.hp <= 0) {
              // Destroyed target
              moonshotAudio.playExplode();
              spawnExplosion(target.x, target.y, target.color, 24);
              targetsRef.current.splice(tIdx, 1);

              // Award target points
              setScore((prev) => {
                const newScore = prev + target.points;
                setHighScore((hi) => {
                  if (newScore > hi) {
                    saveHighScore(GAME_ID, newScore);
                    setIsNewHighScore(true);
                    return newScore;
                  }
                  return hi;
                });
                return newScore;
              });

              setBannerMessage(`TARGET DESTROYED! +${target.points} PTS`);
            }
            break; // Projectile can only hit one target
          }
        }

        if (!hit && proj.life < proj.maxLife && proj.x >= 0 && proj.x <= CANVAS_WIDTH && proj.y >= 0) {
          remainingProjectiles.push(proj);
        }
      }
      projectilesRef.current = remainingProjectiles;

      // 5. Update Targets (Drift & Sinusoidal Hover)
      for (const t of targetsRef.current) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.rotation += t.rotationSpeed * dt;

        // Bounce within sky bounds
        if (t.x < 30) {
          t.x = 30;
          t.vx = Math.abs(t.vx);
        } else if (t.x > CANVAS_WIDTH - 30) {
          t.x = CANVAS_WIDTH - 30;
          t.vx = -Math.abs(t.vx);
        }
        if (t.y < 40) {
          t.y = 40;
          t.vy = Math.abs(t.vy);
        } else if (t.y > 320) {
          t.y = 320;
          t.vy = -Math.abs(t.vy);
        }
      }

      // 6. Update Particles
      const remainingParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += 1;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.shape === 'ring') {
          p.size += 25 * dt;
        }

        if (p.life < p.maxLife) {
          remainingParticles.push(p);
        }
      }
      particlesRef.current = remainingParticles;
    },
    [status, currentLevel]
  );

  // ---------------------------------------------------------------------------
  // requestAnimationFrame Loop with Fixed Timestep Accumulator
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const gameLoop = (currentTime: number) => {
      if (!running) return;

      const delta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Clamp delta to avoid massive spiral of death on tab unfocus
      const clampedDelta = Math.min(delta, 0.1);

      if (status === 'flying') {
        accumulatorRef.current += clampedDelta;
        while (accumulatorRef.current >= FIXED_DT) {
          stepPhysics(FIXED_DT);
          accumulatorRef.current -= FIXED_DT;
        }
      } else if (status === 'landed') {
        // In landed state, allow player to ignite thruster to take off!
        const r = rocketRef.current;
        if (r.isThrusting && r.fuel > 0) {
          setStatus('flying');
          r.vy = -35; // Lift-off upward impulse
          setBannerMessage('LIFT-OFF! MISSION CONTINUES');
        }
      }

      // Render Scene
      if (rendererRef.current) {
        rendererRef.current.render(ctx, {
          rocket: rocketRef.current,
          pads: padsRef.current,
          terrain: currentLevel.terrain,
          targets: targetsRef.current,
          projectiles: projectilesRef.current,
          particles: particlesRef.current,
          status,
          levelId: currentLevel.id,
          levelName: currentLevel.name,
          score,
          highScore,
          bannerMessage,
          bannerTimer: bannerTimerRef.current,
          countdownSeconds,
          time: currentTime / 1000
        });
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      running = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      moonshotAudio.setThrust(false);
    };
  }, [status, currentLevel, score, highScore, bannerMessage, countdownSeconds, stepPhysics]);

  // ---------------------------------------------------------------------------
  // Keyboard Listeners (Zero Accidental Scrolling)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(
          e.code
        ) ||
        e.key === ' '
      ) {
        e.preventDefault();
      }

      if (keysDownRef.current[e.code]) return; // Avoid repeat spam for discrete actions
      keysDownRef.current[e.code] = true;

      const rocket = rocketRef.current;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          rocket.isThrusting = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          rocket.isRotatingLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          rocket.isRotatingRight = true;
          break;
        case 'Space':
          if (status === 'flying') {
            fireProjectile();
          }
          break;
        case 'KeyG':
          if (status === 'flying' || status === 'countdown') {
            toggleLandingGear();
          }
          break;
        case 'KeyR':
          if (status === 'crashed' || status === 'flying') {
            sounds.playClick();
            startLaunchSequence(currentLevelIdx);
          }
          break;
        case 'KeyP':
        case 'Escape':
          if (status === 'flying') {
            setStatus('paused');
            moonshotAudio.setThrust(false);
          } else if (status === 'paused') {
            setStatus('flying');
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
      const rocket = rocketRef.current;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          rocket.isThrusting = false;
          moonshotAudio.setThrust(false);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          rocket.isRotatingLeft = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          rocket.isRotatingRight = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      moonshotAudio.setThrust(false);
    };
  }, [status, currentLevelIdx, fireProjectile, toggleLandingGear, startLaunchSequence]);

  // ---------------------------------------------------------------------------
  // Touch / Mobile Button Actions
  // ---------------------------------------------------------------------------
  const handleTouchThrustStart = () => {
    rocketRef.current.isThrusting = true;
  };
  const handleTouchThrustEnd = () => {
    rocketRef.current.isThrusting = false;
    moonshotAudio.setThrust(false);
  };
  const handleTouchRotLeftStart = () => {
    rocketRef.current.isRotatingLeft = true;
  };
  const handleTouchRotLeftEnd = () => {
    rocketRef.current.isRotatingLeft = false;
  };
  const handleTouchRotRightStart = () => {
    rocketRef.current.isRotatingRight = true;
  };
  const handleTouchRotRightEnd = () => {
    rocketRef.current.isRotatingRight = false;
  };

  // ---------------------------------------------------------------------------
  // Restart Game Handler
  // ---------------------------------------------------------------------------
  const handleRestart = () => {
    sounds.playClick();
    setScore(0);
    setIsNewHighScore(false);
    startLaunchSequence(0);
  };

  const handleNextLevel = () => {
    sounds.playClick();
    const nextIdx = currentLevelIdx + 1;
    if (nextIdx < LEVELS.length) {
      startLaunchSequence(nextIdx);
    }
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={handleRestart}
      headerControls={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {status === 'flying' && (
            <button
              onClick={() => {
                setStatus('paused');
                moonshotAudio.setThrust(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Pause Game"
            >
              <Pause className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden xs:inline">Pause</span>
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={() => setStatus('flying')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Resume Game"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Resume</span>
            </button>
          )}
        </div>
      }
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 select-none py-1 sm:py-2">
        {/* ================================================================= */}
        {/* RETRO FLASH ARCADE CANVAS CONTAINER */}
        {/* ================================================================= */}
        <div className="relative w-full aspect-[4/3] max-w-[800px] rounded-2xl bg-black border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full block cursor-crosshair touch-none"
          />

          {/* 1. TITLE SCREEN OVERLAY */}
          {status === 'title' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/25 mb-3">
                🚀
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-wider uppercase mb-1">
                MOONSHOT
              </h1>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 font-bold uppercase tracking-widest mb-4">
                Rocket Rescue • Retro Flash Arcade
              </span>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md font-sans leading-relaxed mb-6">
                Navigate low-gravity lunar terrain, blast floating orbital hazards, deploy your
                mechanical landing gear, and touch down softly on destination landing pads!
              </p>

              {/* Level Selector */}
              <div className="flex flex-col items-center gap-2 mb-6 w-full max-w-sm">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Select Mission Sector:
                </span>
                <div className="grid grid-cols-4 gap-1.5 w-full">
                  {LEVELS.map((lvl, idx) => {
                    const isUnlocked = lvl.id <= unlockedLevel;
                    return (
                      <button
                        key={lvl.id}
                        disabled={!isUnlocked}
                        onClick={() => {
                          sounds.playClick();
                          setCurrentLevelIdx(idx);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all ${
                          idx === currentLevelIdx
                            ? 'bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-300'
                            : isUnlocked
                            ? 'bg-white/10 hover:bg-white/20 text-slate-200'
                            : 'bg-white/5 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Lvl {lvl.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Launch Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  startLaunchSequence(currentLevelIdx);
                }}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black font-mono text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>INITIATE LAUNCH SEQUENCE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 2. CRASH MODAL OVERLAY */}
          {status === 'crashed' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl text-rose-400 mb-3 shadow-lg">
                💥
              </div>
              <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight mb-1">
                ROCKET CRASHED
              </h2>
              <p className="text-xs sm:text-sm font-mono text-rose-400 mb-5 max-w-sm">
                {bannerMessage}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playClick();
                    startLaunchSequence(currentLevelIdx);
                  }}
                  className="py-2.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Sector [R]</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. LEVEL CLEARED MODAL OVERLAY */}
          {status === 'level_cleared' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl text-emerald-400 mb-3 shadow-lg">
                🏆
              </div>
              <h2 className="text-2xl font-black font-display text-white uppercase tracking-tight mb-1">
                SECTOR CLEARED!
              </h2>
              <p className="text-xs sm:text-sm font-mono text-emerald-400 mb-4">
                Safe touchdown confirmed on destination pad. +3 Points awarded!
              </p>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-6 mb-5 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT SCORE</span>
                  <strong className="text-base text-white">{score}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NEXT SECTOR</span>
                  <strong className="text-base text-cyan-400">
                    Level {currentLevel.id + 1}
                  </strong>
                </div>
              </div>

              <button
                onClick={handleNextLevel}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black font-mono text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>PROCEED TO NEXT LEVEL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* MOBILE ERGONOMIC TOUCH KEYPAD */}
        {/* ================================================================= */}
        <div className="w-full max-w-lg flex flex-col gap-2 pt-1 md:hidden select-none">
          {/* Top Control Bar: Gear Toggle, Fire, Restart */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                toggleLandingGear();
              }}
              className="py-3 rounded-2xl bg-slate-800 active:bg-cyan-600 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-[9px] uppercase tracking-wider">GEAR [G]</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                fireProjectile();
              }}
              className="py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 active:from-blue-500 active:to-cyan-500 text-white border border-cyan-400/30 shadow-md font-mono font-black text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <Zap className="w-4 h-4 text-white" />
              <span className="text-[9px] uppercase tracking-wider">FIRE [SPACE]</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                startLaunchSequence(currentLevelIdx);
              }}
              className="py-3 rounded-2xl bg-slate-800 active:bg-orange-600 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span className="text-[9px] uppercase tracking-wider">RETRY [R]</span>
            </button>
          </div>

          {/* Bottom Steering & Main Thruster */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchRotLeftStart();
              }}
              onPointerUp={handleTouchRotLeftEnd}
              onPointerLeave={handleTouchRotLeftEnd}
              className="py-4 rounded-2xl bg-slate-800 active:bg-slate-700 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <RotateCcw className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] uppercase tracking-wider">ROT L [A]</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchRotRightStart();
              }}
              onPointerUp={handleTouchRotRightEnd}
              onPointerLeave={handleTouchRotRightEnd}
              className="py-4 rounded-2xl bg-slate-800 active:bg-slate-700 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <RotateCw className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] uppercase tracking-wider">ROT R [D]</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                handleTouchThrustStart();
              }}
              onPointerUp={handleTouchThrustEnd}
              onPointerLeave={handleTouchThrustEnd}
              className="py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 active:from-orange-400 active:to-amber-400 text-slate-950 border border-amber-400/40 shadow-lg font-mono font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all touch-none"
            >
              <Flame className="w-5 h-5 fill-slate-950" />
              <span className="text-[9px] uppercase tracking-wider font-bold">THRUST [W/↑]</span>
            </button>
          </div>
        </div>

        {/* Desktop Controls Hint Bar */}
        <div className="hidden md:flex items-center justify-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
          <span>↑/W Thrust</span>
          <span>•</span>
          <span>←/A & →/D Rotate</span>
          <span>•</span>
          <span>Space Shoot</span>
          <span>•</span>
          <span>G Toggle Landing Gear</span>
          <span>•</span>
          <span>R Restart Flight</span>
          <span>•</span>
          <span>P Pause</span>
        </div>
      </div>

      {/* Game Win / Victory Modal */}
      <GameOverModal
        isOpen={status === 'game_win'}
        title="🏆 Moonshot Victory!"
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHighScore}
        message="Magnificent piloting, Commander! You have conquered all 8 lunar rescue sectors and mastered retro rocket mechanics."
        onRestart={handleRestart}
      />
    </GameLayout>
  );
};
