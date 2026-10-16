import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import { GameEngine, VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from './gameEngine';
import { LEVELS } from './levelData';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Pause,
  Maximize2,
  Minimize2,
  ChevronRight,
  Trophy,
  Heart,
  Coins,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';

export const DashQuest: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'dash-quest') || {
    id: 'dash-quest',
    name: 'Dash Quest',
    description: 'Fast-paced retro 2D platformer with momentum physics, precision jumps, springs, and 3 worlds.',
    icon: '🦊',
    category: 'Arcade',
    playerCount: '1 Player',
    difficulty: 'Medium',
    tier: 2,
    howToPlay: [
      'Use Arrow Keys or A/D to run left and right.',
      'Press Space, W, or Up to jump. Hold for higher jumps, tap for quick hops!',
      'Stomp enemies from above to defeat them and earn bonus bounce height.',
      'Bounce on green springs to launch to secret elevated areas.',
      'Touch checkpoints to secure your progress. Reach the finish arch to clear the stage!'
    ],
    controls: [
      { key: 'A / D or ← / →', action: 'Run Left / Right' },
      { key: 'Space / W / ↑', action: 'Jump (variable height)' },
      { key: 'Esc / P', action: 'Pause / Resume' },
      { key: 'R', action: 'Restart Level' },
    ],
    tags: ['platformer', 'retro', 'pixel', 'arcade', 'jump'],
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React State for HUD & Modals
  const [status, setStatus] = useState<string>('title');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [levelCoins, setLevelCoins] = useState<{ collected: number; total: number }>({ collected: 0, total: 0 });
  const [levelName, setLevelName] = useState<string>('Green Valley');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [highScore, setLocalHighScore] = useState<number>(() => getHighScore('dash-quest'));

  // Mobile Touch Input State
  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    jumpPressed: false,
  });

  // Initialize Game Engine once
  useEffect(() => {
    const engine = new GameEngine(LEVELS);
    engineRef.current = engine;
    setStatus('title');

    return () => {
      engineRef.current = null;
    };
  }, []);

  // Sync React HUD state from Engine
  const syncHud = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    setScore(engine.score);
    setLives(engine.lives);
    setLevelCoins({
      collected: engine.levelCoinsCollected,
      total: engine.levelCoinsTotal,
    });
    setLevelName(engine.levelConfig.name);
    setStatus(engine.status);

    // Save High Score
    if (engine.score > highScore) {
      setLocalHighScore(engine.score);
      saveHighScore('dash-quest', engine.score);
    }
  }, [highScore]);

  // Main 60FPS Game Loop via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); // Cap dt to avoid delta jumps
      lastTime = time;

      const engine = engineRef.current;
      const canvas = canvasRef.current;

      if (engine && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Pass current input snapshot
          const currentInput = {
            left: inputRef.current.left,
            right: inputRef.current.right,
            jump: inputRef.current.jump,
            jumpPressed: inputRef.current.jumpPressed,
          };
          // Reset single-frame jump trigger
          inputRef.current.jumpPressed = false;

          // Update game engine
          engine.update(dt, currentInput);

          // Render game scene
          engine.render(ctx);

          // Sync state to React HUD
          syncHud();
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [syncHud]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in form inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const engine = engineRef.current;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = true;
        e.preventDefault();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = true;
        e.preventDefault();
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (!inputRef.current.jump) {
          inputRef.current.jumpPressed = true;
        }
        inputRef.current.jump = true;
        e.preventDefault();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (engine && engine.status === 'playing') {
          engine.status = 'paused';
          setStatus('paused');
          sounds.playClick();
        } else if (engine && engine.status === 'paused') {
          engine.status = 'playing';
          setStatus('playing');
          sounds.playClick();
        }
        e.preventDefault();
      } else if (e.code === 'KeyR') {
        if (engine && (engine.status === 'playing' || engine.status === 'paused' || engine.status === 'game_over')) {
          engine.initLevel(engine.currentLevelIdx, true);
          engine.status = 'playing';
          setStatus('playing');
          sounds.playClick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = false;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Trigger victory confetti on stage clear or game win
  useEffect(() => {
    if (status === 'level_complete' || status === 'victory') {
      try {
        confetti({
          particleCount: status === 'victory' ? 120 : 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f97316', '#38bdf8', '#facc15', '#22c55e', '#ffffff'],
        });
      } catch {
        // Safe fail
      }
    }
  }, [status]);

  // Actions
  const startGame = (chosenLevel: number = 0) => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    engine.initLevel(chosenLevel, false);
    engine.status = 'playing';
    setStatus('playing');
  };

  const resumeGame = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    engine.status = 'playing';
    setStatus('playing');
  };

  const pauseGame = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    engine.status = 'paused';
    setStatus('paused');
  };

  const restartCurrentLevel = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    engine.initLevel(engine.currentLevelIdx, true);
    engine.status = 'playing';
    setStatus('playing');
  };

  const nextLevel = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    const nextIdx = engine.currentLevelIdx + 1;
    if (nextIdx < LEVELS.length) {
      engine.initLevel(nextIdx, true);
      engine.status = 'playing';
      setStatus('playing');
    } else {
      engine.status = 'victory';
      setStatus('victory');
    }
  };

  const returnToTitle = () => {
    const engine = engineRef.current;
    if (!engine) return;
    sounds.playClick();
    engine.status = 'title';
    setStatus('title');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={status === 'playing' ? restartCurrentLevel : undefined}
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center select-none px-2 sm:px-4">
        {/* GAME SCREEN CONTAINER */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-[#030712] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80 flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          {/* Main Pixel Canvas */}
          <canvas
            ref={canvasRef}
            width={VIRTUAL_WIDTH}
            height={VIRTUAL_HEIGHT}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* IN-GAME HUD OVERLAY (When Playing or Paused) */}
          {(status === 'playing' || status === 'paused') && (
            <div className="absolute top-0 inset-x-0 p-2 sm:p-3 flex items-center justify-between pointer-events-none text-white text-xs sm:text-sm font-mono z-20">
              {/* Left HUD: Lives & Stage */}
              <div className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-md">
                <div className="flex items-center gap-1 text-rose-400 font-bold">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>x{lives}</span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                  {levelName}
                </span>
              </div>

              {/* Right HUD: Coins, Score & Controls */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-md">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{levelCoins.collected}/{levelCoins.total}</span>
                  </div>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-1 text-orange-400 font-bold">
                    <span>{score} PTS</span>
                  </div>
                </div>

                {/* Pause & Fullscreen Buttons */}
                <div className="flex items-center gap-1 pointer-events-auto">
                  <button
                    onClick={status === 'playing' ? pauseGame : resumeGame}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                    title={status === 'playing' ? 'Pause' : 'Resume'}
                  >
                    {status === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer hidden sm:inline-flex"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TITLE SCREEN OVERLAY */}
          {status === 'title' && (
            <div className="absolute inset-0 bg-[#08090d]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-xs mb-3 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>RETRO PLATFORMER</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
                DASH{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400">
                  QUEST
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Run, leap, and stomp through 3 vibrant worlds. Collect golden gems, bounce on springs, and conquer the Cyber Citadel!
              </p>

              {/* Level Selector Pills */}
              <div className="flex items-center gap-2 mb-6">
                {LEVELS.map((lvl, idx) => (
                  <button
                    key={lvl.id}
                    onClick={() => startGame(idx)}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 text-xs sm:text-sm font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 group"
                  >
                    <span>Lvl {idx + 1}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-orange-400">
                      {lvl.theme === 'valley' ? '🌲' : lvl.theme === 'cavern' ? '💎' : '⚡'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Primary Start CTA */}
              <button
                onClick={() => startGame(0)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-orange-500/25 transition-all cursor-pointer scale-100 hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>PLAY FROM STAGE 1</span>
              </button>

              {/* High Score Footnote */}
              {highScore > 0 && (
                <div className="mt-4 flex items-center gap-1.5 text-xs font-mono text-amber-400/80">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>HIGH SCORE: {highScore} PTS</span>
                </div>
              )}
            </div>
          )}

          {/* PAUSE OVERLAY */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide mb-5">
                GAME PAUSED
              </h2>
              <div className="flex flex-col gap-2.5 w-48">
                <button
                  onClick={resumeGame}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Resume
                </button>
                <button
                  onClick={restartCurrentLevel}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all cursor-pointer"
                >
                  Restart Stage
                </button>
                <button
                  onClick={returnToTitle}
                  className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-medium text-xs transition-all cursor-pointer"
                >
                  Stage Select
                </button>
              </div>
            </div>
          )}

          {/* LEVEL COMPLETE OVERLAY */}
          {status === 'level_complete' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 grid place-items-center mb-3">
                <Trophy className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">
                STAGE CLEAR!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mb-5 font-mono">
                {levelName} Conquered • +500 Bonus PTS
              </p>

              <div className="flex items-center gap-4 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 mb-6 font-mono text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">COINS</span>
                  <span className="text-yellow-400 font-bold text-sm">
                    {levelCoins.collected} / {levelCoins.total}
                  </span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL SCORE</span>
                  <span className="text-orange-400 font-bold text-sm">{score}</span>
                </div>
              </div>

              <button
                onClick={nextLevel}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <span>NEXT STAGE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {status === 'game_over' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 grid place-items-center mb-3">
                <span className="text-2xl">💀</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-rose-400 mb-2">
                GAME OVER
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-5 font-mono">
                Score: {score} PTS {highScore > 0 && `• Best: ${highScore}`}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={restartCurrentLevel}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={returnToTitle}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/10 transition-all cursor-pointer"
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}

          {/* VICTORY OVERLAY (Beat Level 3) */}
          {status === 'victory' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in zoom-in duration-400">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 grid place-items-center mb-3 animate-bounce">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 mb-2">
                VICTORY!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-5 font-mono leading-relaxed">
                You conquered all 3 stages and reclaimed the Cyber Citadel!
              </p>

              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl mb-6 font-mono text-center">
                <span className="text-[11px] text-slate-400 block mb-0.5">FINAL ADVENTURE SCORE</span>
                <span className="text-2xl font-black text-amber-400">{score} PTS</span>
              </div>

              <button
                onClick={() => startGame(0)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-orange-500/30 transition-all cursor-pointer scale-100 hover:scale-105"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          )}
        </div>

        {/* ON-SCREEN MOBILE TOUCH CONTROLS (Only visible on touch devices / narrow screens) */}
        <div className="w-full flex items-center justify-between mt-3 px-1 sm:hidden">
          {/* Left Thumb: Directional Buttons */}
          <div className="flex items-center gap-3">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                inputRef.current.left = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                inputRef.current.left = false;
              }}
              onPointerLeave={(e) => {
                e.preventDefault();
                inputRef.current.left = false;
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                inputRef.current.left = false;
              }}
              className="w-14 h-14 rounded-2xl bg-slate-800/90 active:bg-orange-500/30 border border-white/15 active:border-orange-500/60 grid place-items-center text-white shadow-lg active:scale-95 transition-transform touch-none"
              aria-label="Move Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                inputRef.current.right = true;
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                inputRef.current.right = false;
              }}
              onPointerLeave={(e) => {
                e.preventDefault();
                inputRef.current.right = false;
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                inputRef.current.right = false;
              }}
              className="w-14 h-14 rounded-2xl bg-slate-800/90 active:bg-orange-500/30 border border-white/15 active:border-orange-500/60 grid place-items-center text-white shadow-lg active:scale-95 transition-transform touch-none"
              aria-label="Move Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* Right Thumb: Jump Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              inputRef.current.jumpPressed = true;
              inputRef.current.jump = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputRef.current.jump = false;
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              inputRef.current.jump = false;
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              inputRef.current.jump = false;
            }}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 active:from-orange-600 active:to-amber-500 border border-orange-300/40 text-slate-950 font-black flex flex-col items-center justify-center shadow-lg shadow-orange-500/20 active:scale-90 transition-transform touch-none"
            aria-label="Jump"
          >
            <ArrowUp className="w-6 h-6 stroke-[3]" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold -mt-1">JUMP</span>
          </button>
        </div>

        {/* DESKTOP KEYBOARD CONTROLS BAR (Hidden on mobile) */}
        <div className="hidden sm:flex items-center justify-between w-full mt-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">A</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">D</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">←</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">→</kbd> Run
            </span>
            <span className="text-slate-600">•</span>
            <span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">SPACE</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">W</kbd> Jump
            </span>
            <span className="text-slate-600">•</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">ESC</kbd> Pause
            </span>
            <span className="text-slate-600">•</span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">R</kbd> Restart
            </span>
          </div>

          <div className="text-slate-500">
            Hold Jump for higher leaps • Stomp enemies for bounce
          </div>
        </div>
      </div>
    </GameLayout>
  );
};
