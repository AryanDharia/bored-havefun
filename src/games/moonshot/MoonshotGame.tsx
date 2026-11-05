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
  const [bannerMessage, setBannerMessage] = useState<string>('MISSION READY');

  // Stable references for requestAnimationFrame and listeners
  const statusRef = useRef<GameStatus>(status);
  statusRef.current = status;

  const currentLevelIdxRef = useRef<number>(currentLevelIdx);
  currentLevelIdxRef.current = currentLevelIdx;

  // Canvas & Renderer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MoonshotRenderer | null>(null);

  // Active game entity references
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
    gearExtension: 1.0, // Deployed on launch pad
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

  // ---------------------------------------------------------------------------
  // Initialize Renderer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    rendererRef.current = new MoonshotRenderer();
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Level State
  // ---------------------------------------------------------------------------
  const initLevel = useCallback((lvlIdx: number) => {
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
    setBannerMessage(`SECTOR ${lvl.id}: ${lvl.name.toUpperCase()}`);
  }, []);

  // ---------------------------------------------------------------------------
  // Particle Emitters
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
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI - Math.PI; // upward fountain
      const speed = 25 + Math.random() * 65;
      newParticles.push({
        x: x + (Math.random() - 0.5) * 32,
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

  const spawnMuzzleFlash = (x: number, y: number, angle: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const speed = 70 + Math.random() * 50;
      newParticles.push({
        x,
        y,
        vx: Math.sin(angle + spread) * speed,
        vy: -Math.cos(angle + spread) * speed,
        size: 2,
        color: '#38bdf8',
        alpha: 1,
        life: 0,
        maxLife: 8,
        shape: 'spark'
      });
    }
    particlesRef.current.push(...newParticles);
  };

  // ---------------------------------------------------------------------------
  // Shooting Projectiles (Grounded & Airborne)
  // ---------------------------------------------------------------------------
  const fireProjectile = useCallback(() => {
    const st = statusRef.current;
    // Disallow shooting only when dead, completed, paused or in title
    if (
      st === 'crashed' ||
      st === 'game_over' ||
      st === 'level_cleared' ||
      st === 'game_win' ||
      st === 'title' ||
      st === 'paused'
    ) {
      return;
    }

    const rocket = rocketRef.current;
    if (rocket.ammo <= 0) {
      sounds.playClick();
      setBannerMessage('OUT OF AMMO! DOCK AT PAD TO RELOAD');
      return;
    }

    const now = performance.now();
    if (now - lastShotTimeRef.current < 160) return; // Controlled fire cooldown
    lastShotTimeRef.current = now;

    // Deduct exactly 1 ammo
    rocket.ammo -= 1;
    moonshotAudio.playShoot();

    // Spawn at rocket nose tip
    const noseDist = 16;
    const projX = rocket.x + Math.sin(rocket.angle) * noseDist;
    const projY = rocket.y - Math.cos(rocket.angle) * noseDist;

    const projSpeed = 480;
    const projVx = Math.sin(rocket.angle) * projSpeed + rocket.vx * 0.35;
    const projVy = -Math.cos(rocket.angle) * projSpeed + rocket.vy * 0.35;

    spawnMuzzleFlash(projX, projY, rocket.angle);

    projectilesRef.current.push({
      id: `proj-${now}-${Math.random()}`,
      x: projX,
      y: projY,
      vx: projVx,
      vy: projVy,
      life: 0,
      maxLife: 1.15 // seconds
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Landing Gear Toggle
  // ---------------------------------------------------------------------------
  const toggleLandingGear = useCallback(() => {
    const st = statusRef.current;
    if (st === 'crashed' || st === 'title' || st === 'paused') return;

    const rocket = rocketRef.current;
    const newTarget = rocket.gearTarget === 1 ? 0 : 1;
    rocket.gearTarget = newTarget;
    moonshotAudio.playGear(newTarget === 1);
    setBannerMessage(newTarget === 1 ? 'LANDING GEAR DEPLOYED' : 'LANDING GEAR RETRACTED');
  }, []);

  // ---------------------------------------------------------------------------
  // Start / Reset Launch
  // ---------------------------------------------------------------------------
  const handleStartMission = useCallback(
    (lvlIdx: number) => {
      sounds.playClick();
      initLevel(lvlIdx);
      setStatus('ready');
      setBannerMessage('MISSION READY • PRESS [↑/W] FOR LIFTOFF');
    },
    [initLevel]
  );

  const handleRetrySector = useCallback(() => {
    sounds.playClick();
    initLevel(currentLevelIdxRef.current);
    setStatus('ready');
    setBannerMessage('SECTOR RESET • PRESS [↑/W] FOR LIFTOFF');
  }, [initLevel]);

  const handleRestartFull = useCallback(() => {
    sounds.playClick();
    setScore(0);
    setIsNewHighScore(false);
    initLevel(0);
    setStatus('ready');
    setBannerMessage('MISSION READY • PRESS [↑/W] FOR LIFTOFF');
  }, [initLevel]);

  const handleNextLevel = useCallback(() => {
    sounds.playClick();
    const nextIdx = currentLevelIdx + 1;
    if (nextIdx < LEVELS.length) {
      initLevel(nextIdx);
      setStatus('ready');
      setBannerMessage(`SECTOR ${nextIdx + 1} READY • PRESS [↑/W] FOR LIFTOFF`);
    }
  }, [currentLevelIdx, initLevel]);

  // ---------------------------------------------------------------------------
  // Main Fixed-Timestep Physics Step
  // ---------------------------------------------------------------------------
  const stepPhysics = useCallback(
    (dt: number) => {
      const st = statusRef.current;
      const rocket = rocketRef.current;
      const pads = padsRef.current;
      const terrain = currentLevel.terrain;
      const launchPad = pads.find((p) => p.isLaunchPad) || pads[0];

      // Physics integration runs during launching, flying, and landing_approach
      if (st === 'launching' || st === 'flying' || st === 'landing_approach') {
        updateRocketPhysics(rocket, dt);

        // Synchronize thruster sound rumble
        moonshotAudio.setThrust(rocket.isThrusting && rocket.fuel > 0);

        // Exhaust particle sparks
        if (rocket.isThrusting && rocket.fuel > 0 && Math.random() < 0.65) {
          const flameDist = 14;
          const exX = rocket.x - Math.sin(rocket.angle) * flameDist + (Math.random() - 0.5) * 4;
          const exY = rocket.y + Math.cos(rocket.angle) * flameDist + (Math.random() - 0.5) * 4;
          particlesRef.current.push({
            x: exX,
            y: exY,
            vx: -Math.sin(rocket.angle) * (60 + Math.random() * 40) + (Math.random() - 0.5) * 20,
            vy: Math.cos(rocket.angle) * (60 + Math.random() * 40) + (Math.random() - 0.5) * 20,
            size: 1.8 + Math.random() * 2.2,
            color: Math.random() > 0.4 ? '#f97316' : '#fde047',
            alpha: 0.95,
            life: 0,
            maxLife: 16,
            shape: 'spark'
          });
        }

        // Low fuel warning
        if (rocket.fuel < 20 && rocket.fuel > 0 && Math.random() < 0.04) {
          setBannerMessage('WARNING: FUEL CRITICALLY LOW');
        }

        // 1. STATE TRANSITION: LAUNCHING -> FLYING
        if (st === 'launching') {
          // Once rocket climbs clear of the launch pad elevation or flies away horizontally:
          const hasClearedVertically = rocket.y < launchPad.y - 20;
          const hasClearedHorizontally =
            rocket.x < launchPad.x1 - 15 || rocket.x > launchPad.x2 + 15;
          if (hasClearedVertically || hasClearedHorizontally) {
            setStatus('flying');
            setBannerMessage('IN FLIGHT • MISSION ACTIVE');
          }
        }

        // 2. STATE TRANSITION: FLYING -> LANDING_APPROACH or CRASH
        if (st === 'flying') {
          // Detect descending approach towards any landing pad
          if (rocket.vy > 0) {
            for (const pad of pads) {
              const isVerticallyNear =
                rocket.y >= pad.y - 65 && rocket.y <= pad.y + 10;
              const isHorizontallyNear =
                rocket.x >= pad.x1 - 25 && rocket.x <= pad.x2 + 25;
              if (isVerticallyNear && isHorizontallyNear) {
                setStatus('landing_approach');
                break;
              }
            }
          }

          // Check terrain collision
          if (checkTerrainCollision(rocket, terrain, pads)) {
            setStatus('crashed');
            moonshotAudio.setThrust(false);
            moonshotAudio.playCrash();
            spawnExplosion(rocket.x, rocket.y, '#ef4444', 36);
            setBannerMessage('CRASH! COLLIDED WITH LUNAR TERRAIN');
            return;
          }
        }

        // 3. STATE TRANSITION: LANDING_APPROACH -> LANDING, CRASH, or ABORT BACK TO FLYING
        if (st === 'landing_approach') {
          // If the player accelerates upward or flies away from the pad vicinity, revert to flying
          let nearAnyPad = false;
          for (const pad of pads) {
            if (
              rocket.y >= pad.y - 75 &&
              rocket.y <= pad.y + 15 &&
              rocket.x >= pad.x1 - 35 &&
              rocket.x <= pad.x2 + 35
            ) {
              nearAnyPad = true;
              break;
            }
          }

          if (rocket.vy < -8 || !nearAnyPad) {
            setStatus('flying');
          } else {
            // Check landing touchdown contact
            const { inContact, evaluation } = evaluateLanding(rocket, pads);
            if (inContact) {
              if (evaluation.isSafe && evaluation.pad) {
                // SUCCESSFUL LANDING!
                setStatus('landing');
                moonshotAudio.setThrust(false);
                moonshotAudio.playLandingSuccess();
                spawnLandingSparkles(rocket.x, evaluation.pad.y);

                // Settle rocket safely on pad
                rocket.vx = 0;
                rocket.vy = 0;
                rocket.angle = 0;
                rocket.y = evaluation.pad.y - 14;
                rocket.isThrusting = false;

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

                const allTargetsCleared = targetsRef.current.length === 0;
                const isDest = evaluation.pad.isDestination;

                if (isDest && allTargetsCleared) {
                  // ALL OBJECTIVES COMPLETE!
                  setStatus('level_cleared');
                  moonshotAudio.playLevelClear();
                  setBannerMessage('MISSION OBJECTIVES COMPLETE! SECTOR CLEARED');

                  const nextLvlNum = currentLevel.id + 1;
                  if (nextLvlNum <= LEVELS.length) {
                    setUnlockedLevel((curr) => {
                      const updated = Math.max(curr, nextLvlNum);
                      setStorageItem('moonshot_unlocked_level', updated);
                      return updated;
                    });
                  } else {
                    setStatus('game_win');
                    try {
                      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                    } catch {}
                  }
                  return;
                }

                // If not destination or targets remain, proceed to REFUELING -> READY_FOR_TAKEOFF
                setStatus('refueling');
                setBannerMessage('TOUCHDOWN (+3 PTS)! REFUELING & RELOADING');
                moonshotAudio.playRefuelTick();

                // Refill fuel and ammo
                rocket.fuel = rocket.maxFuel;
                rocket.ammo = rocket.maxAmmo;
                evaluation.pad.visited = true;

                // Transition to ready_for_takeoff after short refueling sequence
                window.setTimeout(() => {
                  if (statusRef.current === 'refueling') {
                    setStatus('ready_for_takeoff');
                    setBannerMessage('REFUELED & RELOADED • READY FOR TAKEOFF');
                  }
                }, 550);
                return;
              } else {
                // CRASH ON PAD!
                setStatus('crashed');
                moonshotAudio.setThrust(false);
                moonshotAudio.playCrash();
                spawnExplosion(rocket.x, rocket.y, '#ef4444', 36);
                setBannerMessage(evaluation.reason || 'CRASH DETECTED ON LANDING PAD');
                return;
              }
            }

            // Check terrain collision during approach
            if (checkTerrainCollision(rocket, terrain, pads)) {
              setStatus('crashed');
              moonshotAudio.setThrust(false);
              moonshotAudio.playCrash();
              spawnExplosion(rocket.x, rocket.y, '#ef4444', 36);
              setBannerMessage('CRASH! COLLIDED WITH LUNAR TERRAIN');
              return;
            }
          }
        }
      }

      // 4. Update Projectiles & Check Target Collisions
      const remainingProjectiles: Projectile[] = [];
      for (const proj of projectilesRef.current) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life += dt;

        // Trailing plasma spark
        if (Math.random() < 0.4) {
          particlesRef.current.push({
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: 1.5,
            color: '#38bdf8',
            alpha: 0.8,
            life: 0,
            maxLife: 10,
            shape: 'spark'
          });
        }

        let hit = false;
        // Collision against targets
        for (let tIdx = targetsRef.current.length - 1; tIdx >= 0; tIdx--) {
          const target = targetsRef.current[tIdx];
          if (checkProjectileTargetCollision(proj, target)) {
            hit = true;
            target.hp -= 1;
            moonshotAudio.playHit();
            spawnExplosion(target.x, target.y, target.color, 10);

            if (target.hp <= 0) {
              // Target destroyed!
              moonshotAudio.playExplode();
              spawnExplosion(target.x, target.y, target.color, 26);
              targetsRef.current.splice(tIdx, 1);

              // Award score once per destroyed target
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
            break; // Projectile consumed on hit
          }
        }

        if (
          !hit &&
          proj.life < proj.maxLife &&
          proj.x >= 0 &&
          proj.x <= CANVAS_WIDTH &&
          proj.y >= 0 &&
          proj.y <= CANVAS_HEIGHT
        ) {
          remainingProjectiles.push(proj);
        }
      }
      projectilesRef.current = remainingProjectiles;

      // 5. Update Targets (Drift & Hover)
      for (const t of targetsRef.current) {
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        t.rotation += t.rotationSpeed * dt;

        // Bounce gently within sky boundaries
        if (t.x < 30) {
          t.x = 30;
          t.vx = Math.abs(t.vx);
        } else if (t.x > CANVAS_WIDTH - 30) {
          t.x = CANVAS_WIDTH - 30;
          t.vx = -Math.abs(t.vx);
        }
        if (t.y < 45) {
          t.y = 45;
          t.vy = Math.abs(t.vy);
        } else if (t.y > 340) {
          t.y = 340;
          t.vy = -Math.abs(t.vy);
        }
      }

      // 6. Update Particles
      const remainingParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.shape === 'ring') {
          p.size += 25 * dt;
        }

        if (p.life < p.maxLife) {
          remainingParticles.push(p);
        }
      }
      particlesRef.current = remainingParticles;
    },
    [currentLevel]
  );

  // ---------------------------------------------------------------------------
  // Animation Frame Loop
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

      const clampedDelta = Math.min(delta, 0.1);

      const st = statusRef.current;
      if (st === 'launching' || st === 'flying' || st === 'landing_approach') {
        accumulatorRef.current += clampedDelta;
        while (accumulatorRef.current >= FIXED_DT) {
          stepPhysics(FIXED_DT);
          accumulatorRef.current -= FIXED_DT;
        }
      } else if (st === 'ready' || st === 'ready_for_takeoff') {
        // In grounded states, check if thrust key was activated
        const r = rocketRef.current;
        if (r.isThrusting && r.fuel > 0) {
          setStatus('launching');
          r.vy = -45; // Lift-off upward impulse
          moonshotAudio.setThrust(true);
          setBannerMessage('LIFTOFF! ASCENDING FROM PAD');
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
          status: statusRef.current,
          levelId: currentLevel.id,
          levelName: currentLevel.name,
          score,
          highScore,
          bannerMessage,
          bannerTimer: 0,
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
  }, [currentLevel, score, highScore, bannerMessage, stepPhysics]);

  // ---------------------------------------------------------------------------
  // Unified Keyboard Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scroll only when playing
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
        e.key === ' '
      ) {
        if (statusRef.current !== 'title') {
          e.preventDefault();
        }
      }

      const st = statusRef.current;
      const rocket = rocketRef.current;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          rocket.isThrusting = true;
          if (st === 'ready' || st === 'ready_for_takeoff') {
            setStatus('launching');
            rocket.vy = -45;
            moonshotAudio.setThrust(true);
            setBannerMessage('LIFTOFF! ASCENDING FROM PAD');
          }
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
          if (!e.repeat) {
            fireProjectile();
          }
          break;
        case 'KeyG':
          if (!e.repeat) {
            toggleLandingGear();
          }
          break;
        case 'KeyR':
          if (!e.repeat) {
            if (st === 'crashed' || st === 'flying' || st === 'landing_approach') {
              handleRetrySector();
            }
          }
          break;
        case 'KeyP':
        case 'Escape':
          if (!e.repeat) {
            if (st === 'flying' || st === 'landing_approach' || st === 'launching') {
              setStatus('paused');
              moonshotAudio.setThrust(false);
            } else if (st === 'paused') {
              setStatus('flying');
            }
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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

    const handleBlur = () => {
      const rocket = rocketRef.current;
      rocket.isThrusting = false;
      rocket.isRotatingLeft = false;
      rocket.isRotatingRight = false;
      moonshotAudio.setThrust(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      moonshotAudio.setThrust(false);
    };
  }, [fireProjectile, toggleLandingGear, handleRetrySector]);

  // ---------------------------------------------------------------------------
  // Touch / Mobile Controls
  // ---------------------------------------------------------------------------
  const handleTouchThrustStart = () => {
    const rocket = rocketRef.current;
    rocket.isThrusting = true;
    const st = statusRef.current;
    if (st === 'ready' || st === 'ready_for_takeoff') {
      setStatus('launching');
      rocket.vy = -45;
      moonshotAudio.setThrust(true);
      setBannerMessage('LIFTOFF! ASCENDING FROM PAD');
    }
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

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={handleRestartFull}
      headerControls={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {(status === 'flying' || status === 'landing_approach' || status === 'launching') && (
            <button
              type="button"
              tabIndex={-1}
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
              type="button"
              tabIndex={-1}
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
            tabIndex={0}
            onClick={() => canvasRef.current?.focus()}
            className="w-full h-full block cursor-crosshair touch-none focus:outline-none"
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
                mechanical landing gear, and touch down safely on extraction landing pads!
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
                        type="button"
                        tabIndex={-1}
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
                type="button"
                tabIndex={-1}
                onClick={() => handleStartMission(currentLevelIdx)}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black font-mono text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>INITIATE MISSION [START]</span>
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
                  type="button"
                  tabIndex={-1}
                  onClick={handleRetrySector}
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
                    Sector {currentLevel.id + 1}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                tabIndex={-1}
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
          {/* Top Control Bar: Gear Toggle, Fire, Retry */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              tabIndex={-1}
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
              type="button"
              tabIndex={-1}
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
              type="button"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault();
                handleRetrySector();
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
              type="button"
              tabIndex={-1}
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
              type="button"
              tabIndex={-1}
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
              type="button"
              tabIndex={-1}
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
        onRestart={handleRestartFull}
      />
    </GameLayout>
  );
};
