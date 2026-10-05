import React, { useState, useEffect, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Bot, Users, Sparkles } from 'lucide-react';

type Player = 'p1' | 'p2';

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
}

export const DotsAndBoxes: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'dots-and-boxes')!;

  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [turn, setTurn] = useState<Player>('p1');
  const [scores, setScores] = useState({ p1: 0, p2: 0 });

  // Horizontal lines: 4 rows x 3 columns
  const [hLines, setHLines] = useState<boolean[][]>(() =>
    Array.from({ length: 4 }, () => Array(3).fill(false))
  );

  // Vertical lines: 3 rows x 4 columns
  const [vLines, setVLines] = useState<boolean[][]>(() =>
    Array.from({ length: 3 }, () => Array(4).fill(false))
  );

  // Boxes: 3x3 array storing owner
  const [boxes, setBoxes] = useState<(Player | null)[][]>(() =>
    Array.from({ length: 3 }, () => Array(3).fill(null))
  );

  // Animated newly completed box coords for pulse/highlight
  const [recentBoxes, setRecentBoxes] = useState<[number, number][]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [hasBonusTurn, setHasBonusTurn] = useState<boolean>(false);

  const [gameOver, setGameOver] = useState<boolean>(false);
  const popupIdRef = useRef(0);

  // Trigger floating +1 score popup
  const addScorePopup = (r: number, c: number) => {
    const newId = ++popupIdRef.current;
    // pixel coordinates relative to board box
    const x = 70 + c * 75;
    const y = 65 + r * 75;
    setPopups((prev) => [...prev, { id: newId, x, y, text: '+1' }]);

    setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== newId));
    }, 800);
  };

  // Check newly enclosed boxes
  const checkBoxes = (
    currentH: boolean[][],
    currentV: boolean[][],
    currentBoxes: (Player | null)[][],
    activePlayer: Player
  ): { updatedBoxes: (Player | null)[][]; newlyCompleted: [number, number][] } => {
    const newlyCompleted: [number, number][] = [];
    const nextBoxes = currentBoxes.map((row) => [...row]);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!nextBoxes[r][c]) {
          const top = currentH[r][c];
          const bottom = currentH[r + 1][c];
          const left = currentV[r][c];
          const right = currentV[r][c + 1];

          if (top && bottom && left && right) {
            nextBoxes[r][c] = activePlayer;
            newlyCompleted.push([r, c]);
          }
        }
      }
    }

    return { updatedBoxes: nextBoxes, newlyCompleted };
  };

  const handleHLineClick = (r: number, c: number) => {
    if (hLines[r][c] || gameOver || (mode === 'ai' && turn === 'p2')) return;

    sounds.playMove();
    const nextH = hLines.map((row) => [...row]);
    nextH[r][c] = true;
    setHLines(nextH);

    processLineMove(nextH, vLines, turn);
  };

  const handleVLineClick = (r: number, c: number) => {
    if (vLines[r][c] || gameOver || (mode === 'ai' && turn === 'p2')) return;

    sounds.playMove();
    const nextV = vLines.map((row) => [...row]);
    nextV[r][c] = true;
    setVLines(nextV);

    processLineMove(hLines, nextV, turn);
  };

  const processLineMove = (nextH: boolean[][], nextV: boolean[][], activePlayer: Player) => {
    const { updatedBoxes, newlyCompleted } = checkBoxes(nextH, nextV, boxes, activePlayer);
    setBoxes(updatedBoxes);

    if (newlyCompleted.length > 0) {
      sounds.playScore();
      setRecentBoxes(newlyCompleted);
      setHasBonusTurn(true);

      newlyCompleted.forEach(([r, c]) => {
        addScorePopup(r, c);
      });

      setScores((prev) => ({
        ...prev,
        [activePlayer]: prev[activePlayer] + newlyCompleted.length,
      }));

      // Check if all 9 boxes claimed
      const allClaimed = updatedBoxes.every((row) => row.every((b) => b !== null));
      if (allClaimed) {
        setGameOver(true);
        sounds.playWin();
        return;
      }

      setTimeout(() => {
        setRecentBoxes([]);
        setHasBonusTurn(false);
      }, 700);
      // Completing a box grants bonus turn to active player!
    } else {
      setHasBonusTurn(false);
      setTurn(activePlayer === 'p1' ? 'p2' : 'p1');
    }
  };

  // AI Turn
  useEffect(() => {
    if (mode === 'ai' && turn === 'p2' && !gameOver) {
      const timer = setTimeout(() => {
        // Find all unplaced lines
        const availableH: [number, number][] = [];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 3; c++) {
            if (!hLines[r][c]) availableH.push([r, c]);
          }
        }

        const availableV: [number, number][] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 4; c++) {
            if (!vLines[r][c]) availableV.push([r, c]);
          }
        }

        // 1. Try to take completing move first
        let pickedMove: { type: 'h' | 'v'; r: number; c: number } | null = null;

        for (const [r, c] of availableH) {
          const testH = hLines.map((row) => [...row]);
          testH[r][c] = true;
          if (checkBoxes(testH, vLines, boxes, 'p2').newlyCompleted.length > 0) {
            pickedMove = { type: 'h', r, c };
            break;
          }
        }

        if (!pickedMove) {
          for (const [r, c] of availableV) {
            const testV = vLines.map((row) => [...row]);
            testV[r][c] = true;
            if (checkBoxes(hLines, testV, boxes, 'p2').newlyCompleted.length > 0) {
              pickedMove = { type: 'v', r, c };
              break;
            }
          }
        }

        // 2. Otherwise pick random
        if (!pickedMove) {
          const totalOptions = [
            ...availableH.map(([r, c]) => ({ type: 'h' as const, r, c })),
            ...availableV.map(([r, c]) => ({ type: 'v' as const, r, c })),
          ];
          if (totalOptions.length === 0) return;
          pickedMove = totalOptions[Math.floor(Math.random() * totalOptions.length)];
        }

        if (pickedMove.type === 'h') {
          const nextH = hLines.map((row) => [...row]);
          nextH[pickedMove.r][pickedMove.c] = true;
          setHLines(nextH);
          processLineMove(nextH, vLines, 'p2');
        } else {
          const nextV = vLines.map((row) => [...row]);
          nextV[pickedMove.r][pickedMove.c] = true;
          setVLines(nextV);
          processLineMove(hLines, nextV, 'p2');
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [boxes, gameOver, hLines, mode, turn, vLines]);

  const resetGame = () => {
    setHLines(Array.from({ length: 4 }, () => Array(3).fill(false)));
    setVLines(Array.from({ length: 3 }, () => Array(4).fill(false)));
    setBoxes(Array.from({ length: 3 }, () => Array(3).fill(null)));
    setTurn('p1');
    setScores({ p1: 0, p2: 0 });
    setGameOver(false);
    setRecentBoxes([]);
    setPopups([]);
    setHasBonusTurn(false);
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
      <div className="w-full max-w-sm flex flex-col items-center select-none">
        {/* Turn & Score Banner */}
        <div className="w-full flex items-center justify-between bg-[#121422] border border-slate-800 rounded-3xl py-3 px-5 mb-5 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-4 h-4 rounded-full transition-all ${
                turn === 'p1' ? 'bg-violet-500 ring-4 ring-violet-500/30 scale-125' : 'bg-slate-700'
              }`}
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">P1 (Purple)</span>
              <div className="text-base font-black text-white">{scores.p1} boxes</div>
            </div>
          </div>

          {hasBonusTurn && (
            <div className="flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-800/40 animate-bounce">
              <Sparkles className="w-3 h-3" />
              <span>BONUS TURN!</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {mode === 'ai' ? 'AI (Rose)' : 'P2 (Rose)'}
              </span>
              <div className="text-base font-black text-white">{scores.p2} boxes</div>
            </div>
            <div
              className={`w-4 h-4 rounded-full transition-all ${
                turn === 'p2' ? 'bg-rose-500 ring-4 ring-rose-500/30' : 'bg-slate-700'
              }`}
            />
          </div>
        </div>

        {/* 3x3 Dots & Boxes Board with Animated Line Draws and Floating +1 */}
        <div className="bg-[#0b0d18] p-6 rounded-3xl border-2 border-slate-800 shadow-2xl relative w-[310px] h-[310px]">
          {/* Floating +1 Popups */}
          {popups.map((pop) => (
            <div
              key={pop.id}
              style={{ left: `${pop.x}px`, top: `${pop.y}px` }}
              className="absolute z-30 font-black text-lg text-emerald-400 pointer-events-none anim-score-float"
            >
              {pop.text}
            </div>
          ))}

          {/* Render Boxes */}
          {boxes.map((row, r) =>
            row.map((boxOwner, c) => {
              const isRecent = recentBoxes.some(([br, bc]) => br === r && bc === c);

              return (
                <div
                  key={`box-${r}-${c}`}
                  style={{
                    top: `${36 + r * 72}px`,
                    left: `${36 + c * 72}px`,
                  }}
                  className={`absolute w-[66px] h-[66px] rounded-2xl flex flex-col items-center justify-center font-black transition-all ${
                    boxOwner === 'p1'
                      ? 'bg-gradient-to-br from-violet-600/30 to-violet-800/20 border-2 border-violet-500/60 text-violet-300'
                      : boxOwner === 'p2'
                      ? 'bg-gradient-to-br from-rose-600/30 to-rose-800/20 border-2 border-rose-500/60 text-rose-300'
                      : 'bg-transparent'
                  } ${isRecent ? 'anim-pop ring-4 ring-yellow-400/80 scale-105' : ''}`}
                >
                  {boxOwner && (
                    <>
                      <span className="text-lg font-black tracking-wider">
                        {boxOwner === 'p1' ? 'P1' : mode === 'ai' ? 'AI' : 'P2'}
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Render Horizontal Lines with Smooth Expansion */}
          {hLines.map((row, r) =>
            row.map((active, c) => (
              <button
                key={`h-${r}-${c}`}
                onClick={() => handleHLineClick(r, c)}
                style={{
                  top: `${33 + r * 72}px`,
                  left: `${37 + c * 72}px`,
                }}
                className={`absolute w-[64px] h-[8px] rounded-full transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-violet-400 shadow-lg shadow-violet-500/70 scale-100 ring-1 ring-violet-300'
                    : 'bg-slate-800/80 hover:bg-slate-600 active:scale-95'
                }`}
              />
            ))
          )}

          {/* Render Vertical Lines with Smooth Expansion */}
          {vLines.map((row, r) =>
            row.map((active, c) => (
              <button
                key={`v-${r}-${c}`}
                onClick={() => handleVLineClick(r, c)}
                style={{
                  top: `${37 + r * 72}px`,
                  left: `${33 + c * 72}px`,
                }}
                className={`absolute w-[8px] h-[64px] rounded-full transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-violet-400 shadow-lg shadow-violet-500/70 scale-100 ring-1 ring-violet-300'
                    : 'bg-slate-800/80 hover:bg-slate-600 active:scale-95'
                }`}
              />
            ))
          )}

          {/* Render 4x4 Glowing Dots */}
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 4 }).map((_, c) => (
              <div
                key={`dot-${r}-${c}`}
                style={{
                  top: `${30 + r * 72}px`,
                  left: `${30 + c * 72}px`,
                }}
                className="absolute w-[14px] h-[14px] rounded-full bg-white shadow-md shadow-white/50 pointer-events-none z-20 border border-slate-300"
              />
            ))
          )}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={
          scores.p1 > scores.p2
            ? '🎉 Player 1 Won!'
            : scores.p2 > scores.p1
            ? mode === 'ai'
              ? 'Computer AI Won!'
              : '🎉 Player 2 Won!'
            : 'Draw Game!'
        }
        message={`Boxes captured: ${scores.p1} vs ${scores.p2}`}
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
