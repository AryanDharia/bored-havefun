import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GRID_SIZE = 20; // 20x20 cells

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  alpha: number;
}

export const Snake: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'snake')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const nextDirRef = useRef<Point>({ x: 0, y: -1 });
  const currentDirRef = useRef<Point>({ x: 0, y: -1 });
  
  const [food, setFood] = useState<Point>({ x: 10, y: 5 });
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('snake'));
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Visual juice refs for 60fps canvas particles & score popups
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const animFrameRef = useRef<number>(0);

  // Food spawner: guarantees NEVER spawning inside snake body
  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    const emptyCells: Point[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const occupied = currentSnake.some((seg) => seg.x === x && seg.y === y);
        if (!occupied) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) return { x: 0, y: 0 };
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }, []);

  const changeDirection = useCallback(
    (newDir: Point) => {
      // Prevent 180 reverse suicide
      const current = currentDirRef.current;
      if (newDir.x !== 0 && current.x !== 0) return;
      if (newDir.y !== 0 && current.y !== 0) return;

      nextDirRef.current = newDir;
      sounds.playMove();
    },
    []
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.code === 'Space') {
        setIsPaused((prev) => !prev);
        return;
      }

      if (isPaused || gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameOver, isPaused]);

  // Touch swipe navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 20) {
      if (dx > 0) changeDirection({ x: 1, y: 0 });
      else changeDirection({ x: -1, y: 0 });
    } else if (Math.abs(dy) > 20) {
      if (dy > 0) changeDirection({ x: 0, y: 1 });
      else changeDirection({ x: 0, y: -1 });
    }
  };

  // Trigger bite particles & score pop
  const triggerEatJuice = (pixelX: number, pixelY: number) => {
    // Screen feedback
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 200);

    // Floating +10 popup
    popupsRef.current.push({
      x: pixelX,
      y: pixelY - 10,
      text: '+10',
      alpha: 1.0,
    });

    // Particle burst
    const colors = ['#f43f5e', '#fb7185', '#a855f7', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1.5;
      particlesRef.current.push({
        x: pixelX,
        y: pixelY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3.5 + 2,
      });
    }
  };

  // Game loop tick with speed ramp
  useEffect(() => {
    if (gameOver || isPaused) return;

    // Base 130ms speed, ramp down to 60ms as score grows
    const speed = Math.max(60, 130 - Math.floor(score / 50) * 7);

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const dir = nextDirRef.current;
        currentDirRef.current = dir;

        // Wrap around edges (Nokia classic behavior)
        let newX = head.x + dir.x;
        let newY = head.y + dir.y;

        if (newX < 0) newX = GRID_SIZE - 1;
        else if (newX >= GRID_SIZE) newX = 0;

        if (newY < 0) newY = GRID_SIZE - 1;
        else if (newY >= GRID_SIZE) newY = 0;

        const newHead: Point = { x: newX, y: newY };

        // Self collision check (only losing condition)
        if (prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          sounds.playGameOver();
          setGameOver(true);
          const wasNew = saveHighScore('snake', score);
          if (wasNew) {
            setIsNewHigh(true);
            setHighScore(score);
          }
          return prevSnake;
        }

        // Food eaten check
        const ateFood = newHead.x === food.x && newHead.y === food.y;
        let newSnake: Point[];

        if (ateFood) {
          sounds.playScore();
          const newScore = score + 10;
          setScore(newScore);

          const cellSize = 400 / GRID_SIZE;
          triggerEatJuice(food.x * cellSize + cellSize / 2, food.y * cellSize + cellSize / 2);

          newSnake = [newHead, ...prevSnake];
          setFood(spawnFood(newSnake));
        } else {
          newSnake = [newHead, ...prevSnake.slice(0, -1)];
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [food, gameOver, isPaused, score, spawnFood]);

  // 60FPS Render Loop with continuous animation (food bounce, particles, score popups)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const cellSize = canvas.width / GRID_SIZE;

      // Clear board with sleek arcade grid
      ctx.fillStyle = '#0b0d18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle background grid
      ctx.strokeStyle = 'rgba(30, 35, 60, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
      }

      // Draw Animated Food (pulsing glowing apple)
      const fx = food.x * cellSize + cellSize / 2;
      const fy = food.y * cellSize + cellSize / 2;
      const pulse = Math.sin(elapsed * 6) * 1.8;
      const fr = Math.max(3, cellSize * 0.38 + pulse);

      ctx.save();
      // Outer halo
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 14 + pulse * 2;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();

      // Apple shine highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(fx - fr * 0.3, fy - fr * 0.3, fr * 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Leaf
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(fx + 2, fy - fr, 2.5, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Snake Body as continuous connected creature
      snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        const x = seg.x * cellSize;
        const y = seg.y * cellSize;
        const pad = isHead ? 1.5 : 2.5;

        ctx.save();
        if (isHead) {
          ctx.fillStyle = '#8b5cf6';
          ctx.shadowColor = '#8b5cf6';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.roundRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 7);
          ctx.fill();

          // Expressive eyes pointing toward movement direction
          ctx.fillStyle = '#ffffff';
          const dir = currentDirRef.current;
          let eye1X = x + cellSize * 0.3;
          let eye1Y = y + cellSize * 0.3;
          let eye2X = x + cellSize * 0.7;
          let eye2Y = y + cellSize * 0.3;

          if (dir.y === 1) { // Down
            eye1Y = y + cellSize * 0.7;
            eye2Y = y + cellSize * 0.7;
          } else if (dir.x === 1) { // Right
            eye1X = x + cellSize * 0.7;
            eye1Y = y + cellSize * 0.3;
            eye2X = x + cellSize * 0.7;
            eye2Y = y + cellSize * 0.7;
          } else if (dir.x === -1) { // Left
            eye1X = x + cellSize * 0.3;
            eye1Y = y + cellSize * 0.3;
            eye2X = x + cellSize * 0.3;
            eye2Y = y + cellSize * 0.7;
          }

          ctx.beginPath();
          ctx.arc(eye1X, eye1Y, 2.5, 0, Math.PI * 2);
          ctx.arc(eye2X, eye2Y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Pupils
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(eye1X + dir.x * 0.8, eye1Y + dir.y * 0.8, 1.4, 0, Math.PI * 2);
          ctx.arc(eye2X + dir.x * 0.8, eye2Y + dir.y * 0.8, 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Body gradient fade from vibrant purple to teal
          const progress = 1 - idx / snake.length;
          ctx.fillStyle = `rgba(139, 92, 246, ${Math.max(0.45, progress)})`;
          ctx.beginPath();
          ctx.roundRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 5);
          ctx.fill();
        }
        ctx.restore();
      });

      // Update & Draw Eating Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update & Draw Floating Score Popups
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.y -= 1.2;
        pop.alpha -= 0.03;

        if (pop.alpha <= 0) {
          popupsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [food, snake]);

  const restartGame = () => {
    const initialSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    nextDirRef.current = { x: 0, y: -1 };
    currentDirRef.current = { x: 0, y: -1 };
    setFood(spawnFood(initialSnake));
    setScore(0);
    setIsPaused(false);
    setGameOver(false);
    setIsNewHigh(false);
    particlesRef.current = [];
    popupsRef.current = [];
  };

  return (
    <GameLayout
      game={gameInfo}
      score={score}
      onRestart={restartGame}
      headerControls={
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full hidden sm:inline">
            Wall Wrap: Active 🌐
          </span>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      }
    >
      <div className={`flex flex-col items-center w-full max-w-md ${screenShake ? 'anim-shake' : ''}`}>
        {/* Canvas Game Arena with Wrap Hint Border */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-violet-500/40 shadow-2xl bg-[#0b0d18] w-full aspect-square max-w-[390px] ring-4 ring-violet-950/30">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full block touch-none cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          {/* Pause Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center animate-fadeIn">
              <span className="text-3xl mb-2">⏸️</span>
              <p className="text-lg font-bold text-white mb-3">Game Paused</p>
              <button
                onClick={() => setIsPaused(false)}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg"
              >
                Resume
              </button>
            </div>
          )}
        </div>

        {/* Mobile On-Screen D-Pad Controls */}
        <div className="mt-5 flex flex-col items-center gap-2 select-none">
          <button
            onClick={() => changeDirection({ x: 0, y: -1 })}
            className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg transition-transform active:scale-95"
            aria-label="Up"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={() => changeDirection({ x: -1, y: 0 })}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg transition-transform active:scale-95"
              aria-label="Left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeDirection({ x: 0, y: 1 })}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg transition-transform active:scale-95"
              aria-label="Down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => changeDirection({ x: 1, y: 0 })}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg transition-transform active:scale-95"
              aria-label="Right"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="Game Over"
        score={score}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        onRestart={restartGame}
      />
    </GameLayout>
  );
};
