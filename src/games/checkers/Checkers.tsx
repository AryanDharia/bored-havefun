import React, { useState, useEffect } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users, Crown, Zap } from 'lucide-react';
import type { PieceType, PieceColor, Move } from './checkersEngine';
import {
  initCheckersBoard,
  getMovesForPiece,
  getJumpsForPiece,
  getAllMovesForColor,
  executeMove,
} from './checkersEngine';

export const Checkers: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'checkers')!;

  const [board, setBoard] = useState<PieceType[][]>(() => initCheckersBoard());
  const [turn, setTurn] = useState<PieceColor>('red');
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [multiJumpPiece, setMultiJumpPiece] = useState<[number, number] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | null>(null);

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || (mode === 'ai' && turn === 'black')) return;

    // MANDATORY MULTI-JUMP CONTINUATION
    if (multiJumpPiece) {
      // Player is locked to executing subsequent captures with the multiJumpPiece
      const chosenMove = validMoves.find((m) => m.toR === r && m.toC === c);
      if (chosenMove) {
        applyMove(chosenMove);
      }
      // Clicking any other square/piece is strictly blocked during multi-jump
      return;
    }

    // Normal move execution: clicking a valid move target
    if (selectedCell) {
      const chosenMove = validMoves.find((m) => m.toR === r && m.toC === c);
      if (chosenMove) {
        applyMove(chosenMove);
        return;
      }
    }

    // Selecting own piece
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
    const result = executeMove(board, move);
    setBoard(result.nextBoard);

    if (move.isJump) {
      sounds.playHit();
    } else {
      sounds.playMove();
    }

    // Double jump / multiple capture check:
    // If the move was a jump and further jumps exist with that same piece,
    // lock the piece, DO NOT switch turn, and require continuing the jump sequence.
    if (move.isJump && result.furtherJumps.length > 0) {
      const nextPos: [number, number] = [move.toR, move.toC];
      setMultiJumpPiece(nextPos);
      setSelectedCell(nextPos);
      setValidMoves(result.furtherJumps);
      return;
    }

    // Complete capture sequence finished or non-jump move made:
    setMultiJumpPiece(null);
    setSelectedCell(null);
    setValidMoves([]);

    const nextTurn: PieceColor = turn === 'red' ? 'black' : 'red';
    const nextMoves = getAllMovesForColor(result.nextBoard, nextTurn);

    if (nextMoves.length === 0) {
      // Game over, current player wins
      setGameOver(true);
      setWinner(turn);
      sounds.playWin();
    } else {
      setTurn(nextTurn);
    }
  };

  // AI Turn handler (supports both initial moves and multi-jump sequences)
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !gameOver) {
      const timer = setTimeout(() => {
        // If AI is in the middle of a multi-jump sequence
        if (multiJumpPiece) {
          const jumps = getJumpsForPiece(board, multiJumpPiece[0], multiJumpPiece[1]);
          if (jumps.length > 0) {
            const bestJump = jumps[Math.floor(Math.random() * jumps.length)];
            applyMove(bestJump);
            return;
          }
        }

        const aiMoves = getAllMovesForColor(board, 'black');
        if (aiMoves.length === 0) {
          setGameOver(true);
          setWinner('red');
          return;
        }

        // Prioritize jumps first, else random
        const jumps = aiMoves.filter((m) => m.isJump);
        const bestMove =
          jumps.length > 0
            ? jumps[Math.floor(Math.random() * jumps.length)]
            : aiMoves[Math.floor(Math.random() * aiMoves.length)];

        applyMove(bestMove);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [board, gameOver, mode, turn, multiJumpPiece]);

  const resetGame = () => {
    setBoard(initCheckersBoard());
    setTurn('red');
    setMultiJumpPiece(null);
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
              mode === 'ai' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
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
              mode === 'pvp' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Multi-jump Alert Banner */}
        {multiJumpPiece && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-2 animate-pulse shadow-lg shadow-amber-500/10">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>DOUBLE JUMP AVAILABLE — CONTINUE CAPTURING!</span>
          </div>
        )}

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
                const isMultiJumping = multiJumpPiece && multiJumpPiece[0] === r && multiJumpPiece[1] === c;
                const isValidTarget = validMoves.some((m) => m.toR === r && m.toC === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative flex items-center justify-center cursor-pointer select-none transition-colors ${
                      isDarkSquare ? 'bg-[#151724]' : 'bg-[#212438]'
                    } ${isSelected || isMultiJumping ? 'ring-2 ring-orange-400 z-10' : ''}`}
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
                        } ${
                          isMultiJumping
                            ? 'scale-115 ring-4 ring-amber-400 shadow-amber-500/80 -translate-y-1 animate-pulse'
                            : isSelected
                            ? 'scale-115 ring-4 ring-orange-400 shadow-orange-500/60 -translate-y-1'
                            : ''
                        }`}
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
