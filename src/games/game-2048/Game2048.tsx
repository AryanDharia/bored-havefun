import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

type Board = number[][];

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: 'bg-slate-800 text-slate-100', text: 'text-slate-100' },
  4: { bg: 'bg-slate-700 text-white', text: 'text-white' },
  8: { bg: 'bg-amber-600 text-white', text: 'text-white' },
  16: { bg: 'bg-orange-600 text-white', text: 'text-white' },
  32: { bg: 'bg-rose-600 text-white', text: 'text-white' },
  64: { bg: 'bg-red-600 text-white', text: 'text-white' },
  128: { bg: 'bg-yellow-500 text-slate-900', text: 'text-slate-900' },
  256: { bg: 'bg-yellow-400 text-slate-900', text: 'text-slate-900' },
  512: { bg: 'bg-emerald-500 text-white', text: 'text-white' },
  1024: { bg: 'bg-teal-500 text-white', text: 'text-white' },
  2048: { bg: 'bg-violet-600 text-white ring-4 ring-yellow-400', text: 'text-white' },
};

export const Game2048: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === '2048')!;

  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getHighScore('2048'));
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  function initBoard(): Board {
    let b = Array.from({ length: 4 }, () => Array(4).fill(0));
    b = addRandomTile(b);
    b = addRandomTile(b);
    return b;
  }

  function addRandomTile(b: Board): Board {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return b;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const newBoard = b.map((row) => [...row]);
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  // Slide & Merge Row logic
  const slideRow = (row: number[]): { newRow: number[]; gained: number } => {
    let filtered = row.filter((val) => val !== 0);
    let gained = 0;
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        gained += filtered[i];
        filtered.splice(i + 1, 1);
      }
    }
    while (filtered.length < 4) {
      filtered.push(0);
    }
    return { newRow: filtered, gained };
  };

  const moveLeft = (b: Board) => {
    let changed = false;
    let gainedTotal = 0;
    const newBoard: Board = [];

    for (let r = 0; r < 4; r++) {
      const { newRow, gained } = slideRow(b[r]);
      gainedTotal += gained;
      if (newRow.some((val, c) => val !== b[r][c])) changed = true;
      newBoard.push(newRow);
    }

    return { newBoard, changed, gainedTotal };
  };

  const rotateClockwise = (b: Board): Board => {
    const res: Board = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        res[c][3 - r] = b[r][c];
      }
    }
    return res;
  };

  const move = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => {
      if (gameOver) return;

      let b = board;
      let rotations = 0;
      if (dir === 'up') rotations = 3;
      if (dir === 'right') rotations = 2;
      if (dir === 'down') rotations = 1;

      for (let i = 0; i < rotations; i++) b = rotateClockwise(b);

      const { newBoard: slid, changed, gainedTotal } = moveLeft(b);

      let finalBoard = slid;
      for (let i = 0; i < (4 - rotations) % 4; i++) {
        finalBoard = rotateClockwise(finalBoard);
      }

      if (changed) {
        sounds.playMove();
        if (gainedTotal > 0) sounds.playScore();

        const withNewTile = addRandomTile(finalBoard);
        setBoard(withNewTile);
        const newScore = score + gainedTotal;
        setScore(newScore);

        const isNew = saveHighScore('2048', newScore);
        if (isNew) {
          setIsNewHigh(true);
          setHighScore(newScore);
        }

        // Check if game over
        if (checkGameOver(withNewTile)) {
          sounds.playGameOver();
          setGameOver(true);
        }
      }
    },
    [board, gameOver, score]
  );

  const checkGameOver = (b: Board): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) return false;
        if (r < 3 && b[r][c] === b[r + 1][c]) return false;
        if (c < 3 && b[r][c] === b[r][c + 1]) return false;
      }
    }
    return true;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move('left');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move('right');
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') move('up');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') move('down');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  // Touch Swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx > 0) move('right');
      else move('left');
    } else if (Math.abs(dy) > 30) {
      if (dy > 0) move('down');
      else move('up');
    }
  };

  const restartGame = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setIsNewHigh(false);
  };

  return (
    <GameLayout game={gameInfo} score={score} onRestart={restartGame}>
      <div className="w-full max-w-sm flex flex-col items-center select-none">
        {/* 4x4 Grid Container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full aspect-square max-w-[360px] bg-[#0d0f1a] p-3 rounded-3xl border-2 border-slate-800 shadow-2xl grid grid-cols-4 grid-rows-4 gap-2.5"
        >
          {board.map((row, r) =>
            row.map((val, c) => {
              const theme = TILE_COLORS[val] || { bg: 'bg-violet-700 text-white', text: 'text-white' };

              return (
                <div
                  key={`${r}-${c}`}
                  className={`rounded-2xl flex items-center justify-center font-black transition-all duration-150 select-none ${
                    val === 0
                      ? 'bg-[#151726]/60'
                      : `${theme.bg} shadow-md anim-pop`
                  } ${val >= 100 ? (val >= 1000 ? 'text-lg' : 'text-xl') : 'text-2xl'}`}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile / Screen Arrow D-Pad */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            onClick={() => move('up')}
            className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={() => move('left')}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => move('down')}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => move('right')}
              className="w-12 h-12 rounded-2xl bg-[#141726] active:bg-violet-600 border border-slate-800 flex items-center justify-center text-slate-200 shadow-lg"
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
        message="No more moves possible!"
        onRestart={restartGame}
      />
    </GameLayout>
  );
};
