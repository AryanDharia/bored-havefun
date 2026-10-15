import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { Bot, Users, Sparkles, Trophy } from 'lucide-react';

type Player = 'p1' | 'p2';

interface ScorePopup {
  id: number;
  r: number;
  c: number;
  text: string;
}

const GRID_SIZE = 5; // 5x5 boxes
const DOTS_COUNT = GRID_SIZE + 1; // 6x6 dots
const TOTAL_BOXES = GRID_SIZE * GRID_SIZE; // 25 boxes

const PAD = 6; // 6% padding on all sides
const STEP = (100 - PAD * 2) / GRID_SIZE; // 17.6% per box

export const DotsAndBoxes: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'dots-and-boxes')!;

  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [turn, setTurn] = useState<Player>('p1');
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [highScore, setHighScore] = useState<number>(() => getHighScore('dots-and-boxes') || 0);

  // Horizontal lines: (GRID_SIZE + 1) rows x GRID_SIZE columns = 6 rows x 5 columns
  const [hLines, setHLines] = useState<(Player | null)[][]>(() =>
    Array.from({ length: DOTS_COUNT }, () => Array(GRID_SIZE).fill(null))
  );

  // Vertical lines: GRID_SIZE rows x (GRID_SIZE + 1) columns = 5 rows x 6 columns
  const [vLines, setVLines] = useState<(Player | null)[][]>(() =>
    Array.from({ length: GRID_SIZE }, () => Array(DOTS_COUNT).fill(null))
  );

  // Boxes: 5x5 array storing owner
  const [boxes, setBoxes] = useState<(Player | null)[][]>(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  // Highlight newly completed boxes
  const [recentBoxes, setRecentBoxes] = useState<[number, number][]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [hasBonusTurn, setHasBonusTurn] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [lastDrawnLine, setLastDrawnLine] = useState<{ type: 'h' | 'v'; r: number; c: number } | null>(null);

  const [gameOver, setGameOver] = useState<boolean>(false);
  const popupIdRef = useRef(0);

  // Trigger floating +1 score popup at box (r, c)
  const addScorePopup = useCallback((r: number, c: number) => {
    const newId = ++popupIdRef.current;
    setPopups((prev) => [...prev, { id: newId, r, c, text: '+1' }]);

    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== newId));
    }, 850);
  }, []);

  // Check newly enclosed boxes
  const checkBoxes = useCallback((
    currentH: (Player | null)[][],
    currentV: (Player | null)[][],
    currentBoxes: (Player | null)[][],
    activePlayer: Player
  ): { updatedBoxes: (Player | null)[][]; newlyCompleted: [number, number][] } => {
    const newlyCompleted: [number, number][] = [];
    const nextBoxes = currentBoxes.map((row) => [...row]);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!nextBoxes[r][c]) {
          const top = currentH[r][c] !== null;
          const bottom = currentH[r + 1][c] !== null;
          const left = currentV[r][c] !== null;
          const right = currentV[r][c + 1] !== null;

          if (top && bottom && left && right) {
            nextBoxes[r][c] = activePlayer;
            newlyCompleted.push([r, c]);
          }
        }
      }
    }

    return { updatedBoxes: nextBoxes, newlyCompleted };
  }, []);

  const processLineMove = useCallback((
    nextH: (Player | null)[][],
    nextV: (Player | null)[][],
    activePlayer: Player
  ) => {
    const { updatedBoxes, newlyCompleted } = checkBoxes(nextH, nextV, boxes, activePlayer);
    setBoxes(updatedBoxes);

    if (newlyCompleted.length > 0) {
      sounds.playScore();
      setRecentBoxes(newlyCompleted);
      setHasBonusTurn(true);

      newlyCompleted.forEach(([r, c]) => {
        addScorePopup(r, c);
      });

      const nextScores = {
        ...scores,
        [activePlayer]: scores[activePlayer] + newlyCompleted.length,
      };
      setScores(nextScores);

      if (activePlayer === 'p1' && nextScores.p1 > highScore) {
        setHighScore(nextScores.p1);
        saveHighScore('dots-and-boxes', nextScores.p1);
      }

      // Check if all 25 boxes claimed
      const totalClaimed = updatedBoxes.reduce(
        (sum, row) => sum + row.filter((b) => b !== null).length,
        0
      );

      if (totalClaimed === TOTAL_BOXES) {
        setGameOver(true);
        sounds.playWin();
        return;
      }

      setTimeout(() => {
        setRecentBoxes([]);
        setHasBonusTurn(false);
      }, 750);
      // Completing a box grants bonus turn to active player!
    } else {
      setHasBonusTurn(false);
      setTurn(activePlayer === 'p1' ? 'p2' : 'p1');
    }
  }, [addScorePopup, boxes, checkBoxes, highScore, scores]);

  const handleHLineClick = (r: number, c: number) => {
    if (
      hLines[r][c] !== null ||
      gameOver ||
      isAiThinking ||
      (mode === 'ai' && turn === 'p2')
    ) {
      return;
    }

    sounds.playMove();
    setLastDrawnLine({ type: 'h', r, c });
    const nextH = hLines.map((row) => [...row]);
    nextH[r][c] = turn;
    setHLines(nextH);

    processLineMove(nextH, vLines, turn);
  };

  const handleVLineClick = (r: number, c: number) => {
    if (
      vLines[r][c] !== null ||
      gameOver ||
      isAiThinking ||
      (mode === 'ai' && turn === 'p2')
    ) {
      return;
    }

    sounds.playMove();
    setLastDrawnLine({ type: 'v', r, c });
    const nextV = vLines.map((row) => [...row]);
    nextV[r][c] = turn;
    setVLines(nextV);

    processLineMove(hLines, nextV, turn);
  };

  // Strategic AI Turn on 5x5 board
  useEffect(() => {
    if (mode === 'ai' && turn === 'p2' && !gameOver) {
      setIsAiThinking(true);

      const timer = setTimeout(() => {
        // Collect all available unclaimed horizontal and vertical edges
        const availableH: [number, number][] = [];
        for (let r = 0; r < DOTS_COUNT; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (hLines[r][c] === null) availableH.push([r, c]);
          }
        }

        const availableV: [number, number][] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < DOTS_COUNT; c++) {
            if (vLines[r][c] === null) availableV.push([r, c]);
          }
        }

        if (availableH.length === 0 && availableV.length === 0) {
          setIsAiThinking(false);
          return;
        }

        // Helper to count sides of a box given candidate lines
        const getBoxSides = (
          br: number,
          bc: number,
          testH: (Player | null)[][],
          testV: (Player | null)[][]
        ): number => {
          let count = 0;
          if (testH[br][bc] !== null) count++;
          if (testH[br + 1][bc] !== null) count++;
          if (testV[br][bc] !== null) count++;
          if (testV[br][bc + 1] !== null) count++;
          return count;
        };

        // 1. PRIORITY 1: Take any line that immediately completes one or more boxes!
        let chosenMove: { type: 'h' | 'v'; r: number; c: number } | null = null;
        let maxCompleted = 0;

        for (const [r, c] of availableH) {
          const testH = hLines.map((row) => [...row]);
          testH[r][c] = 'p2';
          const completed = checkBoxes(testH, vLines, boxes, 'p2').newlyCompleted.length;
          if (completed > maxCompleted) {
            maxCompleted = completed;
            chosenMove = { type: 'h', r, c };
          }
        }

        for (const [r, c] of availableV) {
          const testV = vLines.map((row) => [...row]);
          testV[r][c] = 'p2';
          const completed = checkBoxes(hLines, testV, boxes, 'p2').newlyCompleted.length;
          if (completed > maxCompleted) {
            maxCompleted = completed;
            chosenMove = { type: 'v', r, c };
          }
        }

        // 2. PRIORITY 2: If no box can be completed, find "safe" moves that do NOT give the opponent 3 sides
        if (!chosenMove) {
          const safeMoves: { type: 'h' | 'v'; r: number; c: number }[] = [];

          for (const [r, c] of availableH) {
            const adjBoxes: [number, number][] = [];
            if (r > 0) adjBoxes.push([r - 1, c]);
            if (r < GRID_SIZE) adjBoxes.push([r, c]);

            // Safe if none of the adjacent boxes currently have 2 sides (which would become 3)
            const wouldCreateThreeSides = adjBoxes.some(
              ([br, bc]) => getBoxSides(br, bc, hLines, vLines) === 2
            );

            if (!wouldCreateThreeSides) {
              safeMoves.push({ type: 'h', r, c });
            }
          }

          for (const [r, c] of availableV) {
            const adjBoxes: [number, number][] = [];
            if (c > 0) adjBoxes.push([r, c - 1]);
            if (c < GRID_SIZE) adjBoxes.push([r, c]);

            const wouldCreateThreeSides = adjBoxes.some(
              ([br, bc]) => getBoxSides(br, bc, hLines, vLines) === 2
            );

            if (!wouldCreateThreeSides) {
              safeMoves.push({ type: 'v', r, c });
            }
          }

          if (safeMoves.length > 0) {
            chosenMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
          }
        }

        // 3. PRIORITY 3: If forced to sacrifice, pick the move that creates the fewest 3-sided boxes
        if (!chosenMove) {
          const allOptions: { type: 'h' | 'v'; r: number; c: number; cost: number }[] = [];

          for (const [r, c] of availableH) {
            const adjBoxes: [number, number][] = [];
            if (r > 0) adjBoxes.push([r - 1, c]);
            if (r < GRID_SIZE) adjBoxes.push([r, c]);
            const cost = adjBoxes.filter(([br, bc]) => getBoxSides(br, bc, hLines, vLines) === 2).length;
            allOptions.push({ type: 'h', r, c, cost });
          }

          for (const [r, c] of availableV) {
            const adjBoxes: [number, number][] = [];
            if (c > 0) adjBoxes.push([r, c - 1]);
            if (c < GRID_SIZE) adjBoxes.push([r, c]);
            const cost = adjBoxes.filter(([br, bc]) => getBoxSides(br, bc, hLines, vLines) === 2).length;
            allOptions.push({ type: 'v', r, c, cost });
          }

          if (allOptions.length > 0) {
            allOptions.sort((a, b) => a.cost - b.cost);
            chosenMove = allOptions[0];
          }
        }

        if (chosenMove) {
          sounds.playMove();
          setLastDrawnLine({ type: chosenMove.type, r: chosenMove.r, c: chosenMove.c });

          if (chosenMove.type === 'h') {
            const nextH = hLines.map((row) => [...row]);
            nextH[chosenMove.r][chosenMove.c] = 'p2';
            setHLines(nextH);
            processLineMove(nextH, vLines, 'p2');
          } else {
            const nextV = vLines.map((row) => [...row]);
            nextV[chosenMove.r][chosenMove.c] = 'p2';
            setVLines(nextV);
            processLineMove(hLines, nextV, 'p2');
          }
        }

        setIsAiThinking(false);
      }, 450);

      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }
  }, [boxes, checkBoxes, gameOver, hLines, mode, processLineMove, turn, vLines]);

  const resetGame = () => {
    setHLines(Array.from({ length: DOTS_COUNT }, () => Array(GRID_SIZE).fill(null)));
    setVLines(Array.from({ length: GRID_SIZE }, () => Array(DOTS_COUNT).fill(null)));
    setBoxes(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    setTurn('p1');
    setScores({ p1: 0, p2: 0 });
    setGameOver(false);
    setRecentBoxes([]);
    setPopups([]);
    setHasBonusTurn(false);
    setIsAiThinking(false);
    setLastDrawnLine(null);
  };

  const claimedTotal = scores.p1 + scores.p2;

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex bg-slate-100 dark:bg-[#0d0e17] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
          <button
            onClick={() => {
              setMode('ai');
              resetGame();
            }}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              mode === 'ai'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
              mode === 'pvp'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Pass & Play</span>
          </button>
        </div>
      }
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center select-none px-2 sm:px-4">
        {/* Turn & Score Banner */}
        <div className="w-full flex items-center justify-between bg-white dark:bg-[#121422] border border-slate-200 dark:border-slate-800/90 rounded-2xl py-3 px-4 sm:px-5 mb-4 shadow-sm dark:shadow-lg transition-colors">
          {/* Player 1 Info */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                turn === 'p1' && !gameOver
                  ? 'bg-orange-500 ring-4 ring-orange-500/30 scale-125'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  Player 1
                </span>
                {turn === 'p1' && !gameOver && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                )}
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {scores.p1} <span className="text-xs font-normal text-slate-400">pts</span>
              </div>
            </div>
          </div>

          {/* Center Status / Bonus Indicator */}
          <div className="flex flex-col items-center">
            {hasBonusTurn ? (
              <div className="flex items-center gap-1 text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800/60 animate-bounce">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>BONUS TURN!</span>
              </div>
            ) : isAiThinking ? (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-500/10 dark:bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                <span>AI Thinking...</span>
              </div>
            ) : (
              <div className="text-[11px] font-mono-telemetry text-slate-500 dark:text-slate-400 font-semibold">
                {claimedTotal}/{TOTAL_BOXES} BOXES
              </div>
            )}
          </div>

          {/* Player 2 / AI Info */}
          <div className="flex items-center gap-2.5 text-right">
            <div>
              <div className="flex items-center justify-end gap-1">
                {turn === 'p2' && !gameOver && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  {mode === 'ai' ? 'Computer' : 'Player 2'}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {scores.p2} <span className="text-xs font-normal text-slate-400">pts</span>
              </div>
            </div>
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                turn === 'p2' && !gameOver
                  ? 'bg-rose-500 ring-4 ring-rose-500/30 scale-125'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          </div>
        </div>

        {/* 5x5 Responsive Board Container (6x6 Dots, 25 Boxes) */}
        <div className="w-full max-w-[420px] aspect-square bg-slate-50 dark:bg-[#0b0d18] p-3 sm:p-4 rounded-3xl border-2 border-slate-200 dark:border-slate-800/90 shadow-xl dark:shadow-2xl relative select-none touch-manipulation overflow-hidden">
          {/* Subtle Grid Watermark / Background Glow */}
          <div className="absolute inset-0 bg-radial from-orange-500/5 via-transparent to-transparent pointer-events-none" />

          {/* Floating +1 Popups */}
          {popups.map((pop) => (
            <div
              key={pop.id}
              style={{
                left: `${PAD + (pop.c + 0.5) * STEP}%`,
                top: `${PAD + (pop.r + 0.5) * STEP}%`,
              }}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 font-black text-base sm:text-lg text-emerald-600 dark:text-emerald-400 pointer-events-none anim-score-float drop-shadow"
            >
              {pop.text}
            </div>
          ))}

          {/* 1. Render 5x5 Boxes */}
          {boxes.map((row, r) =>
            row.map((boxOwner, c) => {
              const isRecent = recentBoxes.some(([br, bc]) => br === r && bc === c);

              return (
                <div
                  key={`box-${r}-${c}`}
                  style={{
                    top: `${PAD + r * STEP}%`,
                    left: `${PAD + c * STEP}%`,
                    width: `${STEP}%`,
                    height: `${STEP}%`,
                  }}
                  className="absolute p-1 sm:p-1.5"
                >
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center font-black transition-all duration-300 ${
                      boxOwner === 'p1'
                        ? 'bg-orange-500/15 dark:bg-orange-600/25 border-2 border-orange-500/50 text-orange-700 dark:text-orange-300'
                        : boxOwner === 'p2'
                        ? 'bg-rose-500/15 dark:bg-rose-600/25 border-2 border-rose-500/50 text-rose-700 dark:text-rose-300'
                        : 'bg-transparent border border-transparent'
                    } ${isRecent ? 'anim-pop ring-4 ring-yellow-400/80 scale-105 z-10' : ''}`}
                  >
                    {boxOwner && (
                      <span className="text-xs sm:text-sm font-black tracking-wider animate-fadeIn">
                        {boxOwner === 'p1' ? 'P1' : mode === 'ai' ? 'AI' : 'P2'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* 2. Render Horizontal Lines (6 rows x 5 columns) */}
          {hLines.map((row, r) =>
            row.map((active, c) => {
              const isLastDrawn =
                lastDrawnLine?.type === 'h' &&
                lastDrawnLine.r === r &&
                lastDrawnLine.c === c;

              return (
                <button
                  key={`h-${r}-${c}`}
                  type="button"
                  aria-label={`Horizontal line row ${r} column ${c}`}
                  disabled={active !== null || gameOver || isAiThinking}
                  onClick={() => handleHLineClick(r, c)}
                  style={{
                    top: `${PAD + r * STEP}%`,
                    left: `${PAD + c * STEP}%`,
                    width: `${STEP}%`,
                  }}
                  className={`absolute -translate-y-1/2 py-3.5 sm:py-4 z-10 px-1 focus:outline-none group touch-manipulation ${
                    active !== null ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div
                    className={`w-full h-1.5 sm:h-2 rounded-full transition-all duration-200 ${
                      active === 'p1'
                        ? 'bg-orange-500 dark:bg-orange-500 shadow-md shadow-orange-500/60 ring-1 ring-orange-300'
                        : active === 'p2'
                        ? 'bg-rose-600 dark:bg-rose-500 shadow-md shadow-rose-500/60 ring-1 ring-rose-300'
                        : 'bg-slate-200/90 dark:bg-slate-800/80 group-hover:bg-orange-400/70 dark:group-hover:bg-orange-500/60 group-active:scale-95'
                    } ${isLastDrawn ? 'ring-2 ring-yellow-400' : ''}`}
                  />
                </button>
              );
            })
          )}

          {/* 3. Render Vertical Lines (5 rows x 6 columns) */}
          {vLines.map((row, r) =>
            row.map((active, c) => {
              const isLastDrawn =
                lastDrawnLine?.type === 'v' &&
                lastDrawnLine.r === r &&
                lastDrawnLine.c === c;

              return (
                <button
                  key={`v-${r}-${c}`}
                  type="button"
                  aria-label={`Vertical line row ${r} column ${c}`}
                  disabled={active !== null || gameOver || isAiThinking}
                  onClick={() => handleVLineClick(r, c)}
                  style={{
                    top: `${PAD + r * STEP}%`,
                    left: `${PAD + c * STEP}%`,
                    height: `${STEP}%`,
                  }}
                  className={`absolute -translate-x-1/2 px-3.5 sm:px-4 z-10 py-1 focus:outline-none group touch-manipulation ${
                    active !== null ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div
                    className={`h-full w-1.5 sm:w-2 rounded-full transition-all duration-200 ${
                      active === 'p1'
                        ? 'bg-orange-500 dark:bg-orange-500 shadow-md shadow-orange-500/60 ring-1 ring-orange-300'
                        : active === 'p2'
                        ? 'bg-rose-600 dark:bg-rose-500 shadow-md shadow-rose-500/60 ring-1 ring-rose-300'
                        : 'bg-slate-200/90 dark:bg-slate-800/80 group-hover:bg-orange-400/70 dark:group-hover:bg-orange-500/60 group-active:scale-95'
                    } ${isLastDrawn ? 'ring-2 ring-yellow-400' : ''}`}
                  />
                </button>
              );
            })
          )}

          {/* 4. Render 6x6 Dots Grid (36 Dots) */}
          {Array.from({ length: DOTS_COUNT }).map((_, r) =>
            Array.from({ length: DOTS_COUNT }).map((_, c) => (
              <div
                key={`dot-${r}-${c}`}
                style={{
                  top: `${PAD + r * STEP}%`,
                  left: `${PAD + c * STEP}%`,
                }}
                className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800 dark:bg-white border-2 border-white dark:border-slate-300 shadow-sm dark:shadow-white/40 pointer-events-none z-20 transition-transform"
              />
            ))
          )}
        </div>

        {/* Footer Guidance / High Score */}
        <div className="w-full mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono-telemetry px-1">
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            BEST: <strong className="text-slate-800 dark:text-slate-200 font-bold">{highScore}</strong> BOXES
          </span>
          <span>5×5 GRID • 25 BOXES</span>
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={
          scores.p1 > scores.p2
            ? '🎉 Player 1 Won!'
            : scores.p2 > scores.p1
            ? mode === 'ai'
              ? '🤖 Computer AI Won!'
              : '🎉 Player 2 Won!'
            : '🤝 Draw Game!'
        }
        message={`Final Territory: Player 1 captured ${scores.p1} boxes vs ${scores.p2} boxes.`}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
