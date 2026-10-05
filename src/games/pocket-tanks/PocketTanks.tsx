import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Crosshair, Bot, Users } from 'lucide-react';

interface Tank {
  x: number;
  y: number;
  angle: number; // 0 to 180
  power: number; // 10 to 100
  health: number; // 0 to 100
  color: string;
}

export const PocketTanks: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'pocket-tanks')!;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [turn, setTurn] = useState<0 | 1>(0); // 0 = Tank 1 (Left), 1 = Tank 2 (Right)
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Tanks state
  const [tanks, setTanks] = useState<Tank[]>([
    { x: 80, y: 300, angle: 45, power: 55, health: 100, color: '#8b5cf6' },
    { x: 420, y: 300, angle: 135, power: 55, health: 100, color: '#f43f5e' },
  ]);

  // Terrain profile (elevation per x coordinate)
  const terrainRef = useRef<number[]>([]);

  // Generate hilly terrain
  const generateTerrain = useCallback((width: number, height: number) => {
    const points: number[] = [];
    const baseHeight = height * 0.75;
    for (let x = 0; x < width; x++) {
      // Combination of sines for natural hills
      const h =
        baseHeight +
        Math.sin(x * 0.015) * 35 +
        Math.cos(x * 0.035) * 20 +
        Math.sin(x * 0.005) * 40;
      points.push(Math.min(height - 20, Math.max(height * 0.45, h)));
    }
    terrainRef.current = points;

    // Position tanks on terrain
    setTanks((prev) => [
      { ...prev[0], x: 80, y: points[80] - 8, health: 100, angle: 45, power: 55 },
      { ...prev[1], x: width - 80, y: points[width - 80] - 8, health: 100, angle: 135, power: 55 },
    ]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      generateTerrain(canvas.width, canvas.height);
    }
  }, [generateTerrain]);

  const fireMissile = () => {
    if (isFiring || gameOver) return;
    setIsFiring(true);
    sounds.playHit();

    const activeTank = tanks[turn];
    const angleRad = (activeTank.angle * Math.PI) / 180;
    const speed = activeTank.power * 0.16;

    let posX = activeTank.x;
    let posY = activeTank.y - 12;
    let velX = Math.cos(angleRad) * speed;
    let velY = -Math.sin(angleRad) * speed;
    const gravity = 0.14;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const animInterval = setInterval(() => {
      posX += velX;
      posY += velY;
      velY += gravity;

      const cWidth = canvas.width;
      const cHeight = canvas.height;

      // Check boundary exit
      if (posX < 0 || posX > cWidth || posY > cHeight) {
        clearInterval(animInterval);
        finishTurn();
        return;
      }

      // Check terrain collision
      const terrainY = terrainRef.current[Math.floor(posX)] ?? cHeight;
      if (posY >= terrainY) {
        clearInterval(animInterval);
        handleImpact(posX, posY);
        return;
      }

      // Check direct tank collision
      const targetIdx = turn === 0 ? 1 : 0;
      const targetTank = tanks[targetIdx];
      const dist = Math.hypot(posX - targetTank.x, posY - (targetTank.y - 6));
      if (dist < 18) {
        clearInterval(animInterval);
        handleImpact(posX, posY);
        return;
      }

      drawScene(posX, posY);
    }, 16);
  };

  const handleImpact = (impactX: number, impactY: number) => {
    sounds.playHit();

    // Damage calculation based on blast radius
    setTanks((prev) => {
      const next = prev.map((t) => {
        const d = Math.hypot(impactX - t.x, impactY - t.y);
        if (d < 45) {
          const dmg = Math.floor(Math.max(10, (1 - d / 45) * 45));
          const newHp = Math.max(0, t.health - dmg);
          return { ...t, health: newHp };
        }
        return t;
      });

      // Check victory
      if (next[0].health <= 0) {
        setGameOver(true);
        setWinner(mode === 'ai' ? 'Red AI' : 'Tank 2 (Red)');
        sounds.playWin();
      } else if (next[1].health <= 0) {
        setGameOver(true);
        setWinner('Tank 1 (Purple)');
        sounds.playWin();
      }

      return next;
    });

    drawScene(null, null);
    setTimeout(() => {
      finishTurn();
    }, 400);
  };

  const finishTurn = () => {
    setIsFiring(false);
    setTurn((prev) => (prev === 0 ? 1 : 0));
  };

  // AI Aim & Fire
  useEffect(() => {
    if (mode === 'ai' && turn === 1 && !isFiring && !gameOver) {
      const timer = setTimeout(() => {
        // Estimated angle towards left (~130-150 deg)
        const aimAngle = 135 + (Math.random() * 10 - 5);
        const aimPower = Math.min(95, Math.max(40, 58 + (Math.random() * 8 - 4)));

        setTanks((prev) => {
          const next = [...prev];
          next[1].angle = Math.round(aimAngle);
          next[1].power = Math.round(aimPower);
          return next;
        });

        setTimeout(() => {
          fireMissile();
        }, 500);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [gameOver, isFiring, mode, turn]);

  const drawScene = useCallback(
    (missileX: number | null, missileY: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Sky background
      ctx.fillStyle = '#0a0c16';
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 97) % w;
        const sy = (i * 43) % (h * 0.4);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Terrain
      ctx.beginPath();
      ctx.moveTo(0, h);
      terrainRef.current.forEach((ty, tx) => {
        ctx.lineTo(tx, ty);
      });
      ctx.lineTo(w, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, h * 0.4, 0, h);
      grad.addColorStop(0, '#1a2238');
      grad.addColorStop(1, '#0e1220');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Tanks
      tanks.forEach((tank) => {
        // Tank Body
        ctx.save();
        ctx.fillStyle = tank.color;
        ctx.shadowColor = tank.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(tank.x - 14, tank.y - 8, 28, 12, 4);
        ctx.fill();

        // Tank Turret / Barrel
        const rad = (tank.angle * Math.PI) / 180;
        const barrelLen = 16;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(tank.x, tank.y - 6);
        ctx.lineTo(tank.x + Math.cos(rad) * barrelLen, tank.y - 6 - Math.sin(rad) * barrelLen);
        ctx.stroke();

        // Health bar above tank
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(tank.x - 18, tank.y - 24, 36, 5);
        ctx.fillStyle = tank.health > 40 ? '#10b981' : '#f43f5e';
        ctx.fillRect(tank.x - 18, tank.y - 24, (36 * tank.health) / 100, 5);
        ctx.restore();
      });

      // Draw Missile
      if (missileX !== null && missileY !== null) {
        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(missileX, missileY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    [tanks]
  );

  useEffect(() => {
    drawScene(null, null);
  }, [drawScene]);

  const resetGame = () => {
    const canvas = canvasRef.current;
    if (canvas) generateTerrain(canvas.width, canvas.height);
    setTurn(0);
    setIsFiring(false);
    setGameOver(false);
    setWinner(null);
  };

  const activeTank = tanks[turn];

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setMode('ai');
              resetGame();
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
              resetGame();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
              mode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Canvas Battlefield */}
        <div className="w-full rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-[#0a0c16] relative aspect-[5/3] max-w-[500px]">
          <canvas ref={canvasRef} width={500} height={300} className="w-full h-full block" />
        </div>

        {/* Tank Controls Panel */}
        <div className="w-full max-w-[500px] mt-4 bg-[#121422] border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: activeTank.color }}
              />
              <span className="text-sm font-bold text-white">
                {turn === 0 ? 'Tank 1 (Purple)' : mode === 'ai' ? 'Tank 2 (AI)' : 'Tank 2 (Red)'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-emerald-400">P1 HP: {tanks[0].health}%</span>
              <span className="text-rose-400">P2 HP: {tanks[1].health}%</span>
            </div>
          </div>

          {/* Sliders for Angle & Power */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Angle */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Angle</span>
                <span className="text-white font-bold">{activeTank.angle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={activeTank.angle}
                disabled={isFiring || gameOver || (mode === 'ai' && turn === 1)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTanks((prev) => {
                    const next = [...prev];
                    next[turn].angle = val;
                    return next;
                  });
                }}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>

            {/* Power */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Power</span>
                <span className="text-white font-bold">{activeTank.power}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={activeTank.power}
                disabled={isFiring || gameOver || (mode === 'ai' && turn === 1)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTanks((prev) => {
                    const next = [...prev];
                    next[turn].power = val;
                    return next;
                  });
                }}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Fire Button */}
          <button
            onClick={fireMissile}
            disabled={isFiring || gameOver || (mode === 'ai' && turn === 1)}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-violet-600/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Crosshair className="w-4 h-4" />
            <span>{isFiring ? 'Missile in Flight...' : 'FIRE!'}</span>
          </button>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="Battle Won!"
        message={`${winner} destroyed the opposing artillery!`}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
