import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Pause,
  Award
} from 'lucide-react';
import type { FlappyGameStatus, PipBird, PipePair } from './types';
import {
  FlappyRenderer,
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  PLAYABLE_HEIGHT
} from './flappyRenderer';
import { flappyAudio } from './audio';

const GRAVITY = 0.38;
const FLAP_IMPULSE = -7.2;
const MAX_FALL_SPEED = 8.5;
const INITIAL_PIPE_SPEED = 2.2;
const MAX_PIPE_SPEED = 2.85;
const PIPE_WIDTH = 56;
const PIPE_SPACING = 200;

export const FlappyRush: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'flappy-rush') || {
    id: 'flappy-rush',
    name: 'Flappy Rush',
    description: 'Guide Pip the aviator bird through neon-emerald obstacle towers! Tap or press Space to flap.',
    icon: '🐤',
    category: 'Arcade' as const,
    playerCount: '1 Player',
    difficulty: 'Medium' as const,
    tier: 1,
    estimatedTime: '1–2 min',
    howToPlay: [
      'Tap anywhere or press Space / Up to flap your wings and gain altitude.',
      'Gravity continuously pulls you down. Time your flaps to navigate between the pipe gaps.',
      'Collect the glowing speed gems inside each gap for clean clearance.',
      'Avoid colliding with the ground, ceiling boundaries, or obstacle towers!'
    ],
    controls: [
      { key: 'Space / Up / Click', action: 'Flap wings' },
      { key: 'Esc / P', action: 'Pause / Resume' },
      { key: 'R', action: 'Restart flight' }
    ],
    tags: ['flappy', 'arcade', 'retro', 'bird', 'flying', 'runner', 'high-score', 'skill']
  };

  const [status, setStatus] = useState<FlappyGameStatus>('ready');
  const [score, setScore] = useState<number>(0);
  const [personalBest, setPersonalBest] = useState<number>(() => getHighScore('flappy-rush'));
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [gameOverCooldown, setGameOverCooldown] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<FlappyRenderer>(new FlappyRenderer());
  const lastTimeRef = useRef<number>(0);
  const nextPipeIdRef = useRef<number>(1);

  // Bird physics state in ref for 60fps performance
  const birdRef = useRef<PipBird>({
    x: 100,
    y: 240,
    vy: 0,
    radius: 13,
    rotation: 0,
    wingFrame: 0,
    wingTimer: 0,
    bobTimer: 0,
    isDead: false
  });

  const pipesRef = useRef<PipePair[]>([]);

  // Spawn a new pair of pipes with fair randomization
  const spawnPipePair = useCallback((startX: number, currentScore: number) => {
    // Gap starts generous (132px) and gently tapers to 114px at high score
    const gap = Math.max(114, 132 - Math.floor(currentScore / 6) * 3);
    const minTop = 60;
    const maxTop = PLAYABLE_HEIGHT - gap - 60;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
    const bottomY = topHeight + gap;

    const pair: PipePair = {
      id: nextPipeIdRef.current++,
      x: startX,
      topHeight,
      bottomY,
      gap,
      width: PIPE_WIDTH,
      scored: false,
      gemCollected: false
    };

    pipesRef.current.push(pair);
  }, []);

  // Initialize Game State
  const resetGame = useCallback(() => {
    rendererRef.current.reset();
    birdRef.current = {
      x: 100,
      y: 240,
      vy: 0,
      radius: 13,
      rotation: 0,
      wingFrame: 0,
      wingTimer: 0,
      bobTimer: 0,
      isDead: false
    };

    nextPipeIdRef.current = 1;
    pipesRef.current = [];
    setScore(0);
    setIsNewRecord(false);
    setGameOverCooldown(false);
    setStatus('ready');
  }, []);

  // Flap wings impulse
  const handleFlap = useCallback(() => {
    if (status === 'ready') {
      setStatus('playing');
      lastTimeRef.current = performance.now();
      // Initial pipe spawn ahead
      pipesRef.current = [];
      spawnPipePair(VIRTUAL_WIDTH + 80, 0);
      spawnPipePair(VIRTUAL_WIDTH + 80 + PIPE_SPACING, 0);
    }

    if (status === 'playing' && !birdRef.current.isDead) {
      birdRef.current.vy = FLAP_IMPULSE;
      birdRef.current.wingFrame = 1;
      birdRef.current.wingTimer = 0.14;
      flappyAudio.playFlap();
      rendererRef.current.triggerFlapParticles(birdRef.current.x, birdRef.current.y);
    }
  }, [status, spawnPipePair]);

  // Handle Game Over
  const triggerGameOver = useCallback(() => {
    if (birdRef.current.isDead) return;
    birdRef.current.isDead = true;
    flappyAudio.playHit();

    rendererRef.current.triggerHitSparks(birdRef.current.x, birdRef.current.y);
    setStatus('game-over');
    setGameOverCooldown(true);

    // Save High Score
    const isRecord = saveHighScore('flappy-rush', score);
    if (isRecord) {
      setIsNewRecord(true);
      setPersonalBest(score);
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }
    }

    flappyAudio.playGameOver();

    // Prevent immediate accidental restart for 400ms
    setTimeout(() => {
      setGameOverCooldown(false);
    }, 450);
  }, [score]);

  // Global Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Flap with Space or ArrowUp
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (status === 'ready' || status === 'playing') {
          handleFlap();
        } else if (status === 'game-over' && !gameOverCooldown) {
          resetGame();
        }
        return;
      }

      // Pause toggle: Esc or P
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (status === 'playing') {
          setStatus('paused');
        } else if (status === 'paused') {
          setStatus('playing');
        }
        return;
      }

      // Restart shortcut: R
      if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, gameOverCooldown, handleFlap, resetGame]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const bird = birdRef.current;

      if (canvas && ctx) {
        // Calculate progressive pipe speed based on score
        const currentSpeed = Math.min(
          MAX_PIPE_SPEED,
          INITIAL_PIPE_SPEED + Math.floor(score / 8) * 0.12
        );

        if (status === 'ready') {
          // Gentle hovering sinusoidal bob
          bird.bobTimer += dt * 4;
          bird.y = 240 + Math.sin(bird.bobTimer) * 7;
          bird.rotation = Math.sin(bird.bobTimer) * 4;
          rendererRef.current.update(dt, currentSpeed, false);
        } else if (status === 'playing') {
          // 1. Bird Physics Update
          bird.vy = Math.min(MAX_FALL_SPEED, bird.vy + GRAVITY * (dt * 60));
          bird.y += bird.vy * (dt * 60);

          // Wing flap animation timer
          if (bird.wingTimer > 0) {
            bird.wingTimer -= dt;
            if (bird.wingTimer <= 0) bird.wingFrame = 0;
          }

          // Pitch rotation: angles up when flapping (-24deg), dives down as velocity builds (+72deg)
          if (bird.vy < 0) {
            bird.rotation = Math.max(-25, bird.rotation - dt * 250);
          } else {
            bird.rotation = Math.min(75, bird.rotation + dt * 180);
          }

          // Soft ceiling collision
          if (bird.y - bird.radius < 0) {
            bird.y = bird.radius;
            bird.vy = 0;
          }

          // Ground collision (Instant Death)
          if (bird.y + bird.radius >= PLAYABLE_HEIGHT) {
            bird.y = PLAYABLE_HEIGHT - bird.radius;
            triggerGameOver();
          }

          // 2. Pipes Movement & Generation
          const pipes = pipesRef.current;
          for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= currentSpeed * (dt * 60);

            // Gem collection detection
            if (!p.gemCollected && bird.x > p.x + p.width / 2) {
              p.gemCollected = true;
              rendererRef.current.triggerScoreSparkles(p.x + p.width / 2, p.topHeight + p.gap / 2);
            }

            // Score detection: Passed pipe pair
            if (!p.scored && bird.x > p.x + p.width) {
              p.scored = true;
              flappyAudio.playScore();
              setScore((s) => {
                const nextScore = s + 1;
                if (nextScore % 10 === 0) {
                  flappyAudio.playMilestone();
                }
                return nextScore;
              });
            }

            // Pipe Collision Detection
            // Pip circular hitbox radius
            const hitboxR = bird.radius - 2; // Forgiving collision

            // Check horizontal overlap with pipe
            if (bird.x + hitboxR > p.x && bird.x - hitboxR < p.x + p.width) {
              // Top Pipe Collision
              if (bird.y - hitboxR < p.topHeight) {
                triggerGameOver();
              }
              // Bottom Pipe Collision
              if (bird.y + hitboxR > p.bottomY) {
                triggerGameOver();
              }
            }

            // Remove offscreen pipes
            if (p.x < -PIPE_WIDTH - 20) {
              pipes.splice(i, 1);
            }
          }

          // Spawn new pipe when the last pipe has moved past spacing
          const lastPipe = pipes[pipes.length - 1];
          if (lastPipe && lastPipe.x <= VIRTUAL_WIDTH + 80 - PIPE_SPACING) {
            spawnPipePair(VIRTUAL_WIDTH + 80, score);
          }

          // Update renderer particles & background scroll
          rendererRef.current.update(dt, currentSpeed, true);
        } else if (status === 'game-over') {
          // Bird tumbles down to ground if in air
          if (bird.y + bird.radius < PLAYABLE_HEIGHT) {
            bird.vy = Math.min(MAX_FALL_SPEED, bird.vy + GRAVITY * 1.5 * (dt * 60));
            bird.y = Math.min(PLAYABLE_HEIGHT - bird.radius, bird.y + bird.vy * (dt * 60));
            bird.rotation = Math.min(90, bird.rotation + dt * 250);
          }
          rendererRef.current.update(dt, currentSpeed, false);
        }

        // Render Frame
        rendererRef.current.render(
          ctx,
          bird,
          pipesRef.current,
          score,
          status === 'ready'
        );
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [status, score, spawnPipePair, triggerGameOver]);

  // Medal determination
  const medal = score >= 50 ? { name: 'Platinum Pilot', color: 'text-cyan-300', bg: 'bg-cyan-500/20 border-cyan-500/40' }
    : score >= 25 ? { name: 'Gold Aviator', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/40' }
    : score >= 10 ? { name: 'Silver Wing', color: 'text-slate-300', bg: 'bg-slate-400/20 border-slate-400/40' }
    : score >= 5 ? { name: 'Bronze Chick', color: 'text-amber-600', bg: 'bg-amber-700/20 border-amber-700/40' }
    : null;

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={resetGame}
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex flex-col items-center gap-4 select-none">
        {/* Game Canvas Container with touch-action: none to prevent accidental scrolling on touch */}
        <div
          ref={containerRef}
          onClick={handleFlap}
          className="relative w-full max-w-[420px] aspect-[400/600] rounded-3xl overflow-hidden border-2 border-white/15 bg-black shadow-2xl cursor-pointer touch-none"
          title="Tap or click to flap"
        >
          <canvas
            ref={canvasRef}
            width={VIRTUAL_WIDTH}
            height={VIRTUAL_HEIGHT}
            className="w-full h-full object-cover block"
          />

          {/* 1. Ready State Overlay */}
          {status === 'ready' && (
            <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl mb-3 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-bounce">
                🐤
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mb-1">
                GET READY!
              </h2>

              <p className="text-xs sm:text-sm font-bold text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] uppercase tracking-wider mb-6">
                TAP OR PRESS SPACE TO FLY
              </p>

              <div className="px-5 py-2.5 rounded-2xl bg-black/60 border border-white/20 text-white font-mono text-xs flex items-center gap-2 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Tap anywhere to start
              </div>
            </div>
          )}

          {/* 2. Paused State Overlay */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Pause className="w-6 h-6 text-orange-500" /> Flight Paused
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.playClick();
                    setStatus('playing');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Resume
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sounds.playClick();
                    resetGame();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* 3. Game Over Scoreboard Modal */}
          {status === 'game-over' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in duration-200">
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-[320px] w-full rounded-3xl bg-slate-900/95 border border-white/15 p-5 shadow-2xl flex flex-col items-center gap-3"
              >
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  GAME OVER
                </h3>

                {isNewRecord && (
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-bounce flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> NEW PERSONAL BEST!
                  </div>
                )}

                {/* Scoreboard Card */}
                <div className="w-full rounded-2xl bg-black/40 border border-white/10 p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">Score</span>
                    <span className="text-3xl font-black text-white font-mono">{score}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">Best</span>
                    <span className="text-2xl font-black text-amber-400 font-mono flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-amber-400" /> {personalBest}
                    </span>
                  </div>

                  {medal && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-400 uppercase">Medal</span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono flex items-center gap-1 ${medal.color} ${medal.bg}`}>
                        <Award className="w-3.5 h-3.5" /> {medal.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full pt-1">
                  <button
                    disabled={gameOverCooldown}
                    onClick={(e) => {
                      e.stopPropagation();
                      sounds.playClick();
                      resetGame();
                    }}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Fly Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* On-Screen Mobile Tap Area & Desktop Controls Help */}
        <div className="w-full max-w-[420px] flex items-center justify-between px-2 text-xs font-mono text-slate-400">
          <span>Controls: <strong className="text-white">Space / Tap</strong></span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Best: <strong className="text-amber-400">{personalBest}</strong>
          </span>
        </div>
      </div>
    </GameLayout>
  );
};
