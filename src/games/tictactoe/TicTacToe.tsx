import React, { useState, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

type SquareValue = 'X' | 'O' | null;
type Mode = 'ai' | 'pvp';
type AIDifficulty = 'easy' | 'medium' | 'hard';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diags
];

export const TicTacToe: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'tic-tac-toe')!;
  
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [mode, setMode] = useState<Mode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [winningCombo, setWinningCombo] = useState<number[] | null>(null);
  
  // Scores
  const [scores, setScores] = useState({ x: 0, o: 0, draws: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null);

  const checkWinner = (squares: SquareValue[]): { winner: 'X' | 'O' | 'draw' | null; combo: number[] | null } => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a] as 'X' | 'O', combo };
      }
    }
    if (squares.every((sq) => sq !== null)) {
      return { winner: 'draw', combo: null };
    }
    return { winner: null, combo: null };
  };

  // Minimax for unbeatable Hard AI
  const minimax = (squares: SquareValue[], depth: number, isMaximizing: boolean): number => {
    const { winner: resWinner } = checkWinner(squares);
    if (resWinner === 'O') return 10 - depth;
    if (resWinner === 'X') return depth - 10;
    if (resWinner === 'draw') return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'O';
          const evalScore = minimax(squares, depth + 1, false);
          squares[i] = null;
          maxEval = Math.max(maxEval, evalScore);
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'X';
          const evalScore = minimax(squares, depth + 1, true);
          squares[i] = null;
          minEval = Math.min(minEval, evalScore);
        }
      }
      return minEval;
    }
  };

  const getBestMove = (squares: SquareValue[], diff: AIDifficulty): number => {
    const emptyIndices = squares
      .map((val, idx) => (val === null ? idx : null))
      .filter((v): v is number => v !== null);

    if (emptyIndices.length === 0) return -1;

    // Easy AI: purely random
    if (diff === 'easy') {
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // Medium AI: win or block immediately, otherwise random
    if (diff === 'medium') {
      // 1. Can AI win in one move?
      for (const idx of emptyIndices) {
        squares[idx] = 'O';
        if (checkWinner(squares).winner === 'O') {
          squares[idx] = null;
          return idx;
        }
        squares[idx] = null;
      }
      // 2. Can player win? Block them
      for (const idx of emptyIndices) {
        squares[idx] = 'X';
        if (checkWinner(squares).winner === 'X') {
          squares[idx] = null;
          return idx;
        }
        squares[idx] = null;
      }
      // 3. Take center if available
      if (squares[4] === null) return 4;
      // 4. Otherwise random
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // Hard AI: Full Minimax
    let bestVal = -Infinity;
    let bestMove = emptyIndices[0];

    for (const idx of emptyIndices) {
      squares[idx] = 'O';
      const moveVal = minimax(squares, 0, false);
      squares[idx] = null;
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = idx;
      }
    }
    return bestMove;
  };

  const handleSquareClick = useCallback(
    (index: number) => {
      if (board[index] || gameOver || (mode === 'ai' && turn === 'O')) return;

      const newBoard = [...board];
      newBoard[index] = turn;
      setBoard(newBoard);
      sounds.playMove();

      const result = checkWinner(newBoard);
      if (result.winner) {
        setWinner(result.winner);
        setWinningCombo(result.combo);
        setGameOver(true);
        if (result.winner === 'X') {
          setScores((prev) => ({ ...prev, x: prev.x + 1 }));
        } else if (result.winner === 'O') {
          setScores((prev) => ({ ...prev, o: prev.o + 1 }));
        } else {
          setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        }
      } else {
        setTurn(turn === 'X' ? 'O' : 'X');
      }
    },
    [board, gameOver, mode, turn]
  );

  // AI turn effect
  useEffect(() => {
    if (mode === 'ai' && turn === 'O' && !gameOver) {
      const timer = setTimeout(() => {
        const move = getBestMove(board, difficulty);
        if (move !== -1) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          sounds.playMove();

          const result = checkWinner(newBoard);
          if (result.winner) {
            setWinner(result.winner);
            setWinningCombo(result.combo);
            setGameOver(true);
            if (result.winner === 'O') {
              setScores((prev) => ({ ...prev, o: prev.o + 1 }));
            } else if (result.winner === 'draw') {
              setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
            }
          } else {
            setTurn('X');
          }
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [board, difficulty, gameOver, mode, turn]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinningCombo(null);
    setGameOver(false);
    setWinner(null);
  };

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Mode Switch */}
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
        </div>
      }
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Difficulty Pill for AI mode */}
        {mode === 'ai' && (
          <div className="flex items-center gap-1.5 mb-4 bg-[#121420] p-1 rounded-xl border border-slate-800 text-xs">
            {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  resetGame();
                }}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                  difficulty === d
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Turn & Status Card */}
        <div className="w-full flex items-center justify-between bg-[#121420] rounded-2xl border border-slate-800 px-5 py-3 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg transition-transform ${
                turn === 'X'
                  ? 'bg-violet-600/30 text-violet-400 border border-violet-500/50 scale-105'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              X
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Turn</span>
              <p className="text-sm font-bold text-white">
                {mode === 'ai' ? (turn === 'X' ? 'Your Turn' : 'AI Thinking...') : `Player ${turn}'s Turn`}
              </p>
            </div>
          </div>

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg transition-transform ${
              turn === 'O'
                ? 'bg-pink-600/30 text-pink-400 border border-pink-500/50 scale-105'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            O
          </div>
        </div>

        {/* 3x3 Game Board */}
        <div className={`grid grid-cols-3 gap-3 w-full aspect-square max-w-[340px] bg-[#10121d] p-3 rounded-3xl border border-slate-800/80 shadow-2xl ${winner === 'draw' ? 'anim-shake' : ''}`}>
          {board.map((cell, idx) => {
            const isWinningCell = winningCombo?.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleSquareClick(idx)}
                disabled={cell !== null || gameOver || (mode === 'ai' && turn === 'O')}
                aria-label={`Square ${idx + 1}, ${cell ? cell : 'empty'}`}
                className={`relative flex items-center justify-center rounded-2xl text-4xl sm:text-5xl font-black transition-all duration-200 select-none ${
                  isWinningCell
                    ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/70 ring-4 ring-yellow-400 scale-105 anim-pulse-glow z-10'
                    : cell
                    ? cell === 'X'
                      ? 'bg-[#181a29] text-violet-400 border border-violet-500/30'
                      : 'bg-[#181a29] text-pink-400 border border-pink-500/30'
                    : 'bg-[#151724] hover:bg-[#1c2033] border border-slate-800/80 active:scale-95'
                }`}
              >
                {cell && <span className="anim-pop inline-block">{cell}</span>}
              </button>
            );
          })}
        </div>

        {/* Score Board */}
        <div className="w-full grid grid-cols-3 gap-2 mt-6 text-center">
          <div className="bg-[#121420] border border-slate-800/80 rounded-xl py-2 px-3">
            <span className="text-[10px] uppercase font-bold text-violet-400">X (You)</span>
            <div className="text-xl font-black text-white">{scores.x}</div>
          </div>
          <div className="bg-[#121420] border border-slate-800/80 rounded-xl py-2 px-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Draws</span>
            <div className="text-xl font-black text-white">{scores.draws}</div>
          </div>
          <div className="bg-[#121420] border border-slate-800/80 rounded-xl py-2 px-3">
            <span className="text-[10px] uppercase font-bold text-pink-400">
              {mode === 'ai' ? 'O (AI)' : 'O (P2)'}
            </span>
            <div className="text-xl font-black text-white">{scores.o}</div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOver}
        title={
          winner === 'draw'
            ? "It's a Draw!"
            : winner === 'X'
            ? mode === 'ai'
              ? '🎉 You Won!'
              : '🎉 Player X Won!'
            : mode === 'ai'
            ? 'AI Won!'
            : '🎉 Player O Won!'
        }
        message={
          winner === 'draw'
            ? 'Evenly matched. Want another round?'
            : winner === 'X'
            ? 'Great strategy!'
            : 'Better luck next match!'
        }
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
