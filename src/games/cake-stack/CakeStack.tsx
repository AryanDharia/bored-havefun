import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore, getStorageItem, setStorageItem } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Pause,
  Play,
  Flame,
  Clock,
  Sparkles,
  Users,
  Timer
} from 'lucide-react';
import type {
  CakeGameMode,
  CakeGameStatus,
  CakeLayer,
  FallingSlice,
  PassAndPlayPlayer
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_HEIGHT,
  INITIAL_LAYER_WIDTH,
  BASE_PEDESTAL_Y,
  calculateSpeed,
  getSpecialTypeForLayer,
  evaluatePlacement,
  updateFallingSlice,
  calculateScore,
  getStreakMedal
} from './physics';
import { CakeRenderer } from './cakeRenderer';
import { cakeAudio } from './audio';

const TIME_CHALLENGE_DURATION = 60.0; // 60 seconds

export const CakeStack: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'cake-stack') || {
    id: 'cake-stack',
    name: 'Cake Stack: Perfect Layers',
    description: 'Bake the tallest dessert masterpiece! Time your drops with precision, slice off overhangs, and trigger golden combos across 4 delicious modes.',
    icon: '🎂',
    category: 'Arcade' as const,
    playerCount: '1–4 Players',
    difficulty: 'Adaptive' as const,
    tier: 1,
    estimatedTime: '2–3 min',
    howToPlay: [
      'A cake layer moves continuously back and forth above the pastry stack.',
      'Tap anywhere, press Space, or click the DROP button to drop the layer.',
      'Align the layer with the one below it. Any overhanging slice will be cleanly cut off!',
      'Land a PERFECT placement to preserve 100% of the cake width and build a golden combo multiplier!',
      'Avoid running out of width or completely missing the stack.'
    ],
    controls: [
      { key: 'Space / Click / Tap', action: 'Drop Cake Layer' },
      { key: 'P / Esc', action: 'Pause / Resume' },
      { key: 'R', action: 'Restart Game' }
    ],
    tags: ['cake', 'stack', 'tower', 'arcade', 'baking', 'dessert', 'timing', 'combo', 'pass-and-play', 'casual']
  };

  // Game Configuration & Modes
  const [mode, setMode] = useState<CakeGameMode>('classic');
  const [status, setStatus] = useState<CakeGameStatus>('playing');

  // Gameplay State
  const [score, setScore] = useState<number>(0);
  const [stackHeight, setStackHeight] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_CHALLENGE_DURATION);
  const [personalBest, setPersonalBest] = useState<number>(() => getHighScore('cake-stack'));
  const [bestStreak, setBestStreak] = useState<number>(() => getStorageItem<number>('cake_best_streak', 0));
  const [bestHeight, setBestHeight] = useState<number>(() => getStorageItem<number>('cake_best_height', 0));
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Pass & Play State
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<PassAndPlayPlayer[]>([
    { id: 1, name: 'Chef Alice', score: 0, height: 0, maxStreak: 0, completed: false },
    { id: 2, name: 'Chef Bob', score: 0, height: 0, maxStreak: 0, completed: false }
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);

  // Canvas & Direct Rendering Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<CakeRenderer>(new CakeRenderer());

  // Stacking Entities & Motion Refs (mutable for 60-120fps high performance loop)
  const stackRef = useRef<CakeLayer[]>([]);
  const movingLayerRef = useRef<CakeLayer | null>(null);
  const fallingSlicesRef = useRef<FallingSlice[]>([]);
  const movingDirectionRef = useRef<number>(1); // 1 = right, -1 = left
  const cameraYRef = useRef<number>(0);
  const targetCameraYRef = useRef<number>(0);
  const isDroppingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const statusRef = useRef<CakeGameStatus>('playing');
  const modeRef = useRef<CakeGameMode>('classic');
  const streakRef = useRef<number>(0);
  const maxStreakRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);

  // Keep refs synchronized with React state
  statusRef.current = status;
  modeRef.current = mode;
  streakRef.current = streak;
  maxStreakRef.current = maxStreak;
  scoreRef.current = score;

  // Initialize fresh base layer & first moving layer
  const initGameSession = useCallback(() => {
    rendererRef.current.reset();
    fallingSlicesRef.current = [];
    isDroppingRef.current = false;
    cameraYRef.current = 0;
    targetCameraYRef.current = 0;
    movingDirectionRef.current = 1;

    // Base foundational cake layer anchored onto pedestal
    const baseLayer: CakeLayer = {
      id: 0,
      x: (CANVAS_WIDTH - INITIAL_LAYER_WIDTH) / 2, // 120
      y: BASE_PEDESTAL_Y - LAYER_HEIGHT + 4,
      width: INITIAL_LAYER_WIDTH,
      height: LAYER_HEIGHT,
      flavorIndex: 0,
      specialType: 'normal',
      isBase: true
    };

    stackRef.current = [baseLayer];

    // Spawn first moving layer above base layer - starts with a clear offset so movement is visible immediately!
    const nextY = baseLayer.y - LAYER_HEIGHT;
    movingLayerRef.current = {
      id: 1,
      x: 30, // Start offset on left
      y: nextY,
      width: INITIAL_LAYER_WIDTH,
      height: LAYER_HEIGHT,
      flavorIndex: 1,
      specialType: 'normal'
    };

    setScore(0);
    setStackHeight(0);
    setStreak(0);
    setMaxStreak(0);
    setTimeLeft(TIME_CHALLENGE_DURATION);
    setIsNewRecord(false);
    lastTimeRef.current = performance.now();
  }, []);

  // Start active game with fresh state
  const startGame = useCallback((selectedMode?: CakeGameMode) => {
    sounds.playClick();
    if (selectedMode) {
      setMode(selectedMode);
      modeRef.current = selectedMode;
    }
    initGameSession();
    setStatus('playing');
    statusRef.current = 'playing';
  }, [initGameSession]);

  // Handle run conclusion (scores, records, Pass & Play transitions)
  const handleRunEnded = useCallback(() => {
    const finalScore = scoreRef.current;
    const finalHeight = stackRef.current.length - 1;
    const finalStreak = maxStreakRef.current;

    // Check personal best
    if (modeRef.current === 'classic' || modeRef.current === 'time') {
      const isRecord = saveHighScore('cake-stack', finalScore);
      if (isRecord) {
        setIsNewRecord(true);
        setPersonalBest(finalScore);
        cakeAudio.playNewRecord();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // confetti fallback
        }
      }
    }

    // Track best height and streak
    if (finalHeight > bestHeight) {
      setBestHeight(finalHeight);
      setStorageItem('cake_best_height', finalHeight);
    }
    if (finalStreak > bestStreak) {
      setBestStreak(finalStreak);
      setStorageItem('cake_best_streak', finalStreak);
    }

    // Pass & Play handler
    if (modeRef.current === 'pass-and-play') {
      setPlayers((prev) => {
        const updated = [...prev];
        updated[currentPlayerIndex] = {
          ...updated[currentPlayerIndex],
          score: finalScore,
          height: finalHeight,
          maxStreak: finalStreak,
          completed: true
        };
        return updated;
      });
    }
  }, [bestHeight, bestStreak, currentPlayerIndex]);

  // Handle layer drop
  const handleDrop = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    if (isDroppingRef.current) return; // Prevent double drops on same frame
    const moving = movingLayerRef.current;
    if (!moving) return;

    isDroppingRef.current = true;
    const topStackLayer = stackRef.current[stackRef.current.length - 1];

    // Evaluate placement math
    const result = evaluatePlacement(moving, topStackLayer);

    if (result.type === 'miss') {
      // Missed completely or cut became too thin!
      if (result.fallingSlice) {
        fallingSlicesRef.current.push(result.fallingSlice);
      }
      movingLayerRef.current = null;
      cakeAudio.playThud();
      cakeAudio.playGameOver();

      setStatus('game-over');
      statusRef.current = 'game-over';
      handleRunEnded();
      return;
    }

    // Successful placement (Perfect or Normal overlap)
    const newLayer = result.retainedLayer;
    stackRef.current.push(newLayer);
    const newHeight = stackRef.current.length - 1;
    setStackHeight(newHeight);

    // Camera target adjusts smoothly so top of cake remains centered in upper-middle view
    if (newHeight > 5) {
      targetCameraYRef.current = (newHeight - 5) * LAYER_HEIGHT;
    }

    if (result.type === 'perfect') {
      // Perfect placement!
      const nextStreak = streakRef.current + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreakRef.current) {
        setMaxStreak(nextStreak);
      }

      const scoreInfo = calculateScore('perfect', nextStreak, newLayer.specialType);
      setScore((prev) => prev + scoreInfo.points);

      cakeAudio.playPerfect(nextStreak);
      rendererRef.current.triggerPerfectBurst(newLayer.x, newLayer.y, newLayer.width);
      rendererRef.current.addBanner(
        newLayer.x + newLayer.width / 2,
        newLayer.y - 12,
        scoreInfo.comboText,
        '#facc15',
        true
      );

      if (scoreInfo.isMilestone) {
        cakeAudio.playMilestone();
      }
    } else {
      // Normal overlap
      setStreak(0);
      const scoreInfo = calculateScore('overlap', 0, newLayer.specialType);
      setScore((prev) => prev + scoreInfo.points);

      cakeAudio.playSlice();
      if (result.fallingSlice) {
        fallingSlicesRef.current.push(result.fallingSlice);
        rendererRef.current.triggerSliceFlash(
          result.dx > 0 ? topStackLayer.x + topStackLayer.width : moving.x,
          newLayer.y,
          LAYER_HEIGHT
        );
      }

      rendererRef.current.triggerCrumbs(
        result.dx > 0 ? newLayer.x + newLayer.width : newLayer.x,
        newLayer.y,
        '#f59e0b'
      );

      rendererRef.current.addBanner(
        newLayer.x + newLayer.width / 2,
        newLayer.y - 10,
        `+${scoreInfo.points}`,
        '#ffffff'
      );

      // In Perfect Streak mode, an imperfect cut ends the round!
      if (modeRef.current === 'streak') {
        movingLayerRef.current = null;
        cakeAudio.playGameOver();
        setStatus('game-over');
        statusRef.current = 'game-over';
        handleRunEnded();
        return;
      }
    }

    // Handle special layer consequences
    if (result.specialEffect === 'strawberry_rescue') {
      cakeAudio.playWidthRestored();
      rendererRef.current.triggerStrawberryBonus(newLayer.x, newLayer.y, newLayer.width);
      rendererRef.current.addBanner(
        newLayer.x + newLayer.width / 2,
        newLayer.y - 30,
        '🍓 CAKE EXPANDED!',
        '#f43f5e',
        true
      );
    } else if (result.specialEffect === 'golden_3x') {
      rendererRef.current.triggerPerfectBurst(newLayer.x, newLayer.y, newLayer.width);
    }

    // Spawn next moving layer
    const nextLayerIndex = stackRef.current.length;
    const nextSpecialType = getSpecialTypeForLayer(nextLayerIndex, newLayer.width);
    const spawnDirection = Math.random() > 0.5 ? 1 : -1;
    movingDirectionRef.current = spawnDirection;

    // Start near edge so it glides toward center
    const spawnX = spawnDirection === 1 ? -newLayer.width * 0.3 : CANVAS_WIDTH - newLayer.width * 0.7;
    const nextY = newLayer.y - LAYER_HEIGHT;

    if (nextSpecialType !== 'normal') {
      cakeAudio.playSpecialSpawn();
    }

    movingLayerRef.current = {
      id: nextLayerIndex,
      x: spawnX,
      y: nextY,
      width: newLayer.width,
      height: LAYER_HEIGHT,
      flavorIndex: nextLayerIndex,
      specialType: nextSpecialType
    };

    // Release drop lock for next interaction
    setTimeout(() => {
      isDroppingRef.current = false;
    }, 90);
  }, [handleRunEnded]);

  const handleSelectPassAndPlay = (count: number) => {
    sounds.playClick();
    setPlayerCount(count);
    setPlayers(
      Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Chef ${i + 1}`,
        score: 0,
        height: 0,
        maxStreak: 0,
        completed: false
      }))
    );
    setCurrentPlayerIndex(0);
    startGame('pass-and-play');
  };

  // Advance Pass & Play turn
  const handleNextPlayerTurn = useCallback(() => {
    sounds.playClick();
    const nextIdx = currentPlayerIndex + 1;
    if (nextIdx < playerCount) {
      setCurrentPlayerIndex(nextIdx);
      initGameSession();
      setStatus('playing');
      statusRef.current = 'playing';
    } else {
      // All players finished!
      setStatus('game-over');
      statusRef.current = 'game-over';
    }
  }, [currentPlayerIndex, playerCount, initGameSession]);

  // ---------------------------------------------------------------------------
  // Canvas Setup & Unified High-Performance Animation Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Initialize game session on initial mount
    initGameSession();

    // 2. Setup canvas resolution for High-DPI screens
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);

    let active = true;
    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      if (!active) return;

      const delta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Clamp delta time to avoid large physics leaps when switching tabs
      const clampedDelta = Math.min(delta, 0.05);
      const dtScale = clampedDelta * 60; // 1.0 at 60fps

      const currentStatus = statusRef.current;

      if (currentStatus === 'playing') {
        // A. Time Challenge mode countdown
        if (modeRef.current === 'time') {
          setTimeLeft((prev) => {
            const next = prev - clampedDelta;
            if (next <= 0) {
              setStatus('game-over');
              statusRef.current = 'game-over';
              handleRunEnded();
              return 0;
            }
            return next;
          });
        }

        // B. Move active cake layer with framerate-independent speed
        const moving = movingLayerRef.current;
        if (moving) {
          const speed = calculateSpeed(stackRef.current.length, modeRef.current);
          moving.x += movingDirectionRef.current * speed * dtScale;

          // Bounce off boundaries with comfortable margin
          const minX = -moving.width * 0.4;
          const maxX = CANVAS_WIDTH - moving.width * 0.6;

          if (moving.x <= minX) {
            moving.x = minX;
            movingDirectionRef.current = 1;
          } else if (moving.x >= maxX) {
            moving.x = maxX;
            movingDirectionRef.current = -1;
          }
        }

        // C. Update falling slices
        for (let i = fallingSlicesRef.current.length - 1; i >= 0; i--) {
          const slice = fallingSlicesRef.current[i];
          const alive = updateFallingSlice(slice, CANVAS_HEIGHT, dtScale);
          if (!alive) {
            fallingSlicesRef.current.splice(i, 1);
          }
        }

        // D. Smooth Camera Lerp
        cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * Math.min(1, 10.0 * clampedDelta);

        // E. Update renderer particles & animations
        rendererRef.current.update(dtScale);
      }

      // 3. Render directly onto canvas context every single frame
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rendererRef.current.render(
        ctx,
        stackRef.current,
        movingLayerRef.current,
        fallingSlicesRef.current,
        cameraYRef.current
      );

      // Schedule next frame recursively
      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      active = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [initGameSession, handleRunEnded]);

  // Handle Window Resize for High-DPI canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(CANVAS_WIDTH * dpr);
      canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key repeat for single-action drop
      if (e.repeat) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (statusRef.current === 'playing') {
          handleDrop();
        } else if (statusRef.current === 'game-over') {
          startGame();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        if (statusRef.current === 'playing') {
          setStatus('paused');
          statusRef.current = 'paused';
        } else if (statusRef.current === 'paused') {
          setStatus('playing');
          statusRef.current = 'playing';
          lastTimeRef.current = performance.now();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDrop, startGame]);

  // Streak Medal calculation
  const currentMedal = getStreakMedal(maxStreak);

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      streak={streak}
      onRestart={() => startGame()}
    >
      <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col items-center select-none">
        {/* COMPACT MODE SELECTOR BAR */}
        <div className="w-full max-w-[480px] flex items-center justify-between gap-1.5 mb-2 px-1">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => startGame('classic')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'classic'
                  ? 'bg-orange-500 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Classic
            </button>
            <button
              type="button"
              onClick={() => startGame('time')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'time'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Clock className="w-3 h-3" /> Time Blitz
            </button>
            <button
              type="button"
              onClick={() => startGame('streak')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'streak'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Flame className="w-3 h-3" /> Streak
            </button>
            <button
              type="button"
              onClick={() => handleSelectPassAndPlay(playerCount)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'pass-and-play'
                  ? 'bg-pink-500 text-slate-950 shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              <Users className="w-3 h-3" /> Pass & Play
            </button>
          </div>

          {/* Quick Best Score Pill */}
          <div className="text-[11px] font-mono font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>{personalBest}</span>
          </div>
        </div>

        {/* Pass & Play Player Count Selector */}
        {mode === 'pass-and-play' && (
          <div className="w-full max-w-[480px] mb-2 p-2 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-between text-xs font-mono">
            <span className="text-pink-300 font-bold">Pass & Play ({playerCount} Players):</span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSelectPassAndPlay(count)}
                  className={`w-7 h-6 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    playerCount === count
                      ? 'bg-pink-500 text-slate-950 font-black'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {count}P
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HUD TELEMETRY BAR */}
        <div className="w-full max-w-[480px] bg-white/[0.03] border border-white/10 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 mb-2 shadow-sm">
          {/* Height & Score */}
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block leading-none">
                SCORE
              </span>
              <span className="text-lg font-black text-white font-mono leading-tight">
                {score}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block leading-none">
                HEIGHT
              </span>
              <span className="text-sm font-bold text-slate-200 font-mono leading-tight">
                {stackHeight} Layers <span className="text-slate-400 text-xs">({Math.round(stackHeight * 3.2)} cm)</span>
              </span>
            </div>
          </div>

          {/* Mode Telemetry (Timer, Combo, or Active Player) */}
          <div className="flex items-center gap-2">
            {mode === 'pass-and-play' && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-mono text-xs font-bold">
                {players[currentPlayerIndex]?.name || 'Player 1'}
              </span>
            )}

            {mode === 'time' && (
              <div className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 font-mono text-xs font-bold ${
                timeLeft <= 10
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-white/5 border-white/10 text-slate-200'
              }`}>
                <Timer className="w-3 h-3 text-orange-400" />
                <span>{timeLeft.toFixed(1)}s</span>
              </div>
            )}

            {streak >= 2 && (
              <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>x{streak}</span>
              </div>
            )}
          </div>
        </div>

        {/* PRIMARY GAMEPLAY STAGE (LARGE CANVAS CONTAINER) */}
        <div
          ref={containerRef}
          onPointerDown={(e) => {
            if (status !== 'playing') return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            e.preventDefault();
            handleDrop();
          }}
          className="relative w-full max-w-[480px] aspect-[480/700] max-h-[calc(100vh-220px)] mx-auto select-none touch-none rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d0910] cursor-pointer"
          style={{ touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ width: '100%', height: '100%' }}
          />

          {/* 1. PAUSED OVERLAY */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2 font-display">
                <Pause className="w-6 h-6 text-orange-500" /> Baking Paused
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.playClick();
                    setStatus('playing');
                    statusRef.current = 'playing';
                    lastTimeRef.current = performance.now();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.playClick();
                    startGame();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* 2. PASS & PLAY INTERMISSION OVERLAY */}
          {status === 'game-over' && mode === 'pass-and-play' && currentPlayerIndex < playerCount - 1 && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-5 text-center z-20">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-3xl mb-3">
                🧁
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase mb-1 font-display">
                Turn Finished!
              </h3>
              <p className="text-xs text-slate-300 mb-4">
                <strong className="text-white">{players[currentPlayerIndex]?.name}</strong> baked a cake of{' '}
                <strong className="text-amber-400">{score} pts</strong> ({stackHeight} layers)!
              </p>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 w-full max-w-xs mb-5 flex flex-col items-center">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Next Up
                </span>
                <span className="text-lg font-black text-white font-display">
                  {players[currentPlayerIndex + 1]?.name}
                </span>
                <span className="text-xs text-slate-400 mt-1">Pass the device to start!</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPlayerTurn();
                }}
                className="w-full max-w-xs py-3 px-6 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Next Turn</span>
              </button>
            </div>
          )}

          {/* 3. GAME OVER SCOREBOARD MODAL */}
          {status === 'game-over' && (mode !== 'pass-and-play' || currentPlayerIndex >= playerCount - 1) && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-4 text-center z-20">
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-[320px] w-full rounded-3xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl flex flex-col items-center gap-3"
              >
                <h3 className="text-2xl font-black text-white uppercase tracking-tight font-display">
                  {mode === 'pass-and-play' ? 'CHAMPIONSHIP PODIUM' : 'GAME OVER'}
                </h3>

                {isNewRecord && (
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-bounce flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> NEW PERSONAL BEST!
                  </div>
                )}

                {/* Pass & Play Leaderboard or Solo Scoreboard */}
                {mode === 'pass-and-play' ? (
                  <div className="w-full rounded-2xl bg-black/40 border border-white/10 p-3 space-y-2">
                    {[...players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, idx) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono ${
                            idx === 0
                              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold'
                              : 'bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'}</span>
                            <span className="truncate max-w-[110px]">{p.name}</span>
                          </div>
                          <span>{p.score} pts ({p.height} L)</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="w-full rounded-2xl bg-black/40 border border-white/10 p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Final Score</span>
                      <span className="text-3xl font-black text-white font-mono">{score}</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Height</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {stackHeight} Layers ({Math.round(stackHeight * 3.2)} cm)
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Max Combo</span>
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        {maxStreak >= 2 ? `x${maxStreak} Streak` : 'None'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Personal Best</span>
                      <span className="text-base font-black text-amber-400 font-mono flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> {personalBest}
                      </span>
                    </div>

                    {currentMedal && (
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase">Streak Medal</span>
                        <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold flex items-center gap-1 ${currentMedal.color} ${currentMedal.bgColor}`}>
                          <span>{currentMedal.icon}</span> {currentMedal.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="w-full flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startGame()}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ERGONOMIC TOUCH CONTROLS (MOBILE-FIRST) */}
        <div className="w-full max-w-[480px] mt-2 sm:mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleDrop();
            }}
            disabled={status !== 'playing'}
            className={`flex-1 py-3.5 sm:py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              status === 'playing'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-orange-500/25 active:scale-[0.98]'
                : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            <span>DROP LAYER</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/25 text-[10px] text-slate-900 border border-black/15 font-mono">
              SPACE
            </kbd>
          </button>

          {status === 'playing' && (
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                setStatus('paused');
                statusRef.current = 'paused';
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="Pause game"
            >
              <Pause className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </GameLayout>
  );
};
