import React, { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

export const PongGame: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'pong')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Game coordinates state in refs for 60fps smooth loop
  const p1Y = useRef(150);
  const p2Y = useRef(150);
  const ballPos = useRef({ x: 250, y: 150 });
  const ballVel = useRef({ x: 3.5, y: 2 });
  const keysPressed = useRef<{ [k: string]: boolean }>({});
  const ballTrail = useRef<{ x: number; y: number }[]>([]);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const p1Flash = useRef<number>(0);
  const p2Flash = useRef<number>(0);

  const PADDLE_HEIGHT = 65;
  const PADDLE_WIDTH = 10;
  const BALL_SIZE = 8;
  const WINNING_SCORE = 7;

  const spawnHitParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = Math.random() * 3 + 1;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed * (color === '#8b5cf6' ? 1 : -1),
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
      });
    }
  };

  const resetBall = (direction: 1 | -1) => {
    ballPos.current = { x: 250, y: 150 };
    ballTrail.current = [];
    ballVel.current = {
      x: 3.5 * direction,
      y: (Math.random() * 2 - 1) * 3,
    };
  };

  // Keyboard events
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
    };
    const handleUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  // Main 60fps Canvas Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (gameOver) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // P1 movement (W/S or Up/Down if single player)
      if (keysPressed.current['w'] || keysPressed.current['W'] || keysPressed.current['ArrowUp']) {
        p1Y.current = Math.max(0, p1Y.current - 5.5);
      }
      if (keysPressed.current['s'] || keysPressed.current['S'] || keysPressed.current['ArrowDown']) {
        p1Y.current = Math.min(H - PADDLE_HEIGHT, p1Y.current + 5.5);
      }

      // P2 / AI movement
      if (mode === 'pvp') {
        if (keysPressed.current['i'] || keysPressed.current['I']) {
          p2Y.current = Math.max(0, p2Y.current - 5.5);
        }
        if (keysPressed.current['k'] || keysPressed.current['K']) {
          p2Y.current = Math.min(H - PADDLE_HEIGHT, p2Y.current + 5.5);
        }
      } else {
        // Smooth AI track
        const targetY = ballPos.current.y - PADDLE_HEIGHT / 2;
        if (p2Y.current < targetY - 4) {
          p2Y.current += 3.8;
        } else if (p2Y.current > targetY + 4) {
          p2Y.current -= 3.8;
        }
        p2Y.current = Math.max(0, Math.min(H - PADDLE_HEIGHT, p2Y.current));
      }

      // Ball Physics
      ballPos.current.x += ballVel.current.x;
      ballPos.current.y += ballVel.current.y;

      // Ball Trail
      ballTrail.current.push({ x: ballPos.current.x, y: ballPos.current.y });
      if (ballTrail.current.length > 8) {
        ballTrail.current.shift();
      }

      // Top / Bottom Wall Bounces
      if (ballPos.current.y <= 0 || ballPos.current.y >= H - BALL_SIZE) {
        ballVel.current.y *= -1;
        sounds.playClick();
      }

      // Left Paddle Collision (P1)
      if (
        ballPos.current.x <= 25 + PADDLE_WIDTH &&
        ballPos.current.x >= 20 &&
        ballPos.current.y + BALL_SIZE >= p1Y.current &&
        ballPos.current.y <= p1Y.current + PADDLE_HEIGHT
      ) {
        const offset = (ballPos.current.y - (p1Y.current + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ballVel.current.x = Math.abs(ballVel.current.x) * 1.05; // slight speedup
        ballVel.current.y = offset * 4.5;
        p1Flash.current = 1.0;
        spawnHitParticles(25 + PADDLE_WIDTH, ballPos.current.y, '#8b5cf6');
        sounds.playMove();
      }

      // Right Paddle Collision (P2 / AI)
      if (
        ballPos.current.x + BALL_SIZE >= W - 25 - PADDLE_WIDTH &&
        ballPos.current.x <= W - 20 &&
        ballPos.current.y + BALL_SIZE >= p2Y.current &&
        ballPos.current.y <= p2Y.current + PADDLE_HEIGHT
      ) {
        const offset = (ballPos.current.y - (p2Y.current + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ballVel.current.x = -Math.abs(ballVel.current.x) * 1.05;
        ballVel.current.y = offset * 4.5;
        p2Flash.current = 1.0;
        spawnHitParticles(W - 25 - PADDLE_WIDTH, ballPos.current.y, '#f43f5e');
        sounds.playMove();
      }

      // Point scored Left (P2 scores)
      if (ballPos.current.x < 0) {
        sounds.playGameOver();
        resetBall(1);
        setScores((prev) => {
          const nextP2 = prev.p2 + 1;
          if (nextP2 >= WINNING_SCORE) {
            setGameOver(true);
            setWinner(mode === 'ai' ? 'Computer AI' : 'Player 2');
          }
          return { ...prev, p2: nextP2 };
        });
      }

      // Point scored Right (P1 scores)
      if (ballPos.current.x > W) {
        sounds.playScore();
        resetBall(-1);
        setScores((prev) => {
          const nextP1 = prev.p1 + 1;
          if (nextP1 >= WINNING_SCORE) {
            setGameOver(true);
            setWinner('Player 1');
            sounds.playWin();
          }
          return { ...prev, p1: nextP1 };
        });
      }

      // Render Frame
      ctx.fillStyle = '#0a0c16';
      ctx.fillRect(0, 0, W, H);

      // Center dashed net
      ctx.strokeStyle = '#1e2338';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ball Trail
      ballTrail.current.forEach((pt, index) => {
        const ratio = (index + 1) / ballTrail.current.length;
        ctx.fillStyle = `rgba(167, 139, 250, ${ratio * 0.35})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (BALL_SIZE / 2) * ratio, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sparks / Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) {
          particles.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // P1 Paddle (Violet + Flash)
      const p1Col = p1Flash.current > 0 ? '#c4b5fd' : '#8b5cf6';
      ctx.fillStyle = p1Col;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = p1Flash.current > 0 ? 16 : 8;
      ctx.fillRect(20, p1Y.current, PADDLE_WIDTH, PADDLE_HEIGHT);
      p1Flash.current = Math.max(0, p1Flash.current - 0.08);

      // P2 Paddle (Rose + Flash)
      const p2Col = p2Flash.current > 0 ? '#fda4af' : '#f43f5e';
      ctx.fillStyle = p2Col;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = p2Flash.current > 0 ? 16 : 8;
      ctx.fillRect(W - 20 - PADDLE_WIDTH, p2Y.current, PADDLE_WIDTH, PADDLE_HEIGHT);
      p2Flash.current = Math.max(0, p2Flash.current - 0.08);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ballPos.current.x, ballPos.current.y, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameOver, mode]);

  const restartGame = () => {
    setScores({ p1: 0, p2: 0 });
    setGameOver(false);
    setWinner(null);
    resetBall(1);
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={restartGame}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setMode('ai');
              restartGame();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
              mode === 'ai' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs AI</span>
          </button>
          <button
            onClick={() => {
              setMode('pvp');
              restartGame();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
              mode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2 Players (W/S & I/K)</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-lg flex flex-col items-center select-none">
        {/* Score Header */}
        <div className="w-full flex items-center justify-around bg-[#121420] border border-slate-800 rounded-2xl py-3 px-6 mb-4">
          <div className="text-center">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
              Player 1
            </span>
            <div key={`p1-${scores.p1}`} className="text-3xl font-black text-white anim-pop">{scores.p1}</div>
          </div>
          <span className="text-slate-600 font-bold">First to 7</span>
          <div className="text-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              {mode === 'ai' ? 'Computer' : 'Player 2'}
            </span>
            <div key={`p2-${scores.p2}`} className="text-3xl font-black text-white anim-pop">{scores.p2}</div>
          </div>
        </div>

        {/* Canvas Arena */}
        <div className="w-full aspect-[5/3] max-w-[500px] bg-[#0a0c16] rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">
          <canvas ref={canvasRef} width={500} height={300} className="w-full h-full block" />
        </div>

        {/* Touch Controls for Mobile */}
        <div className="flex gap-4 mt-4 sm:hidden">
          <button
            onTouchStart={() => (keysPressed.current['ArrowUp'] = true)}
            onTouchEnd={() => (keysPressed.current['ArrowUp'] = false)}
            className="px-6 py-3 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 text-white font-bold text-sm"
          >
            ▲ Move Up
          </button>
          <button
            onTouchStart={() => (keysPressed.current['ArrowDown'] = true)}
            onTouchEnd={() => (keysPressed.current['ArrowDown'] = false)}
            className="px-6 py-3 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 text-white font-bold text-sm"
          >
            ▼ Move Down
          </button>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="Match Complete!"
        message={`${winner} wins the Pong trophy!`}
        onRestart={restartGame}
      />
    </GameLayout>
  );
};
