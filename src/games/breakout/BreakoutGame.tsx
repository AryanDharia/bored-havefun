import React, { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Heart, Play } from 'lucide-react';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
}

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const ROW_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'];

export const BreakoutGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'breakout')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('breakout'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Ball & paddle refs for 60fps loop
  const paddleX = useRef(200);
  const ball = useRef({ x: 250, y: 300, vx: 3, vy: -3.5, r: 5 });
  const bricksRef = useRef<Brick[]>([]);
  const ballTrail = useRef<{ x: number; y: number }[]>([]);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const paddleHitFlash = useRef<number>(0);

  const spawnShatter = (bx: number, by: number, bw: number, bh: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.current.push({
        x: bx + bw / 2,
        y: by + bh / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
        size: Math.random() * 2.5 + 1.5,
      });
    }
  };

  const initBricks = () => {
    const list: Brick[] = [];
    const brickW = 52;
    const brickH = 14;
    const pad = 6;
    const offX = 20;
    const offY = 35;

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        list.push({
          x: offX + c * (brickW + pad),
          y: offY + r * (brickH + pad),
          w: brickW,
          h: brickH,
          color: ROW_COLORS[r],
          points: (BRICK_ROWS - r) * 10,
          alive: true,
        });
      }
    }
    bricksRef.current = list;
  };

  useEffect(() => {
    initBricks();
  }, []);

  // Mouse & Touch paddle tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    paddleX.current = Math.max(0, Math.min(canvas.width - 70, x - 35));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    paddleX.current = Math.max(0, Math.min(canvas.width - 70, x - 35));
  };

  // Keyboard left/right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        paddleX.current = Math.max(0, paddleX.current - 25);
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        paddleX.current = Math.min(480 - 70, paddleX.current + 25);
      }
      if (e.key === ' ' && !isPlaying && !gameOver) {
        setIsPlaying(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isPlaying]);

  // Main loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    let animId: number;

    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // Ball movement
      ball.current.x += ball.current.vx;
      ball.current.y += ball.current.vy;

      // Ball Trail
      ballTrail.current.push({ x: ball.current.x, y: ball.current.y });
      if (ballTrail.current.length > 7) {
        ballTrail.current.shift();
      }

      // Walls
      if (ball.current.x - ball.current.r <= 0 || ball.current.x + ball.current.r >= W) {
        ball.current.vx *= -1;
        sounds.playClick();
      }
      if (ball.current.y - ball.current.r <= 0) {
        ball.current.vy *= -1;
        sounds.playClick();
      }

      // Paddle hit
      const pW = 75;
      const pH = 12;
      const pY = H - 25;

      if (
        ball.current.y + ball.current.r >= pY &&
        ball.current.y - ball.current.r <= pY + pH &&
        ball.current.x >= paddleX.current &&
        ball.current.x <= paddleX.current + pW
      ) {
        ball.current.vy = -Math.abs(ball.current.vy);
        const offset = (ball.current.x - (paddleX.current + pW / 2)) / (pW / 2);
        ball.current.vx = offset * 4.5;
        paddleHitFlash.current = 1.0;
        sounds.playMove();
      }

      // Brick collision
      let allCleared = true;
      bricksRef.current.forEach((b) => {
        if (!b.alive) return;
        allCleared = false;

        if (
          ball.current.x + ball.current.r >= b.x &&
          ball.current.x - ball.current.r <= b.x + b.w &&
          ball.current.y + ball.current.r >= b.y &&
          ball.current.y - ball.current.r <= b.y + b.h
        ) {
          b.alive = false;
          ball.current.vy *= -1;
          spawnShatter(b.x, b.y, b.w, b.h, b.color);
          sounds.playScore();

          setScore((s) => {
            const nextScore = s + b.points;
            const wasNew = saveHighScore('breakout', nextScore);
            if (wasNew) {
              setIsNewHigh(true);
              setHighScore(nextScore);
            }
            return nextScore;
          });
        }
      });

      if (allCleared) {
        setGameOver(true);
        setGameWon(true);
        sounds.playWin();
        return;
      }

      // Ball dropped below
      if (ball.current.y > H) {
        sounds.playHit();
        ballTrail.current = [];
        setLives((l) => {
          const rem = l - 1;
          if (rem <= 0) {
            setGameOver(true);
            setGameWon(false);
            sounds.playGameOver();
          } else {
            // Reset ball onto paddle
            ball.current = { x: 250, y: 300, vx: 3, vy: -3.5, r: 5 };
            setIsPlaying(false);
          }
          return rem;
        });
        return;
      }

      // Render
      ctx.fillStyle = '#0a0c16';
      ctx.fillRect(0, 0, W, H);

      // Ball Trail
      ballTrail.current.forEach((pt, index) => {
        const ratio = (index + 1) / ballTrail.current.length;
        ctx.fillStyle = `rgba(167, 139, 250, ${ratio * 0.4})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, ball.current.r * ratio, 0, Math.PI * 2);
        ctx.fill();
      });

      // Shatter Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.life -= 0.035;
        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Bricks
      bricksRef.current.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 3);
        ctx.fill();
      });

      // Paddle
      const pColor = paddleHitFlash.current > 0 ? '#c4b5fd' : '#8b5cf6';
      ctx.fillStyle = pColor;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = paddleHitFlash.current > 0 ? 16 : 8;
      ctx.beginPath();
      ctx.roundRect(paddleX.current, pY, pW, pH, 5);
      ctx.fill();
      ctx.shadowBlur = 0;
      paddleHitFlash.current = Math.max(0, paddleHitFlash.current - 0.1);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, ball.current.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, isPlaying]);

  const restartGame = () => {
    initBricks();
    ball.current = { x: 250, y: 300, vx: 3, vy: -3.5, r: 5 };
    setScore(0);
    setLives(3);
    setIsPlaying(false);
    setGameOver(false);
    setGameWon(false);
    setIsNewHigh(false);
  };

  return (
    <GameLayout game={gameInfo} score={score} onRestart={restartGame}>
      <div className="w-full max-w-lg flex flex-col items-center select-none">
        {/* Status Bar */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-2 px-5 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-rose-400">
            <Heart className="w-4 h-4 fill-current" />
            <span className="font-bold">Lives: {lives}</span>
          </div>

          {!isPlaying && !gameOver && (
            <button
              onClick={() => setIsPlaying(true)}
              className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center gap-1 shadow"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Launch Ball</span>
            </button>
          )}
        </div>

        {/* Canvas Arena */}
        <div className="w-full aspect-[4/3] max-w-[480px] bg-[#0a0c16] rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={360}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="w-full h-full block cursor-ew-resize"
          />

          {!isPlaying && !gameOver && (
            <div
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
            >
              <div className="px-5 py-2.5 rounded-2xl bg-violet-600 text-white font-black text-sm shadow-xl flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                <span>Tap to Launch</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={gameWon ? '🎉 Wall Demolished!' : 'Game Over'}
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={gameWon ? 'Outstanding precision!' : 'Out of lives! Want another round?'}
        onRestart={restartGame}
      />
    </GameLayout>
  );
};
