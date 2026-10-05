import React, { useState, useEffect } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users, Crown } from 'lucide-react';

type PieceType = 'R' | 'RK' | 'B' | 'BK' | null; // Red (P1/bottom) vs Black (P2/AI/top), K = King
type PieceColor = 'red' | 'black';

interface Move {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  isJump: boolean;
  jumpR?: number;
  jumpC?: number;
}

export const Checkers: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'checkers')!;

  const [board, setBoard] = useState<PieceType[][]>(() => initCheckersBoard());
  const [turn, setTurn] = useState<PieceColor>('red');
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | null>(null);

  function initCheckersBoard(): PieceType[][] {
    const b: PieceType[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = 'B';
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) b[r][c] = 'R';
      }
    }
    return b;
  }

  // Find all possible legal moves for a given piece or whole board
  const getMovesForPiece = (b: PieceType[][], r: number, c: number): Move[] => {
    const piece = b[r][c];
    if (!piece) return [];

    const isRed = piece === 'R' || piece === 'RK';
    const isKing = piece === 'RK' || piece === 'BK';

    const directions: [number, number][] = [];
    if (isRed || isKing) directions.push([-1, -1], [-1, 1]); // Red moves upwards
    if (!isRed || isKing) directions.push([1, -1], [1, 1]);  // Black moves downwards

    const moves: Move[] = [];

    // Simple steps
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === null) {
        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, isJump: false });
      }
    }

    // Jumps (captures)
    for (const [dr, dc] of directions) {
      const midR = r + dr;
      const midC = c + dc;
      const landR = r + dr * 2;
      const landC = c + dc * 2;

      if (
        landR >= 0 && landR < 8 &&
        landC >= 0 && landC < 8 &&
        b[landR][landC] === null
      ) {
        const midPiece = b[midR][midC];
        if (midPiece) {
          const midIsRed = midPiece === 'R' || midPiece === 'RK';
          if (midIsRed !== isRed) {
            moves.push({
              fromR: r,
              fromC: c,
              toR: landR,
              toC: landC,
              isJump: true,
              jumpR: midR,
              jumpC: midC,
            });
          }
        }
      }
    }

    return moves;
  };

  const getAllMovesForColor = (b: PieceType[][], color: PieceColor): Move[] => {
    let allMoves: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (piece) {
          const pieceColor = (piece === 'R' || piece === 'RK') ? 'red' : 'black';
          if (pieceColor === color) {
            allMoves = allMoves.concat(getMovesForPiece(b, r, c));
          }
        }
      }
    }
    // Checkers rule: if any capture/jump is available, captures are prioritized
    const jumps = allMoves.filter((m) => m.isJump);
    if (jumps.length > 0) return jumps;
    return allMoves;
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || (mode === 'ai' && turn === 'black')) return;

    // If clicking a valid move target
    if (selectedCell) {
      const chosenMove = validMoves.find((m) => m.toR === r && m.toC === c);
      if (chosenMove) {
        applyMove(chosenMove);
        return;
      }
    }

    // Otherwise selecting own piece
    const piece = board[r][c];
    if (piece) {
      const pieceColor = piece === 'R' || piece === 'RK' ? 'red' : 'black';
      if (pieceColor === turn) {
        setSelectedCell([r, c]);
        const pieceMoves = getMovesForPiece(board, r, c);
        const mandatoryAll = getAllMovesForColor(board, turn);
        const hasMandatoryJumps = mandatoryAll.some((m) => m.isJump);

        if (hasMandatoryJumps) {
          setValidMoves(pieceMoves.filter((m) => m.isJump));
        } else {
          setValidMoves(pieceMoves);
        }
        sounds.playClick();
        return;
      }
    }

    // Deselect if clicking elsewhere
    setSelectedCell(null);
    setValidMoves([]);
  };

  const applyMove = (move: Move) => {
    const nextBoard = board.map((row) => [...row]);
    let piece = nextBoard[move.fromR][move.fromC];
    nextBoard[move.fromR][move.fromC] = null;

    // Check king promotion
    if (piece === 'R' && move.toR === 0) piece = 'RK';
    if (piece === 'B' && move.toR === 7) piece = 'BK';

    nextBoard[move.toR][move.toC] = piece;

    // Remove captured piece
    if (move.isJump && move.jumpR !== undefined && move.jumpC !== undefined) {
      nextBoard[move.jumpR][move.jumpC] = null;
      sounds.playHit();
    } else {
      sounds.playMove();
    }

    setBoard(nextBoard);
    setSelectedCell(null);
    setValidMoves([]);

    const nextTurn = turn === 'red' ? 'black' : 'red';
    const nextMoves = getAllMovesForColor(nextBoard, nextTurn);

    if (nextMoves.length === 0) {
      // Game over, current player wins
      setGameOver(true);
      setWinner(turn);
      sounds.playWin();
    } else {
      setTurn(nextTurn);
    }
  };

  // AI Turn
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !gameOver) {
      const timer = setTimeout(() => {
        const aiMoves = getAllMovesForColor(board, 'black');
        if (aiMoves.length === 0) {
          setGameOver(true);
          setWinner('red');
          return;
        }

        // Prioritize jumps first, else king promotion, else random
        const jumps = aiMoves.filter((m) => m.isJump);
        const bestMove = jumps.length > 0 
          ? jumps[Math.floor(Math.random() * jumps.length)]
          : aiMoves[Math.floor(Math.random() * aiMoves.length)];

        applyMove(bestMove);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, gameOver, mode, turn]);

  const resetGame = () => {
    setBoard(initCheckersBoard());
    setTurn('red');
    setSelectedCell(null);
    setValidMoves([]);
    setGameOver(false);
    setWinner(null);
  };

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
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Turn pill */}
        <div className="flex items-center gap-4 mb-4 bg-[#121420] px-5 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full ${
                turn === 'red' ? 'bg-rose-500 ring-4 ring-rose-500/30' : 'bg-slate-700'
              }`}
            />
            <span className="text-xs font-bold text-white">Red (You)</span>
          </div>
          <span className="text-slate-600">vs</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full ${
                turn === 'black' ? 'bg-slate-300 ring-4 ring-slate-400/30' : 'bg-slate-700'
              }`}
            />
            <span className="text-xs font-bold text-white">
              {mode === 'ai' ? 'Black (AI)' : 'Black (P2)'}
            </span>
          </div>
        </div>

        {/* 8x8 Board */}
        <div className="w-full aspect-square max-w-[380px] bg-[#0c0e18] p-2.5 rounded-3xl border-2 border-slate-800 shadow-2xl">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden border border-slate-800">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isDarkSquare = (r + c) % 2 === 1;
                const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
                const isValidTarget = validMoves.some((m) => m.toR === r && m.toC === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative flex items-center justify-center cursor-pointer select-none transition-colors ${
                      isDarkSquare ? 'bg-[#151724]' : 'bg-[#212438]'
                    } ${isSelected ? 'ring-2 ring-violet-400 z-10' : ''}`}
                  >
                    {/* Move indicator dot */}
                    {isValidTarget && (
                      <div className="absolute w-4 h-4 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/80 anim-pop ring-2 ring-emerald-300 z-20 pointer-events-none" />
                    )}

                    {/* Pieces */}
                    {cell && (
                      <div
                        className={`w-[80%] h-[80%] rounded-full flex items-center justify-center font-bold text-xs shadow-xl transition-all duration-150 ${
                          cell.startsWith('R')
                            ? 'bg-gradient-to-tr from-rose-700 to-rose-500 text-white shadow-rose-950/80'
                            : 'bg-gradient-to-tr from-slate-700 to-slate-500 text-slate-100 shadow-black'
                        } ${isSelected ? 'scale-115 ring-4 ring-violet-400 shadow-violet-500/60 -translate-y-1' : ''}`}
                      >
                        {cell.endsWith('K') && (
                          <Crown className="w-4 h-4 text-amber-300 fill-amber-300 drop-shadow anim-pulse-glow" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={
          winner === 'red'
            ? mode === 'ai'
              ? '🎉 Victory!'
              : '🎉 Red Won!'
            : mode === 'ai'
            ? 'Black AI Won!'
            : '🎉 Black Won!'
        }
        message="All opponent pieces captured or blocked!"
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
