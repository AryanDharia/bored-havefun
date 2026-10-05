import { useState, useEffect, useCallback } from 'react';
import { Chess as ChessEngine } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

const PIECE_UNICODE: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

// Simple piece values for heuristic evaluation
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 10,
  n: 30,
  b: 35,
  r: 50,
  q: 90,
  k: 1000,
};

export const Chess: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'chess')!;

  const [game, setGame] = useState<ChessEngine>(() => new ChessEngine());
  const [board, setBoard] = useState(() => game.board());
  const [turn, setTurn] = useState<Color>('w');
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);

  const [inCheck, setInCheck] = useState<boolean>(false);
  const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<string[]>([]);

  const [gameOver, setGameOver] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<string>('');

  const syncGameState = useCallback((engine: ChessEngine) => {
    setBoard(engine.board());
    setTurn(engine.turn());
    setInCheck(engine.inCheck());

    if (engine.isGameOver()) {
      setGameOver(true);
      if (engine.isCheckmate()) {
        const winner = engine.turn() === 'w' ? 'Black' : 'White';
        setGameResult(`Checkmate! ${winner} wins!`);
      } else if (engine.isDraw()) {
        setGameResult('Draw by Stalemate / Repetition!');
      }
    }
  }, []);

  const handleSquareClick = (square: Square) => {
    if (gameOver || (mode === 'ai' && turn === 'b')) return;

    // If a piece is already selected and user clicked a valid destination
    if (selectedSquare) {
      if (validMoves.includes(square)) {
        try {
          const move = game.move({
            from: selectedSquare,
            to: square,
            promotion: 'q', // auto queen promotion
          });

          if (move) {
            if (move.captured) {
              sounds.playHit();
              if (move.color === 'w') {
                setCapturedBlack((prev) => [...prev, move.captured!]);
              } else {
                setCapturedWhite((prev) => [...prev, move.captured!]);
              }
            } else {
              sounds.playMove();
            }

            setSelectedSquare(null);
            setValidMoves([]);
            syncGameState(game);
            return;
          }
        } catch {
          // Illegal move attempt
        }
      }
    }

    // Select piece
    const piece = game.get(square);
    if (piece && piece.color === turn) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setValidMoves(moves.map((m) => m.to as Square));
      sounds.playClick();
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // AI evaluation move
  useEffect(() => {
    if (mode === 'ai' && turn === 'b' && !gameOver) {
      const timer = setTimeout(() => {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return;

        // Smart Heuristic AI:
        // Prioritize: Checkmate > Capture valuable piece > Checks > Center control
        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        for (const m of legalMoves) {
          let score = 0;
          if (m.captured) {
            score += (PIECE_VALUES[m.captured] || 10) * 10;
          }
          // Center preference (d4, d5, e4, e5)
          if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) {
            score += 3;
          }
          if (m.san.includes('+')) {
            score += 5;
          }
          if (m.san.includes('#')) {
            score += 10000;
          }

          score += Math.random() * 2; // slight variety

          if (score > bestScore) {
            bestScore = score;
            bestMove = m;
          }
        }

        const executed = game.move(bestMove);
        if (executed) {
          if (executed.captured) {
            sounds.playHit();
            setCapturedWhite((prev) => [...prev, executed.captured!]);
          } else {
            sounds.playMove();
          }
          syncGameState(game);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [game, gameOver, mode, syncGameState, turn]);

  const resetGame = () => {
    const newEngine = new ChessEngine();
    setGame(newEngine);
    setBoard(newEngine.board());
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setInCheck(false);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameOver(false);
    setGameResult('');
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
        {/* Turn & Check notification */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-2 px-4 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full border ${
                turn === 'w' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-600'
              }`}
            />
            <span className="text-xs font-bold text-white">
              {turn === 'w' ? 'White to move' : mode === 'ai' ? 'Black (AI) thinking...' : 'Black to move'}
            </span>
          </div>

          {inCheck && (
            <span className="text-xs font-extrabold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-800/40 animate-pulse">
              ⚠️ CHECK!
            </span>
          )}
        </div>

        {/* Captured Black Pieces */}
        <div className="w-full flex items-center gap-1 text-sm h-6 px-2 text-slate-300">
          {capturedBlack.map((p, idx) => (
            <span key={idx} className="opacity-80">
              {PIECE_UNICODE[`b${p.toUpperCase()}`]}
            </span>
          ))}
        </div>

        {/* 8x8 Chessboard */}
        <div className="w-full aspect-square max-w-[390px] bg-[#0c0e18] p-2 rounded-3xl border-2 border-slate-800 shadow-2xl">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden border border-slate-700">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const squareName = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare === squareName;
                const isValidDest = validMoves.includes(squareName);

                const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : '';
                const symbol = pieceKey ? PIECE_UNICODE[pieceKey] : null;

                const isKingInCheck = inCheck && piece?.type === 'k' && piece?.color === turn;

                return (
                  <button
                    key={squareName}
                    onClick={() => handleSquareClick(squareName)}
                    className={`relative flex items-center justify-center font-serif text-3xl sm:text-4xl transition-all select-none ${
                      isKingInCheck
                        ? 'bg-rose-950/90 ring-4 ring-rose-500 anim-shake z-10'
                        : isLight
                        ? 'bg-[#2a2e45]'
                        : 'bg-[#141624]'
                    } ${isSelected ? 'bg-violet-600/70 ring-4 ring-violet-400 shadow-xl scale-105 z-10' : ''}`}
                  >
                    {/* Legal target dot */}
                    {isValidDest && (
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/60 anim-pop ring-2 ring-emerald-300 z-20 pointer-events-none" />
                    )}

                    {/* Chess piece */}
                    {symbol && (
                      <span
                        className={`transition-transform duration-150 ${
                          isSelected ? 'scale-115 -translate-y-1' : ''
                        } ${
                          piece?.color === 'w' ? 'text-white drop-shadow-md' : 'text-slate-900 drop-shadow'
                        }`}
                      >
                        {symbol}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Captured White Pieces */}
        <div className="w-full flex items-center gap-1 text-sm h-6 px-2 text-slate-300 mt-1">
          {capturedWhite.map((p, idx) => (
            <span key={idx} className="opacity-80">
              {PIECE_UNICODE[`w${p.toUpperCase()}`]}
            </span>
          ))}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="Checkmate!"
        message={gameResult}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
