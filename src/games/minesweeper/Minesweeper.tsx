import React, { useState, useEffect } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Flag, Bomb, Timer } from 'lucide-react';

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

const NUMBER_COLORS = [
  '',
  'text-blue-400',
  'text-emerald-400',
  'text-rose-400',
  'text-indigo-400',
  'text-amber-400',
  'text-teal-400',
  'text-fuchsia-400',
  'text-slate-400',
];

export const Minesweeper: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'minesweeper')!;

  const rows = 9;
  const cols = 9;
  const totalMines = 10;

  const [grid, setGrid] = useState<Cell[][]>(() => createEmptyGrid(rows, cols));
  const [firstClickDone, setFirstClickDone] = useState<boolean>(false);
  const [flagMode, setFlagMode] = useState<boolean>(false);
  const [flagsUsed, setFlagsUsed] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameWon, setGameWon] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('minesweeper'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [explodedCoord, setExplodedCoord] = useState<{ r: number; c: number } | null>(null);

  function createEmptyGrid(rLen: number, cLen: number): Cell[][] {
    return Array.from({ length: rLen }, (_, r) =>
      Array.from({ length: cLen }, (_, c) => ({
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      }))
    );
  }

  // Populate mines ensuring the clicked (safeR, safeC) has 0 mines around it
  const populateMines = (baseGrid: Cell[][], safeR: number, safeC: number): Cell[][] => {
    const newGrid = baseGrid.map((row) => row.map((cell) => ({ ...cell })));
    let placed = 0;

    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);

      // Safe zone around first click
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (!newGrid[r][c].isMine) {
        newGrid[r][c].isMine = true;
        placed++;
      }
    }

    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].isMine) {
                count++;
              }
            }
          }
          newGrid[r][c].neighborMines = count;
        }
      }
    }

    return newGrid;
  };

  // Timer
  useEffect(() => {
    if (!firstClickDone || gameOver) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [firstClickDone, gameOver]);

  // Flood fill reveal
  const revealCell = (r: number, c: number) => {
    if (gameOver) return;

    let currentGrid = grid;

    // First click safe setup
    if (!firstClickDone) {
      currentGrid = populateMines(grid, r, c);
      setFirstClickDone(true);
    }

    const cell = currentGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    // Clicked a mine!
    if (cell.isMine) {
      sounds.playHit();
      setIsShaking(true);
      setExplodedCoord({ r, c });
      setTimeout(() => setIsShaking(false), 500);

      // Reveal all mines
      const exploded = currentGrid.map((row) =>
        row.map((cl) => (cl.isMine ? { ...cl, isRevealed: true } : cl))
      );
      setGrid(exploded);
      setGameOver(true);
      setGameWon(false);
      return;
    }

    sounds.playMove();

    // BFS flood fill empty cells
    const nextGrid = currentGrid.map((row) => row.map((cl) => ({ ...cl })));
    const queue: [number, number][] = [[r, c]];
    nextGrid[r][c].isRevealed = true;

    while (queue.length > 0) {
      const [currR, currC] = queue.shift()!;
      const currCell = nextGrid[currR][currC];

      if (currCell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighbor = nextGrid[nr][nc];
              if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                neighbor.isRevealed = true;
                if (neighbor.neighborMines === 0) {
                  queue.push([nr, nc]);
                }
              }
            }
          }
        }
      }
    }

    setGrid(nextGrid);

    // Check Win
    let unrevealedSafe = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!nextGrid[row][col].isMine && !nextGrid[row][col].isRevealed) {
          unrevealedSafe++;
        }
      }
    }

    if (unrevealedSafe === 0) {
      // Victory!
      sounds.playWin();
      setGameOver(true);
      setGameWon(true);
      const score = Math.max(100, 1000 - seconds * 5);
      const wasNew = saveHighScore('minesweeper', score);
      if (wasNew) {
        setIsNewHigh(true);
        setHighScore(score);
      }
    }
  };

  const toggleFlag = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (gameOver || grid[r][c].isRevealed) return;

    sounds.playClick();
    const nextGrid = grid.map((row) => row.map((cl) => ({ ...cl })));
    const target = nextGrid[r][c];
    target.isFlagged = !target.isFlagged;
    setGrid(nextGrid);
    setFlagsUsed((prev) => (target.isFlagged ? prev + 1 : prev - 1));
  };

  const handleCellClick = (r: number, c: number) => {
    if (flagMode) {
      toggleFlag(r, c);
    } else {
      revealCell(r, c);
    }
  };

  const resetGame = () => {
    setGrid(createEmptyGrid(rows, cols));
    setFirstClickDone(false);
    setFlagsUsed(0);
    setSeconds(0);
    setGameOver(false);
    setGameWon(false);
    setIsNewHigh(false);
    setIsShaking(false);
    setExplodedCoord(null);
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <button
          onClick={() => setFlagMode(!flagMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            flagMode
              ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>{flagMode ? 'Flag Mode: ON' : 'Flag Mode: OFF'}</span>
        </button>
      }
    >
      <div className={`w-full max-w-sm flex flex-col items-center select-none ${isShaking ? 'anim-shake' : ''}`}>
        {/* Status Header */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-2 px-5 mb-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-rose-400">
            <Bomb className="w-4 h-4" />
            <span>Mines: {totalMines - flagsUsed}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span>{seconds}s</span>
          </div>
        </div>

        {/* 9x9 Board */}
        <div className="w-full aspect-square max-w-[360px] bg-[#0c0e18] p-2.5 rounded-3xl border-2 border-slate-800 shadow-2xl">
          <div className="grid grid-cols-9 grid-rows-9 w-full h-full rounded-2xl overflow-hidden border border-slate-700">
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isDirectExplosion = explodedCoord?.r === r && explodedCoord?.c === c;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onContextMenu={(e) => toggleFlag(r, c, e)}
                    disabled={cell.isRevealed && cell.neighborMines === 0}
                    className={`flex items-center justify-center font-black text-sm border border-slate-800/60 select-none transition-all duration-150 ${
                      cell.isRevealed
                        ? isDirectExplosion
                          ? 'bg-rose-600 text-white scale-110 z-10 shadow-lg shadow-rose-500/50 anim-pop'
                          : cell.isMine
                          ? 'bg-rose-950/80 text-rose-400'
                          : 'bg-[#151726]'
                        : 'bg-[#1a1d30] hover:bg-[#20243b] active:scale-95'
                    }`}
                  >
                    {cell.isRevealed ? (
                      cell.isMine ? (
                        <span className={isDirectExplosion ? 'text-lg' : ''}>💣</span>
                      ) : cell.neighborMines > 0 ? (
                        <span className={`${NUMBER_COLORS[cell.neighborMines]} anim-pop`}>
                          {cell.neighborMines}
                        </span>
                      ) : (
                        ''
                      )
                    ) : cell.isFlagged ? (
                      <span className="anim-pop">🚩</span>
                    ) : (
                      ''
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={gameWon ? '🎉 Minefield Cleared!' : '💥 Mine Exploded!'}
        score={gameWon ? Math.max(100, 1000 - seconds * 5) : 0}
        highScore={highScore}
        isNewHighScore={isNewHigh}
        message={gameWon ? `Cleared safely in ${seconds}s!` : 'Watch your step next time!'}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
