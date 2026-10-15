import { useState, useEffect, useCallback } from 'react';
import { Chess as ChessEngine } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users } from 'lucide-react';

// SVG-based chess pieces for maximum cross-browser visibility and contrast
// White pieces: solid white fill with dark border/stroke
// Black pieces: solid dark fill (#1a1a2e) with light stroke for contrast against both square colors

const PIECE_SVG: Record<string, (isWhite: boolean) => string> = {
  K: (w) => w
    ? `<path fill="#fff" stroke="#374151" stroke-width="1.8" d="M20 8h-2V6h2V4h-4v2h-2V4H10v2H8V4H4v2h2v2H4v3h16V8zm-8 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-6V9"/><path fill="#fff" stroke="#374151" stroke-width="1.8" d="M4 22h16v2H4z"/>`
    : `<path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M20 8h-2V6h2V4h-4v2h-2V4H10v2H8V4H4v2h2v2H4v3h16V8zm-8 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-6V9"/><path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M4 22h16v2H4z"/>`,
  Q: (w) => w
    ? `<path fill="#fff" stroke="#374151" stroke-width="1.8" d="M12 2l2.5 5L20 4l-2 6H6l-2-6 5.5 3zM5 11h14v2H5zm1 3h10v8H6zm1 1v6h8v-6z"/>`
    : `<path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M12 2l2.5 5L20 4l-2 6H6l-2-6 5.5 3zM5 11h14v2H5zm1 3h10v8H6zm1 1v6h8v-6z"/>`,
  R: (w) => w
    ? `<path fill="#fff" stroke="#374151" stroke-width="1.8" d="M5 3h3v3h2V3h4v3h2V3h3v5H5V3zm1 6h12v1H6zm1 1.5h10v9.5H7zm1 1v7.5h8V11.5z"/><path fill="#fff" stroke="#374151" stroke-width="1.8" d="M5 21h14v2H5z"/>`
    : `<path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M5 3h3v3h2V3h4v3h2V3h3v5H5V3zm1 6h12v1H6zm1 1.5h10v9.5H7zm1 1v7.5h8V11.5z"/><path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M5 21h14v2H5z"/>`,
  B: (w) => w
    ? `<path fill="#fff" stroke="#374151" stroke-width="1.8" d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 5c-3 0-6 3-6 6h2c0-2.2 1.8-4 4-4s4 1.8 4 4h2c0-3-3-6-6-6zm-5 7h10v2H7z"/><path fill="#fff" stroke="#374151" stroke-width="1.8" d="M5 18h14v2H5zm1 2h12v2H6z"/>`
    : `<path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 5c-3 0-6 3-6 6h2c0-2.2 1.8-4 4-4s4 1.8 4 4h2c0-3-3-6-6-6zm-5 7h10v2H7z"/><path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M5 18h14v2H5zm1 2h12v2H6z"/>`,
  N: (w) => w
    ? `<path fill="#fff" stroke="#374151" stroke-width="1.8" d="M6 22V11c0-3.3 2.7-7 6-7 1.2 0 2.5.5 3.5 1.5L17 7l-2 1.5c.6.9 1 2 1 3.5v10H6zm2-2h8V12.5c0-1.5-.5-2.8-1.5-3.7L16 8l-1.5-1.5C13.7 5.5 12.9 5 12 5c-2.2 0-4 2.8-4 5v10z"/><path fill="#fff" stroke="#374151" stroke-width="1.8" d="M5 20h14v2H5z"/>`
    : `<path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M6 22V11c0-3.3 2.7-7 6-7 1.2 0 2.5.5 3.5 1.5L17 7l-2 1.5c.6.9 1 2 1 3.5v10H6zm2-2h8V12.5c0-1.5-.5-2.8-1.5-3.7L16 8l-1.5-1.5C13.7 5.5 12.9 5 12 5c-2.2 0-4 2.8-4 5v10z"/><path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M5 20h14v2H5z"/>`,
  P: (w) => w
    ? `<circle fill="#fff" stroke="#374151" stroke-width="1.8" cx="12" cy="8" r="3.5"/><path fill="#fff" stroke="#374151" stroke-width="1.8" d="M8 13h8v1H8zm-1 2h10v7H7zm1 1v5h8v-5z"/>`
    : `<circle fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" cx="12" cy="8" r="3.5"/><path fill="#1e1b4b" stroke="#a5b4fc" stroke-width="1.5" d="M8 13h8v1H8zm-1 2h10v7H7zm1 1v5h8v-5z"/>`,
};

const PieceIcon = ({ type, color }: { type: PieceSymbol; color: Color }) => {
  const isWhite = color === 'w';
  const pathData = PIECE_SVG[type.toUpperCase()]?.(isWhite);
  if (!pathData) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      className="w-full h-full drop-shadow-md"
      dangerouslySetInnerHTML={{ __html: pathData }}
    />
  );
};

// Small piece icon for captured display
const CapturedPieceIcon = ({ type, color }: { type: string; color: 'w' | 'b' }) => {
  const isWhite = color === 'w';
  const pathData = PIECE_SVG[type.toUpperCase()]?.(isWhite);
  if (!pathData) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="inline-block opacity-80"
      dangerouslySetInnerHTML={{ __html: pathData }}
    />
  );
};

// Piece values for AI evaluation
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 10, n: 30, b: 35, r: 50, q: 90, k: 1000,
};

export const Chess: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'chess')!;

  const [game, setGame] = useState<ChessEngine>(() => new ChessEngine());
  const [board, setBoard] = useState(() => game.board());
  const [turn, setTurn] = useState<Color>('w');
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const [inCheck, setInCheck] = useState<boolean>(false);
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]); // Black pieces captured by white
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]); // White pieces captured by black

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
                setCapturedByWhite((prev) => [...prev, move.captured!]);
              } else {
                setCapturedByBlack((prev) => [...prev, move.captured!]);
              }
            } else {
              sounds.playMove();
            }

            setLastMove({ from: selectedSquare, to: square });
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

  // AI turn
  useEffect(() => {
    if (mode === 'ai' && turn === 'b' && !gameOver) {
      const timer = setTimeout(() => {
        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return;

        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        for (const m of legalMoves) {
          let score = 0;
          if (m.captured) score += (PIECE_VALUES[m.captured] || 10) * 10;
          if (['d4', 'd5', 'e4', 'e5'].includes(m.to)) score += 3;
          if (m.san.includes('+')) score += 5;
          if (m.san.includes('#')) score += 10000;
          score += Math.random() * 2;

          if (score > bestScore) {
            bestScore = score;
            bestMove = m;
          }
        }

        const executed = game.move(bestMove);
        if (executed) {
          if (executed.captured) {
            sounds.playHit();
            setCapturedByBlack((prev) => [...prev, executed.captured!]);
          } else {
            sounds.playMove();
          }
          setLastMove({ from: bestMove.from as Square, to: bestMove.to as Square });
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
    setLastMove(null);
    setInCheck(false);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setGameOver(false);
    setGameResult('');
  };

  // King square lookup for check highlight
  const findKingSquare = (): Square | null => {
    if (!inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          return `${String.fromCharCode(97 + c)}${8 - r}` as Square;
        }
      }
    }
    return null;
  };
  const kingInCheckSquare = findKingSquare();

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex bg-slate-100 dark:bg-[#0d0e17] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
          <button
            onClick={() => { setMode('ai'); resetGame(); }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              mode === 'ai' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>vs AI</span>
          </button>
          <button
            onClick={() => { setMode('pvp'); resetGame(); }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              mode === 'pvp' ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Turn & Check status bar */}
        <div className="w-full flex items-center justify-between bg-white dark:bg-[#121420] border border-slate-200 dark:border-slate-800 rounded-2xl py-2 px-4 mb-3 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full border-2 ${
                turn === 'w'
                  ? 'bg-white border-slate-400 shadow-sm'
                  : 'bg-slate-900 border-slate-500'
              }`}
            />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {turn === 'w' ? 'White to move' : mode === 'ai' ? 'Black (AI) thinking...' : 'Black to move'}
            </span>
          </div>

          {inCheck && (
            <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800/40 animate-pulse">
              ⚠️ CHECK!
            </span>
          )}
        </div>

        {/* Captured Black Pieces (taken by White) */}
        <div className="w-full flex items-center gap-0.5 h-6 px-2 mb-1">
          {capturedByWhite.map((p, idx) => (
            <CapturedPieceIcon key={idx} type={p} color="b" />
          ))}
        </div>

        {/* 8×8 Chessboard — uses fixed contrast colors independent of theme overrides */}
        <div
          className="w-full aspect-square max-w-[400px] p-1.5 rounded-2xl shadow-2xl touch-manipulation"
          style={{ background: '#12141f', border: '2px solid rgba(249, 115, 22, 0.25)' }}
        >
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden touch-manipulation">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const squareName = `${String.fromCharCode(97 + c)}${8 - r}` as Square;
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare === squareName;
                const isValidDest = validMoves.includes(squareName);
                const isLastMoveSquare =
                  lastMove?.from === squareName || lastMove?.to === squareName;
                const isKingInCheck = kingInCheckSquare === squareName;

                // Board colors — high contrast, chess-standard look
                // Light squares: warm cream / Light square
                // Dark squares: classic forest green / blue-navy
                let squareBg = isLight ? '#f0d9b5' : '#b58863'; // classic Lichess-style cream+brown
                if (isKingInCheck) squareBg = '#c84b31';
                else if (isSelected) squareBg = '#829769';
                else if (isLastMoveSquare) squareBg = isLight ? '#cdd16f' : '#aaa23a';

                return (
                  <button
                    key={squareName}
                    onClick={() => handleSquareClick(squareName)}
                    style={{ backgroundColor: squareBg, position: 'relative' }}
                    className="relative flex items-center justify-center transition-none select-none group touch-manipulation cursor-pointer"
                    aria-label={`Square ${squareName}${piece ? ` - ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                  >
                    {/* Legal move indicator */}
                    {isValidDest && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                      >
                        {piece ? (
                          // Target capture ring
                          <div className="absolute inset-0 rounded-none border-4 border-emerald-400/80 z-10" />
                        ) : (
                          // Empty square dot
                          <div className="w-[28%] h-[28%] rounded-full bg-black/25" />
                        )}
                      </div>
                    )}

                    {/* Board coordinates (edge labels) */}
                    {c === 0 && (
                      <span
                        className="absolute top-0.5 left-0.5 text-[9px] font-bold leading-none pointer-events-none z-20 select-none"
                        style={{ color: isLight ? '#b58863' : '#f0d9b5' }}
                      >
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span
                        className="absolute bottom-0.5 right-0.5 text-[9px] font-bold leading-none pointer-events-none z-20 select-none"
                        style={{ color: isLight ? '#b58863' : '#f0d9b5' }}
                      >
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {/* Chess Piece (SVG-based for clear visibility on all squares + themes) */}
                    {piece && (
                      <div
                        className={`w-[78%] h-[78%] z-30 relative transition-transform duration-100 ${
                          isSelected ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'
                        }`}
                      >
                        <PieceIcon type={piece.type} color={piece.color} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Captured White Pieces (taken by Black) */}
        <div className="w-full flex items-center gap-0.5 h-6 px-2 mt-1">
          {capturedByBlack.map((p, idx) => (
            <CapturedPieceIcon key={idx} type={p} color="w" />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono-telemetry text-center">
          Click a piece to select · Click a dot to move · Auto queen promotion
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={gameResult.includes('Checkmate') ? '♟️ Checkmate!' : '🤝 Draw!'}
        message={gameResult}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
