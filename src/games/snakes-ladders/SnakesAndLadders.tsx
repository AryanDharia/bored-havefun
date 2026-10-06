import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Dices, Sparkles, Bot, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LadderDef {
  start: number;
  end: number;
}

interface SnakeDef {
  head: number;
  tail: number;
}

const LADDERS: LadderDef[] = [
  { start: 4, end: 14 },
  { start: 9, end: 31 },
  { start: 20, end: 38 },
  { start: 28, end: 84 },
  { start: 40, end: 59 },
  { start: 51, end: 67 },
  { start: 63, end: 81 },
  { start: 71, end: 91 },
];

const SNAKES: SnakeDef[] = [
  { head: 17, tail: 7 },
  { head: 54, tail: 34 },
  { head: 62, tail: 19 },
  { head: 64, tail: 60 },
  { head: 87, tail: 24 },
  { head: 93, tail: 73 },
  { head: 95, tail: 75 },
  { head: 99, tail: 78 },
];

const PLAYER_COLORS = [
  { name: 'Red', bg: 'bg-rose-500', hex: '#f43f5e', border: 'border-rose-400' },
  { name: 'Blue', bg: 'bg-sky-500', hex: '#0284c7', border: 'border-sky-400' },
  { name: 'Green', bg: 'bg-emerald-500', hex: '#10b981', border: 'border-emerald-400' },
  { name: 'Yellow', bg: 'bg-amber-400', hex: '#f59e0b', border: 'border-amber-300' },
];

// Helper to convert square (1 to 100) to percentage coordinates on board (0% to 100%)
function getSquareCoords(sq: number): { x: number; y: number } {
  if (sq <= 0) return { x: 5, y: 105 }; // Start dock outside board
  const row = Math.floor((sq - 1) / 10); // 0 (bottom) to 9 (top)
  const colIndex = (sq - 1) % 10;
  // Zigzag order: even row (from bottom) left-to-right, odd row right-to-left
  const col = row % 2 === 0 ? colIndex : 9 - colIndex;

  const x = col * 10 + 5;
  const y = (9 - row) * 10 + 5;
  return { x, y };
}

// Dice Pips representation
const DICE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export const SnakesAndLadders: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'snakes-and-ladders')!;

  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [positions, setPositions] = useState<number[]>([0, 0, 0, 0]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);

  // Dice roll animation state
  const [displayedDice, setDisplayedDice] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // Active highlighted snake/ladder
  const [highlightedLadder, setHighlightedLadder] = useState<number | null>(null);
  const [highlightedSnake, setHighlightedSnake] = useState<number | null>(null);

  const [gameLog, setGameLog] = useState<string>('Press Roll Dice to start your adventure!');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<number | null>(null);

  const isLockedRef = useRef(false);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const isCurrentPlayerAI = useCallback(() => {
    return mode === 'ai' && currentTurn !== 0;
  }, [mode, currentTurn]);

  const nextTurn = useCallback(() => {
    setCurrentTurn((prev) => (prev + 1) % playerCount);
  }, [playerCount]);

  const executeMovement = useCallback(async (roll: number) => {
    setIsMoving(true);
    const playerIdx = currentTurn;
    const startPos = positions[playerIdx];
    const isBot = mode === 'ai' && playerIdx !== 0;
    const pName = `${PLAYER_COLORS[playerIdx].name}${isBot ? ' (Bot)' : ''}`;

    const targetPos = startPos + roll;

    // Exact roll required to reach 100
    if (targetPos > 100) {
      setGameLog(`Player ${pName} rolled a ${roll} but needs an exact roll to land on 100.`);
      await delay(700);
      setIsMoving(false);
      nextTurn();
      return;
    }

    setGameLog(`Player ${pName} rolled ${roll}! Moving...`);

    // Step-by-step token movement
    let currentStep = startPos;
    for (let i = 0; i < roll; i++) {
      currentStep++;
      setPositions((prev) => {
        const copy = [...prev];
        copy[playerIdx] = currentStep;
        return copy;
      });
      sounds.playMove();
      await delay(150);
    }

    // Check if landed on Ladder
    const ladderHit = LADDERS.find((l) => l.start === currentStep);
    if (ladderHit) {
      setHighlightedLadder(ladderHit.start);
      setGameLog(`🪜 LADDER! Player ${pName} climbed from ${ladderHit.start} to ${ladderHit.end}!`);
      sounds.playClimb();
      await delay(500);

      // Smooth climb
      setPositions((prev) => {
        const copy = [...prev];
        copy[playerIdx] = ladderHit.end;
        return copy;
      });
      await delay(500);
      setHighlightedLadder(null);
      currentStep = ladderHit.end;
    }

    // Check if landed on Snake
    const snakeHit = SNAKES.find((s) => s.head === currentStep);
    if (snakeHit) {
      setHighlightedSnake(snakeHit.head);
      setGameLog(`🐍 SNAKE! Player ${pName} swallowed from ${snakeHit.head} down to ${snakeHit.tail}!`);
      sounds.playSlide();
      await delay(500);

      // Smooth slide down
      setPositions((prev) => {
        const copy = [...prev];
        copy[playerIdx] = snakeHit.tail;
        return copy;
      });
      await delay(500);
      setHighlightedSnake(null);
      currentStep = snakeHit.tail;
    }

    // Check Win
    if (currentStep === 100) {
      setGameOver(true);
      setWinner(playerIdx);
      sounds.playWin();
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      } catch {
        // Fallback
      }
      setIsMoving(false);
      return;
    }

    setIsMoving(false);
    nextTurn();
  }, [currentTurn, positions, mode, nextTurn]);

  const handleRollDice = useCallback(async () => {
    if (isRolling || isMoving || gameOver || isLockedRef.current) return;
    isLockedRef.current = true;
    setIsRolling(true);
    sounds.playDice();

    // 1. Tumble dice visually for ~750ms
    const rollStart = Date.now();
    let interim = 1;
    while (Date.now() - rollStart < 750) {
      interim = Math.floor(Math.random() * 6) + 1;
      setDisplayedDice(interim);
      await delay(70);
    }

    // 2. Determine actual final roll
    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDisplayedDice(finalRoll);
    setIsRolling(false);
    sounds.playClick();

    // 3. Process movement
    await executeMovement(finalRoll);
    isLockedRef.current = false;
  }, [isRolling, isMoving, gameOver, executeMovement]);

  // Automated AI turn trigger
  useEffect(() => {
    if (gameOver || isRolling || isMoving) return;
    if (isCurrentPlayerAI()) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, gameOver, isRolling, isMoving, isCurrentPlayerAI, handleRollDice]);

  const resetGame = () => {
    setPositions([0, 0, 0, 0]);
    setCurrentTurn(0);
    setDisplayedDice(1);
    setIsRolling(false);
    setIsMoving(false);
    setHighlightedLadder(null);
    setHighlightedSnake(null);
    setGameLog('Game reset. Roll the dice to begin!');
    setGameOver(false);
    setWinner(null);
    isLockedRef.current = false;
  };

  // Generate 100 tiles array in zigzag order for grid layout
  const cells: number[] = [];
  for (let r = 9; r >= 0; r--) {
    const rowCells: number[] = [];
    for (let c = 1; c <= 10; c++) {
      rowCells.push(r * 10 + c);
    }
    if (r % 2 === 1) rowCells.reverse();
    cells.push(...rowCells);
  }

  const activeColor = PLAYER_COLORS[currentTurn];
  const isAITurn = isCurrentPlayerAI();

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch: vs AI or PvP */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setMode('ai');
                resetGame();
              }}
              disabled={isRolling || isMoving}
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
              disabled={isRolling || isMoving}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                mode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pass & Play</span>
            </button>
          </div>

          {/* Player Count */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setPlayerCount(cnt);
                  resetGame();
                }}
                disabled={isRolling || isMoving}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40 ${
                  playerCount === cnt ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cnt}P
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="w-full max-w-xl flex flex-col items-center select-none px-2 sm:px-4">
        {/* Turn, 3D Dice & Action Bar */}
        <div className="w-full flex items-center justify-between bg-[#121422] border border-slate-800 rounded-3xl py-3 px-5 mb-4 shadow-xl">
          {/* Active Player */}
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full ${activeColor.bg} ring-4 ring-white/20 shadow-lg flex items-center justify-center text-xs font-black text-white relative`}
            >
              P{currentTurn + 1}
              {isAITurn && (
                <span className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 text-[9px] rounded-full px-1">
                  🤖
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Turn</span>
              <p className={`text-sm font-extrabold flex items-center gap-1.5 ${activeColor.bg.replace('bg-', 'text-')}`}>
                <span>Player {activeColor.name}</span>
                {isAITurn ? (
                  <span className="text-[11px] font-semibold text-slate-400">(Bot)</span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-400">(You)</span>
                )}
              </p>
            </div>
          </div>

          {/* Realistic 3D Tumbling Dice Box */}
          <div className="flex items-center gap-3">
            <div
              className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-slate-200 border-2 border-slate-300 shadow-xl flex items-center justify-center transition-transform ${
                isRolling ? 'anim-dice-spin shadow-violet-500/50' : 'hover:scale-105'
              }`}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
                {DICE_PIPS[displayedDice]?.map(([cx, cy], idx) => (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={8.5}
                    fill={displayedDice === 1 ? '#e11d48' : '#0f172a'}
                  />
                ))}
              </svg>
            </div>

            {/* Roll Dice Button */}
            <button
              onClick={handleRollDice}
              disabled={isRolling || isMoving || gameOver || isAITurn}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2"
            >
              <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
              <span>
                {isRolling ? 'Rolling...' : isMoving ? 'Moving...' : isAITurn ? 'Bot Rolling...' : 'Roll Dice'}
              </span>
            </button>
          </div>
        </div>

        {/* 10x10 Illustrated Board with Real Visible Snakes & Ladders */}
        <div className="relative w-full aspect-square max-w-[440px] bg-[#0c0e18] p-3 rounded-3xl border-2 border-slate-700 shadow-2xl overflow-hidden">
          {/* Tiles Grid */}
          <div className="grid grid-cols-10 grid-rows-10 w-full h-full rounded-2xl overflow-hidden border border-slate-800">
            {cells.map((num) => {
              const isGoal = num === 100;
              const isStart = num === 1;

              return (
                <div
                  key={num}
                  className={`relative flex items-center justify-center border border-slate-800/40 select-none ${
                    isGoal
                      ? 'bg-gradient-to-br from-amber-600/40 to-yellow-500/20'
                      : isStart
                      ? 'bg-gradient-to-br from-emerald-600/40 to-teal-500/20'
                      : num % 2 === 0
                      ? 'bg-[#121422]'
                      : 'bg-[#181a2c]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-bold ${
                      isGoal ? 'text-amber-300 font-black' : 'text-slate-500'
                    }`}
                  >
                    {num}
                  </span>

                  {isGoal && (
                    <span className="text-xs" title="100 - Winner Goal!">
                      🏆
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* SVG Overlay: REAL VISIBLE LADDERS AND CURVY SNAKES */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none p-3"
            viewBox="0 0 100 100"
          >
            <defs>
              {/* Snake skin gradient */}
              <linearGradient id="slSnakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="slGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. DRAW ACTUAL LADDERS (Rails and Rungs) */}
            {LADDERS.map((lad, idx) => {
              const start = getSquareCoords(lad.start);
              const end = getSquareCoords(lad.end);
              const isLit = highlightedLadder === lad.start;

              // Calculate perpendicular offset for two rails
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const len = Math.hypot(dx, dy);
              const offX = (-dy / len) * 1.5;
              const offY = (dx / len) * 1.5;

              // Rungs along the ladder
              const rungCount = Math.max(3, Math.floor(len / 6));
              const rungs = [];
              for (let r = 1; r < rungCount; r++) {
                const t = r / rungCount;
                const rx = start.x + dx * t;
                const ry = start.y + dy * t;
                rungs.push({
                  x1: rx - offX,
                  y1: ry - offY,
                  x2: rx + offX,
                  y2: ry + offY,
                });
              }

              return (
                <g
                  key={`ladder-${idx}`}
                  filter={isLit ? 'url(#slGlow)' : undefined}
                  className={`transition-opacity duration-300 ${isLit ? 'opacity-100' : 'opacity-85'}`}
                >
                  {/* Left Rail */}
                  <line
                    x1={start.x - offX}
                    y1={start.y - offY}
                    x2={end.x - offX}
                    y2={end.y - offY}
                    stroke={isLit ? '#fbbf24' : '#d97706'}
                    strokeWidth={isLit ? 1.6 : 1.2}
                    strokeLinecap="round"
                  />
                  {/* Right Rail */}
                  <line
                    x1={start.x + offX}
                    y1={start.y + offY}
                    x2={end.x + offX}
                    y2={end.y + offY}
                    stroke={isLit ? '#fbbf24' : '#d97706'}
                    strokeWidth={isLit ? 1.6 : 1.2}
                    strokeLinecap="round"
                  />
                  {/* Ladder Rungs */}
                  {rungs.map((rg, rIdx) => (
                    <line
                      key={rIdx}
                      x1={rg.x1}
                      y1={rg.y1}
                      x2={rg.x2}
                      y2={rg.y2}
                      stroke={isLit ? '#fde68a' : '#b45309'}
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            })}

            {/* 2. DRAW ACTUAL CURVY SNAKES (Body path, Head, Tongue, and Eyes) */}
            {SNAKES.map((snk, idx) => {
              const head = getSquareCoords(snk.head);
              const tail = getSquareCoords(snk.tail);
              const isLit = highlightedSnake === snk.head;

              // Curvy bezier path
              const midX = (head.x + tail.x) / 2 + (idx % 2 === 0 ? 9 : -9);
              const midY = (head.y + tail.y) / 2;
              const pathD = `M ${head.x} ${head.y} Q ${midX} ${midY} ${tail.x} ${tail.y}`;

              return (
                <g
                  key={`snake-${idx}`}
                  filter={isLit ? 'url(#slGlow)' : undefined}
                  className={`transition-opacity duration-300 ${isLit ? 'opacity-100' : 'opacity-90'}`}
                >
                  {/* Snake Body shadow */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#000000"
                    strokeWidth={isLit ? 3.8 : 3.0}
                    strokeLinecap="round"
                    opacity={0.4}
                  />
                  {/* Snake Body */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isLit ? '#ec4899' : 'url(#slSnakeGrad)'}
                    strokeWidth={isLit ? 3.0 : 2.4}
                    strokeLinecap="round"
                  />
                  {/* Snake Scales accent */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth={0.8}
                    strokeDasharray="1.5, 2.5"
                    strokeLinecap="round"
                  />
                  {/* Snake Head */}
                  <circle
                    cx={head.x}
                    cy={head.y}
                    r={isLit ? 3.2 : 2.6}
                    fill={isLit ? '#f43f5e' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth={0.6}
                  />
                  {/* Snake Eyes */}
                  <circle cx={head.x - 0.9} cy={head.y - 0.7} r={0.6} fill="#ffffff" />
                  <circle cx={head.x + 0.9} cy={head.y - 0.7} r={0.6} fill="#ffffff" />
                  <circle cx={head.x - 0.9} cy={head.y - 0.7} r={0.3} fill="#000000" />
                  <circle cx={head.x + 0.9} cy={head.y - 0.7} r={0.3} fill="#000000" />
                </g>
              );
            })}

            {/* 3. DRAW ANIMATED PLAYER TOKENS (Smooth moving beads) */}
            {positions.slice(0, playerCount).map((pos, pIdx) => {
              const coords = getSquareCoords(pos);
              // Slight offset when multiple players are on the same square
              const offset = pIdx * 1.6 - (playerCount - 1) * 0.8;

              return (
                <g
                  key={`token-${pIdx}`}
                  className="transition-all duration-150 ease-out"
                  transform={`translate(${coords.x + offset}, ${coords.y})`}
                >
                  {/* Token Glow */}
                  <circle
                    cx={0}
                    cy={0}
                    r={3.8}
                    fill={PLAYER_COLORS[pIdx].hex}
                    filter="url(#slGlow)"
                    opacity={0.7}
                  />
                  {/* Token Body */}
                  <circle
                    cx={0}
                    cy={0}
                    r={2.8}
                    fill={PLAYER_COLORS[pIdx].hex}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                  {/* Highlight */}
                  <circle cx={-0.8} cy={-0.8} r={0.9} fill="#ffffff" opacity={0.6} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Game Feedback Log */}
        <div className="w-full mt-4 bg-[#121422] border border-slate-800 rounded-2xl px-5 py-3 text-center text-xs text-slate-300 font-semibold shadow-inner flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{gameLog}</span>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={`🎉 Player ${winner !== null ? PLAYER_COLORS[winner].name : ''} Won!`}
        message={
          mode === 'ai' && winner !== 0
            ? 'The Bot outsmarted the board! Try another round?'
            : 'Master of the board! Reached square 100 first!'
        }
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
