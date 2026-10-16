import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { blockAudio } from './audio';
import {
  BOARD_HEIGHT,
  PALETTES,
  SHAPES,
  createEmptyGrid,
  generate7Bag,
  spawnPiece,
  checkCollision,
  tryRotatePiece,
  getGhostY,
  lockPiece,
  findCompleteLines,
  clearLines,
  calculateLineClearScore,
  calculateLevel,
  getDropInterval
} from './gameLogic';
import { BlockCanvas } from './BlockCanvas';
import type { Piece, BoardGrid, TetrominoType, Particle, FloatingNotice } from './types';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  RotateCw,
  RotateCcw,
  Zap,
  Package,
  Pause,
  Play
} from 'lucide-react';

const GAME_ID = 'block-stack';

export const BlockStack: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === GAME_ID)!;

  // ---------------------------------------------------------------------------
  // Core Game State
  // ---------------------------------------------------------------------------
  const [grid, setGrid] = useState<BoardGrid>(() => createEmptyGrid());
  const [bag, setBag] = useState<TetrominoType[]>(() => generate7Bag());
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>(() => {
    const initialBag = generate7Bag();
    return initialBag.slice(0, 3);
  });
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [heldPiece, setHeldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);

  // Scoring & Stats
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore(GAME_ID));
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [combo, setCombo] = useState<number>(-1);
  const [backToBack, setBackToBack] = useState<boolean>(false);

  // Flow State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Visual FX State
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearProgress, setClearProgress] = useState<number>(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingNotices, setFloatingNotices] = useState<FloatingNotice[]>([]);
  const [shakeOffset, setShakeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for continuous input (DAS / ARR) & timers
  const gravityTimerRef = useRef<number | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const dasTimeoutRef = useRef<number | null>(null);
  const arrIntervalRef = useRef<number | null>(null);
  const activeInputRef = useRef<string | null>(null);
  const stateRef = useRef({
    grid,
    currentPiece,
    bag,
    nextQueue,
    isPaused,
    isGameOver,
    clearingRows,
    level,
    score,
    lines,
    combo,
    backToBack,
    heldPiece,
    canHold
  });

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = {
      grid,
      currentPiece,
      bag,
      nextQueue,
      isPaused,
      isGameOver,
      clearingRows,
      level,
      score,
      lines,
      combo,
      backToBack,
      heldPiece,
      canHold
    };
  }, [
    grid,
    currentPiece,
    bag,
    nextQueue,
    isPaused,
    isGameOver,
    clearingRows,
    level,
    score,
    lines,
    combo,
    backToBack,
    heldPiece,
    canHold
  ]);

  // ---------------------------------------------------------------------------
  // Helper: Get next piece from queue and replenish queue from bag
  // ---------------------------------------------------------------------------
  const getNextPieceFromQueue = useCallback((): {
    nextType: TetrominoType;
    updatedQueue: TetrominoType[];
    updatedBag: TetrominoType[];
  } => {
    const { nextQueue: currentQ, bag: currentBag } = stateRef.current;
    let newBag = [...currentBag];
    let newQueue = [...currentQ];

    const nextType = newQueue.shift() || 'T';

    // Replenish queue if it has fewer than 3 items
    while (newQueue.length < 3) {
      if (newBag.length === 0) {
        newBag = generate7Bag();
      }
      newQueue.push(newBag.shift()!);
    }

    return { nextType, updatedQueue: newQueue, updatedBag: newBag };
  }, []);

  // ---------------------------------------------------------------------------
  // Trigger Shake & Sparks
  // ---------------------------------------------------------------------------
  const triggerShake = (intensity = 4) => {
    const start = performance.now();
    const duration = 120;

    const frame = (now: number) => {
      const elapsed = now - start;
      if (elapsed < duration) {
        const decay = 1 - elapsed / duration;
        const ox = (Math.random() - 0.5) * intensity * decay;
        const oy = (Math.random() - 0.5) * intensity * decay;
        setShakeOffset({ x: ox, y: oy });
        requestAnimationFrame(frame);
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }
    };
    requestAnimationFrame(frame);
  };

  const spawnLineClearParticles = (rowIndices: number[]) => {
    const newParticles: Particle[] = [];
    rowIndices.forEach((row) => {
      for (let i = 0; i < 16; i++) {
        const x = Math.random() * 320;
        const y = (row + 0.5) * (600 / BOARD_HEIGHT);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        newParticles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 3 + Math.random() * 4,
          color: Math.random() > 0.4 ? '#f97316' : '#fef08a',
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15
        });
      }
    });
    setParticles((prev) => [...prev, ...newParticles]);
  };

  // Particles animation tick
  useEffect(() => {
    if (particles.length === 0 && floatingNotices.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.18, // Gravity
            alpha: 1 - p.life / p.maxLife,
            life: p.life + 1
          }))
          .filter((p) => p.life < p.maxLife)
      );

      setFloatingNotices((prev) =>
        prev
          .map((n) => ({
            ...n,
            y: n.y + n.vy,
            alpha: 1 - n.life / n.maxLife,
            life: n.life + 1
          }))
          .filter((n) => n.life < n.maxLife)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles.length, floatingNotices.length]);

  // ---------------------------------------------------------------------------
  // Lock Current Piece & Clear Lines
  // ---------------------------------------------------------------------------
  const lockCurrentPiece = useCallback(
    (pieceToLock: Piece) => {
      const { grid: currentGrid, level: currentLevel, combo: currentCombo, backToBack: currentB2B } =
        stateRef.current;

      blockAudio.playLock();
      const newGrid = lockPiece(currentGrid, pieceToLock);
      const linesToClear = findCompleteLines(newGrid);

      if (linesToClear.length > 0) {
        // Line Cleared!
        const nextCombo = currentCombo + 1;
        const scoreResult = calculateLineClearScore(
          linesToClear.length,
          currentLevel,
          nextCombo,
          currentB2B
        );

        blockAudio.playLineClear(linesToClear.length);
        spawnLineClearParticles(linesToClear);
        triggerShake(linesToClear.length >= 4 ? 6 : 3);

        // Add Floating Notice
        setFloatingNotices((prev) => [
          ...prev,
          {
            id: `notice-${Date.now()}`,
            text: `+${scoreResult.score} ${scoreResult.label}`,
            x: 160,
            y: (linesToClear[0] + 0.5) * (600 / BOARD_HEIGHT),
            color: scoreResult.isTetris ? '#fbbf24' : '#ffffff',
            alpha: 1,
            vy: -1.2,
            life: 0,
            maxLife: 40
          }
        ]);

        // Start clearing animation
        setClearingRows(linesToClear);
        setClearProgress(0);

        const animStart = performance.now();
        const animDuration = 140;

        const animLoop = (now: number) => {
          const progress = Math.min(1, (now - animStart) / animDuration);
          setClearProgress(progress);

          if (progress < 1) {
            requestAnimationFrame(animLoop);
          } else {
            // Finalize grid collapse after flash
            const collapsedGrid = clearLines(newGrid, linesToClear);
            setGrid(collapsedGrid);
            setClearingRows([]);

            // Update stats
            setLines((prev) => {
              const newTotal = prev + linesToClear.length;
              const newLvl = calculateLevel(newTotal);
              if (newLvl > currentLevel) {
                setLevel(newLvl);
                blockAudio.playLevelUp();
              }
              return newTotal;
            });

            setScore((prev) => {
              const newScore = prev + scoreResult.score;
              setHighScore((currHi) => {
                if (newScore > currHi) {
                  saveHighScore(GAME_ID, newScore);
                  setIsNewHighScore(true);
                  return newScore;
                }
                return currHi;
              });
              return newScore;
            });

            setCombo(nextCombo);
            setBackToBack(scoreResult.isTetris);

            // Spawn next piece
            spawnNextPiece(collapsedGrid);
          }
        };

        requestAnimationFrame(animLoop);
      } else {
        // No lines cleared
        setCombo(-1);
        setGrid(newGrid);
        spawnNextPiece(newGrid);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getNextPieceFromQueue]
  );

  // ---------------------------------------------------------------------------
  // Spawn Next Piece
  // ---------------------------------------------------------------------------
  const spawnNextPiece = useCallback(
    (boardGrid: BoardGrid) => {
      const { nextType, updatedQueue, updatedBag } = getNextPieceFromQueue();
      setNextQueue(updatedQueue);
      setBag(updatedBag);

      const newPiece = spawnPiece(nextType);

      // Check immediate spawn collision (Top out / Game Over)
      if (checkCollision(boardGrid, newPiece)) {
        setIsGameOver(true);
        setCurrentPiece(null);
        blockAudio.playGameOver();
        return;
      }

      setCurrentPiece(newPiece);
      setCanHold(true);
    },
    [getNextPieceFromQueue]
  );

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const moveLeft = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    if (!checkCollision(g, p, -1, 0)) {
      blockAudio.playMove();
      setCurrentPiece({ ...p, x: p.x - 1 });
    }
  }, []);

  const moveRight = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    if (!checkCollision(g, p, 1, 0)) {
      blockAudio.playMove();
      setCurrentPiece({ ...p, x: p.x + 1 });
    }
  }, []);

  const rotateCW = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    const rotated = tryRotatePiece(g, p, 'cw');
    if (rotated) {
      blockAudio.playRotate();
      setCurrentPiece(rotated);
    }
  }, []);

  const rotateCCW = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    const rotated = tryRotatePiece(g, p, 'ccw');
    if (rotated) {
      blockAudio.playRotate();
      setCurrentPiece(rotated);
    }
  }, []);

  const softDrop = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    if (!checkCollision(g, p, 0, 1)) {
      blockAudio.playSoftDrop();
      setCurrentPiece({ ...p, y: p.y + 1 });
      setScore((s) => s + 1);
    } else {
      // Reached floor, lock
      lockCurrentPiece(p);
    }
  }, [lockCurrentPiece]);

  const hardDrop = useCallback(() => {
    const { grid: g, currentPiece: p, isPaused: paused, isGameOver: over, clearingRows: cRows } =
      stateRef.current;
    if (!p || paused || over || cRows.length > 0) return;

    const targetY = getGhostY(g, p);
    const dropDistance = targetY - p.y;
    const droppedPiece = { ...p, y: targetY };

    blockAudio.playHardDrop();
    triggerShake(dropDistance > 10 ? 4 : 2);
    setScore((s) => s + dropDistance * 2);

    lockCurrentPiece(droppedPiece);
  }, [lockCurrentPiece]);

  const holdPiece = useCallback(() => {
    const {
      grid: g,
      currentPiece: p,
      heldPiece: held,
      canHold: holdAllowed,
      isPaused: paused,
      isGameOver: over,
      clearingRows: cRows
    } = stateRef.current;

    if (!p || !holdAllowed || paused || over || cRows.length > 0) return;

    blockAudio.playHold();
    setCanHold(false);

    if (held === null) {
      setHeldPiece(p.type);
      spawnNextPiece(g);
    } else {
      const nextType = held;
      setHeldPiece(p.type);
      const swappedPiece = spawnPiece(nextType);
      if (checkCollision(g, swappedPiece)) {
        setIsGameOver(true);
        setCurrentPiece(null);
        blockAudio.playGameOver();
      } else {
        setCurrentPiece(swappedPiece);
      }
    }
  }, [spawnNextPiece]);

  // ---------------------------------------------------------------------------
  // Continuous Input Handler (DAS / ARR)
  // ---------------------------------------------------------------------------
  const startContinuousAction = useCallback(
    (actionName: 'left' | 'right' | 'down') => {
      if (activeInputRef.current === actionName) return;
      activeInputRef.current = actionName;

      // Clear existing repeat timers
      if (dasTimeoutRef.current) clearTimeout(dasTimeoutRef.current);
      if (arrIntervalRef.current) clearInterval(arrIntervalRef.current);

      const execute = () => {
        if (actionName === 'left') moveLeft();
        else if (actionName === 'right') moveRight();
        else if (actionName === 'down') softDrop();
      };

      // Immediate first step
      execute();

      // Delayed Auto Shift (DAS)
      dasTimeoutRef.current = window.setTimeout(() => {
        // Auto Repeat Rate (ARR)
        const speed = actionName === 'down' ? 45 : 38;
        arrIntervalRef.current = window.setInterval(execute, speed);
      }, 145);
    },
    [moveLeft, moveRight, softDrop]
  );

  const stopContinuousAction = useCallback((actionName?: 'left' | 'right' | 'down') => {
    if (!actionName || activeInputRef.current === actionName) {
      activeInputRef.current = null;
      if (dasTimeoutRef.current) {
        clearTimeout(dasTimeoutRef.current);
        dasTimeoutRef.current = null;
      }
      if (arrIntervalRef.current) {
        clearInterval(arrIntervalRef.current);
        arrIntervalRef.current = null;
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Keyboard Event Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scroll when game keys are pressed
      const gameKeys = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Space',
        'KeyZ',
        'KeyX',
        'KeyC',
        'ShiftLeft',
        'ShiftRight'
      ];
      if (gameKeys.includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }

      if (e.repeat && ['KeyZ', 'KeyX', 'Space', 'KeyC'].includes(e.code)) {
        return; // Prevent multi-fires for single-action triggers
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          startContinuousAction('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          startContinuousAction('right');
          break;
        case 'ArrowDown':
        case 'KeyS':
          startContinuousAction('down');
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          rotateCW();
          break;
        case 'KeyZ':
          rotateCCW();
          break;
        case 'Space':
          hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          holdPiece();
          break;
        case 'KeyP':
        case 'Escape':
          setIsPaused((p) => !p);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          stopContinuousAction('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          stopContinuousAction('right');
          break;
        case 'ArrowDown':
        case 'KeyS':
          stopContinuousAction('down');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopContinuousAction();
    };
  }, [
    startContinuousAction,
    stopContinuousAction,
    rotateCW,
    rotateCCW,
    hardDrop,
    holdPiece
  ]);

  // ---------------------------------------------------------------------------
  // Gravity Drop Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isPaused || isGameOver || clearingRows.length > 0) {
      if (gravityTimerRef.current) clearInterval(gravityTimerRef.current);
      return;
    }

    const interval = getDropInterval(level);

    gravityTimerRef.current = window.setInterval(() => {
      const { grid: g, currentPiece: p } = stateRef.current;
      if (!p) return;

      if (!checkCollision(g, p, 0, 1)) {
        setCurrentPiece({ ...p, y: p.y + 1 });
      } else {
        // Piece hit bottom or block, start/handle lock
        lockCurrentPiece(p);
      }
    }, interval);

    return () => {
      if (gravityTimerRef.current) clearInterval(gravityTimerRef.current);
    };
  }, [level, isPaused, isGameOver, clearingRows.length, lockCurrentPiece]);

  // ---------------------------------------------------------------------------
  // Initialize First Piece on Game Start
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentPiece && !isGameOver) {
      spawnNextPiece(grid);
    }
  }, [currentPiece, isGameOver, grid, spawnNextPiece]);

  // ---------------------------------------------------------------------------
  // Restart Game
  // ---------------------------------------------------------------------------
  const handleRestart = () => {
    if (gravityTimerRef.current) clearInterval(gravityTimerRef.current);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    stopContinuousAction();

    const emptyGrid = createEmptyGrid();
    const newBag = generate7Bag();
    const queue = newBag.slice(0, 3);
    const remainingBag = newBag.slice(3);

    setGrid(emptyGrid);
    setBag(remainingBag);
    setNextQueue(queue);
    setHeldPiece(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setCombo(-1);
    setBackToBack(false);
    setIsPaused(false);
    setIsGameOver(false);
    setIsNewHighScore(false);
    setClearingRows([]);
    setParticles([]);
    setFloatingNotices([]);

    const firstPieceType = queue.shift() || 'T';
    queue.push(remainingBag.shift() || 'I');
    setNextQueue(queue);
    setCurrentPiece(spawnPiece(firstPieceType));
  };

  // ---------------------------------------------------------------------------
  // Render Mini Tetromino Previews (Hold & Next)
  // ---------------------------------------------------------------------------
  const renderMiniPiece = (type: TetrominoType | null, isHeldSlot = false) => {
    if (!type) {
      return (
        <div className="w-16 h-14 sm:w-20 sm:h-16 flex items-center justify-center text-slate-600 font-mono text-xs">
          {isHeldSlot ? 'EMPTY' : '—'}
        </div>
      );
    }

    const shape = SHAPES[type];
    const palette = PALETTES[type];
    const rows = shape.length;
    const cols = shape[0].length;

    return (
      <div
        className="grid gap-0.5 p-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
        }}
      >
        {shape.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-4.5 sm:h-4.5 rounded-xs ${
                cell
                  ? `${palette.bgTailwind} shadow-xs border border-white/30`
                  : 'bg-transparent'
              }`}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={handleRestart}
      headerControls={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
            title={isPaused ? 'Resume Game' : 'Pause Game'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-orange-400" />}
            <span className="hidden xs:inline">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 sm:gap-5 select-none py-1 sm:py-3">
        {/* ================================================================= */}
        {/* DESKTOP & MOBILE RESPONSIVE GAME ARENA */}
        {/* ================================================================= */}
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-center gap-3 sm:gap-6">
          {/* LEFT PANEL: Hold Slot & Core Stats */}
          <div className="flex md:flex-col items-center justify-between w-full md:w-44 gap-2 sm:gap-3 order-1 md:order-1">
            {/* Hold Piece Container */}
            <div className="flex-1 md:flex-initial w-full p-2.5 sm:p-3 rounded-2xl bg-[#0c0e18] border border-white/10 shadow-lg flex flex-col items-center">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Package className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  HOLD (C)
                </span>
              </div>
              <div
                className={`w-18 h-16 sm:w-22 sm:h-18 rounded-xl bg-black/40 border flex items-center justify-center transition-all ${
                  canHold ? 'border-white/10' : 'border-rose-500/30 opacity-60'
                }`}
              >
                {renderMiniPiece(heldPiece, true)}
              </div>
            </div>

            {/* Level & Lines Stats Chips */}
            <div className="flex-1 md:flex-initial w-full grid grid-cols-2 md:grid-cols-1 gap-2">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0c0e18] border border-white/10 shadow-md flex md:flex-row items-center justify-between">
                <span className="text-[9px] sm:text-[10.5px] font-mono text-slate-400 uppercase">
                  Level
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-amber-400">
                  {level}
                </span>
              </div>

              <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0c0e18] border border-white/10 shadow-md flex md:flex-row items-center justify-between">
                <span className="text-[9px] sm:text-[10.5px] font-mono text-slate-400 uppercase">
                  Lines
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-400">
                  {lines}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER PANEL: Main HTML Canvas Board */}
          <div className="flex flex-col items-center order-2 md:order-2">
            <BlockCanvas
              grid={grid}
              currentPiece={currentPiece}
              clearingRows={clearingRows}
              clearProgress={clearProgress}
              particles={particles}
              floatingNotices={floatingNotices}
              shakeOffset={shakeOffset}
              isPaused={isPaused}
              isGameOver={isGameOver}
            />
          </div>

          {/* RIGHT PANEL: Score & Upcoming Queue */}
          <div className="flex md:flex-col items-center justify-between w-full md:w-44 gap-2 sm:gap-3 order-3 md:order-3">
            {/* Score & High Score */}
            <div className="flex-1 md:flex-initial w-full p-2.5 sm:p-3 rounded-2xl bg-[#0c0e18] border border-white/10 shadow-lg flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10.5px] font-mono text-slate-400 uppercase">
                  Score
                </span>
                <strong className="text-sm sm:text-base font-black font-mono text-white">
                  {score}
                </strong>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 uppercase">
                  Best
                </span>
                <strong className="text-xs sm:text-sm font-black font-mono text-amber-400">
                  {highScore}
                </strong>
              </div>
            </div>

            {/* Next Pieces Queue */}
            <div className="flex-1 md:flex-initial w-full p-2.5 sm:p-3 rounded-2xl bg-[#0c0e18] border border-white/10 shadow-lg flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                NEXT
              </span>
              <div className="flex md:flex-col gap-2 items-center justify-center">
                {nextQueue.map((item, idx) => (
                  <div
                    key={`${item}-${idx}`}
                    className="w-14 h-12 sm:w-16 sm:h-14 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center"
                  >
                    {renderMiniPiece(item)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MOBILE ERGONOMIC TOUCH CONTROLS */}
        {/* ================================================================= */}
        <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-2 pt-2 md:hidden">
          {/* Top Action Row: Rotate CCW, Hold, Rotate CW */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                rotateCCW();
              }}
              className="py-3 rounded-2xl bg-slate-800/90 active:bg-slate-700 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none"
              title="Rotate Counter-Clockwise"
            >
              <RotateCcw className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] uppercase tracking-wider">Rotate L</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                holdPiece();
              }}
              className="py-3 rounded-2xl bg-slate-800/90 active:bg-slate-700 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none"
              title="Hold Piece"
            >
              <Package className="w-5 h-5 text-orange-400" />
              <span className="text-[9px] uppercase tracking-wider">Hold</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                rotateCW();
              }}
              className="py-3 rounded-2xl bg-slate-800/90 active:bg-slate-700 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all touch-none"
              title="Rotate Clockwise"
            >
              <RotateCw className="w-5 h-5 text-purple-400" />
              <span className="text-[9px] uppercase tracking-wider">Rotate R</span>
            </button>
          </div>

          {/* Bottom Directional & Drop Row: Left, Soft Drop, Right, Hard Drop */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                startContinuousAction('left');
              }}
              onPointerUp={() => stopContinuousAction('left')}
              onPointerLeave={() => stopContinuousAction('left')}
              className="py-3.5 rounded-2xl bg-slate-800/90 active:bg-orange-500 active:text-slate-950 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex items-center justify-center active:scale-95 transition-all touch-none"
              title="Move Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                startContinuousAction('down');
              }}
              onPointerUp={() => stopContinuousAction('down')}
              onPointerLeave={() => stopContinuousAction('down')}
              className="py-3.5 rounded-2xl bg-slate-800/90 active:bg-amber-500 active:text-slate-950 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex flex-col items-center justify-center active:scale-95 transition-all touch-none"
              title="Soft Drop"
            >
              <ArrowDown className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                startContinuousAction('right');
              }}
              onPointerUp={() => stopContinuousAction('right')}
              onPointerLeave={() => stopContinuousAction('right')}
              className="py-3.5 rounded-2xl bg-slate-800/90 active:bg-orange-500 active:text-slate-950 text-slate-200 border border-white/10 shadow-md font-mono font-bold text-xs flex items-center justify-center active:scale-95 transition-all touch-none"
              title="Move Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                hardDrop();
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 active:from-orange-400 active:to-amber-400 text-slate-950 font-black border border-amber-400/40 shadow-lg font-mono text-xs flex flex-col items-center justify-center active:scale-95 transition-all touch-none"
              title="Hard Drop"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span className="text-[8px] uppercase tracking-wider font-bold">SLAM</span>
            </button>
          </div>
        </div>

        {/* Desktop Controls Hint Bar */}
        <div className="hidden md:flex items-center justify-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
          <span>←/→ Move</span>
          <span>•</span>
          <span>↑/X Rotate CW</span>
          <span>•</span>
          <span>Z Rotate CCW</span>
          <span>•</span>
          <span>↓ Soft Drop</span>
          <span>•</span>
          <span>Space Hard Drop</span>
          <span>•</span>
          <span>C/Shift Hold</span>
          <span>•</span>
          <span>P Pause</span>
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        title={isNewHighScore ? '🏆 New Best Score!' : 'Game Over'}
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHighScore}
        message={`Cleared ${lines} lines and reached Level ${level}.`}
        onRestart={handleRestart}
      />
    </GameLayout>
  );
};
