import React, { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

const COLS = 7;
const ROWS = 6;
type Cell = 'R' | 'Y' | null; // Red (Player 1) vs Yellow (Player 2 / AI)
type Mode = 'ai' | 'pvp';

interface DroppingAnimation {
  col: number;
  targetRow: number;
  color: 'R' | 'Y';
}

export const ConnectFour: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'connect-four')!;

  const [board, setBoard] = useState<Cell[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<'R' | 'Y'>('R');
  const [mode, setMode] = useState<Mode>('ai');
  const [scores, setScores] = useState({ r: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'R' | 'Y' | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);

  // Hover & Drop Animation States
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [animatingDrop, setAnimatingDrop] = useState<DroppingAnimation | null>(null);
  const isDroppingRef = useRef(false);

  // Check 4-in-a-row in all directions
  const checkWin = (b: Cell[][]): { winner: 'R' | 'Y' | 'draw' | null; cells: [number, number][] } => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = b[r][c];
        if (val && val === b[r][c + 1] && val === b[r][c + 2] && val === b[r][c + 3]) {
          return { winner: val, cells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
        }
      }
    }

    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = b[r][c];
        if (val && val === b[r + 1][c] && val === b[r + 2][c] && val === b[r + 3][c]) {
          return { winner: val, cells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
        }
      }
    }

    // Diagonal positive slope
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = b[r][c];
        if (val && val === b[r - 1][c + 1] && val === b[r - 2][c + 2] && val === b[r - 3][c + 3]) {
          return { winner: val, cells: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] };
        }
      }
    }

    // Diagonal negative slope
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = b[r][c];
        if (val && val === b[r + 1][c + 1] && val === b[r + 2][c + 2] && val === b[r + 3][c + 3]) {
          return { winner: val, cells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
        }
      }
    }

    // Full board draw check
    const isFull = b[0].every((cell) => cell !== null);
    if (isFull) {
      return { winner: 'draw', cells: [] };
    }

    return { winner: null, cells: [] };
  };

  // Find lowest free row in column
  const getLowestFreeRow = (col: number, b: Cell[][]): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b[r][col]) return r;
    }
    return -1;
  };

  const handleDropPiece = async (col: number, currentTurn: 'R' | 'Y') => {
    if (gameOver || isDroppingRef.current) return;
    const targetRow = getLowestFreeRow(col, board);
    if (targetRow === -1) return; // Column full

    isDroppingRef.current = true;
    sounds.playMove();

    // Start falling piece animation
    setAnimatingDrop({ col, targetRow, color: currentTurn });

    // Duration matches drop bounce (~380ms)
    await new Promise((res) => setTimeout(res, 380));

    sounds.playHit(); // Tactile landing thud
    setAnimatingDrop(null);

    const nextBoard = board.map((row) => [...row]);
    nextBoard[targetRow][col] = currentTurn;
    setBoard(nextBoard);

    const winResult = checkWin(nextBoard);
    if (winResult.winner) {
      setWinner(winResult.winner);
      setWinningCells(winResult.cells);
      setGameOver(true);
      if (winResult.winner === 'R') {
        sounds.playWin();
        setScores((prev) => ({ ...prev, r: prev.r + 1 }));
      } else if (winResult.winner === 'Y') {
        sounds.playWin();
        setScores((prev) => ({ ...prev, y: prev.y + 1 }));
      }
    } else {
      setTurn(currentTurn === 'R' ? 'Y' : 'R');
    }

    isDroppingRef.current = false;
  };

  const handleColumnClick = (col: number) => {
    if (gameOver || isDroppingRef.current || (mode === 'ai' && turn === 'Y')) return;
    handleDropPiece(col, turn);
  };

  // AI Logic
  useEffect(() => {
    if (mode === 'ai' && turn === 'Y' && !gameOver && !isDroppingRef.current) {
      const timer = setTimeout(() => {
        // AI Heuristic:
        // 1. Can AI win in 1 move?
        for (let c = 0; c < COLS; c++) {
          const r = getLowestFreeRow(c, board);
          if (r !== -1) {
            const test = board.map((row) => [...row]);
            test[r][c] = 'Y';
            if (checkWin(test).winner === 'Y') {
              handleDropPiece(c, 'Y');
              return;
            }
          }
        }

        // 2. Can player win? Block them!
        for (let c = 0; c < COLS; c++) {
          const r = getLowestFreeRow(c, board);
          if (r !== -1) {
            const test = board.map((row) => [...row]);
            test[r][c] = 'R';
            if (checkWin(test).winner === 'R') {
              handleDropPiece(c, 'Y');
              return;
            }
          }
        }

        // 3. Prefer center columns
        const columnOrder = [3, 2, 4, 1, 5, 0, 6];
        for (const c of columnOrder) {
          if (!board[0][c]) {
            handleDropPiece(c, 'Y');
            return;
          }
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, gameOver, mode, turn]);

  const resetBoard = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setTurn('R');
    setGameOver(false);
    setWinner(null);
    setWinningCells([]);
    setAnimatingDrop(null);
    isDroppingRef.current = false;
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetBoard}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setMode('ai');
              resetBoard();
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
              resetBoard();
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
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Turn indicator */}
        <div className="flex items-center gap-5 mb-3 bg-[#121422] px-6 py-2.5 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-full transition-all ${
                turn === 'R'
                  ? 'bg-rose-500 shadow-lg shadow-rose-500/60 scale-125 ring-2 ring-white/50'
                  : 'bg-slate-700 opacity-50'
              }`}
            />
            <span className={`text-xs font-extrabold ${turn === 'R' ? 'text-white' : 'text-slate-400'}`}>
              Red (P1)
            </span>
          </div>

          <span className="text-slate-600 font-bold">vs</span>

          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-full transition-all ${
                turn === 'Y'
                  ? 'bg-amber-400 shadow-lg shadow-amber-400/60 scale-125 ring-2 ring-white/50'
                  : 'bg-slate-700 opacity-50'
              }`}
            />
            <span className={`text-xs font-extrabold ${turn === 'Y' ? 'text-white' : 'text-slate-400'}`}>
              {mode === 'ai' ? 'Yellow (AI)' : 'Yellow (P2)'}
            </span>
          </div>
        </div>

        {/* Floating Preview Area Above Columns */}
        <div className="w-full max-w-[440px] px-4 h-10 flex items-center mb-1">
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5 w-full">
            {Array.from({ length: COLS }).map((_, c) => {
              const isHovered = hoveredCol === c && !gameOver && !board[0][c] && (!mode || mode === 'pvp' || turn === 'R');

              return (
                <div key={c} className="flex justify-center items-center h-8">
                  {isHovered && (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg transition-transform animate-bounce ${
                        turn === 'R'
                          ? 'bg-gradient-to-tr from-rose-600 to-red-400 shadow-rose-500/50'
                          : 'bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-amber-500/50'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3D Slotted Board Container */}
        <div
          className="relative w-full max-w-[440px] bg-gradient-to-b from-blue-700 to-blue-900 border-4 border-blue-600 rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-md"
          onMouseLeave={() => setHoveredCol(null)}
        >
          {/* Column Click Trigger Buttons */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {Array.from({ length: COLS }).map((_, col) => (
              <button
                key={col}
                onClick={() => handleColumnClick(col)}
                onMouseEnter={() => setHoveredCol(col)}
                disabled={gameOver || (mode === 'ai' && turn === 'Y') || !!board[0][col]}
                aria-label={`Drop disc in column ${col + 1}`}
                className="w-full py-1 text-center text-xs font-black text-blue-200 hover:text-white hover:bg-blue-600/50 rounded-xl transition-all disabled:opacity-0 active:scale-90"
              >
                ▼
              </button>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-rows-6 gap-2 sm:gap-2.5">
            {board.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-7 gap-2 sm:gap-2.5">
                {row.map((cell, cIdx) => {
                  const isWinning = winningCells.some(([wr, wc]) => wr === rIdx && wc === cIdx);
                  const isDroppingHere =
                    animatingDrop && animatingDrop.col === cIdx && animatingDrop.targetRow === rIdx;

                  return (
                    <div
                      key={cIdx}
                      onClick={() => handleColumnClick(cIdx)}
                      onMouseEnter={() => setHoveredCol(cIdx)}
                      className="aspect-square rounded-full bg-[#070914] flex items-center justify-center cursor-pointer shadow-inner relative overflow-hidden group"
                    >
                      {/* Falling Animated Piece */}
                      {isDroppingHere && (
                        <div
                          className={`w-[86%] h-[86%] rounded-full shadow-2xl anim-drop-bounce ${
                            animatingDrop.color === 'R'
                              ? 'bg-gradient-to-tr from-rose-600 to-red-400 shadow-rose-600/50'
                              : 'bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-amber-500/50'
                          }`}
                        />
                      )}

                      {/* Placed Disc */}
                      {!isDroppingHere && cell && (
                        <div
                          className={`w-[86%] h-[86%] rounded-full shadow-lg transition-transform ${
                            cell === 'R'
                              ? 'bg-gradient-to-tr from-rose-600 to-red-400 shadow-rose-600/40'
                              : 'bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-amber-500/40'
                          } ${
                            isWinning
                              ? 'anim-pulse-glow ring-4 ring-yellow-300 shadow-yellow-400/80 scale-105'
                              : 'anim-pop'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Score indicator */}
        <div className="flex items-center gap-8 mt-5 text-xs text-slate-400 font-semibold bg-[#121422] px-6 py-2 rounded-xl border border-slate-800">
          <div>Red Wins: <span className="font-extrabold text-white text-sm">{scores.r}</span></div>
          <div>Yellow Wins: <span className="font-extrabold text-white text-sm">{scores.y}</span></div>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={
          winner === 'draw'
            ? 'Stalemate Draw!'
            : winner === 'R'
            ? '🎉 Red Wins!'
            : mode === 'ai'
            ? 'Yellow (AI) Wins!'
            : '🎉 Yellow Wins!'
        }
        message="4 connected discs in a row!"
        onRestart={resetBoard}
      />
    </GameLayout>
  );
};
