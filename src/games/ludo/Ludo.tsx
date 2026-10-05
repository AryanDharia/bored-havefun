import React, { useState } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Dices, Trophy, Star } from 'lucide-react';

// Fast-paced authentic Ludo:
// Track has 28 perimeter positions encircling the board.
// Safe tiles at corner positions: 0, 7, 14, 21 (marked with Star).
// Tokens must travel 28 steps around the track to reach Home Goal.
// Roll 6 to move token out of base onto the player's starting square.

interface Token {
  id: number;
  inBase: boolean;
  steps: number; // 0 to 28 (28 = Home)
}

interface Player {
  id: number;
  name: string;
  color: string;
  bg: string;
  borderColor: string;
  textColor: string;
  startTrackPos: number; // 0 for Red, 7 for Green, 14 for Yellow, 21 for Blue
  tokens: Token[];
}

const INITIAL_PLAYERS: Player[] = [
  {
    id: 0,
    name: 'Red',
    color: '#ef4444',
    bg: 'bg-rose-500',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-400',
    startTrackPos: 0,
    tokens: [{ id: 0, inBase: true, steps: 0 }, { id: 1, inBase: true, steps: 0 }],
  },
  {
    id: 1,
    name: 'Green',
    color: '#10b981',
    bg: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    textColor: 'text-emerald-400',
    startTrackPos: 7,
    tokens: [{ id: 0, inBase: true, steps: 0 }, { id: 1, inBase: true, steps: 0 }],
  },
  {
    id: 2,
    name: 'Yellow',
    color: '#eab308',
    bg: 'bg-amber-400',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-400',
    startTrackPos: 14,
    tokens: [{ id: 0, inBase: true, steps: 0 }, { id: 1, inBase: true, steps: 0 }],
  },
  {
    id: 3,
    name: 'Blue',
    color: '#3b82f6',
    bg: 'bg-blue-500',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-400',
    startTrackPos: 21,
    tokens: [{ id: 0, inBase: true, steps: 0 }, { id: 1, inBase: true, steps: 0 }],
  },
];

const SAFE_TILES = [0, 7, 14, 21];

// Grid mapping for 28 perimeter tiles on an 8x8 grid (rows 0-7, cols 0-7):
// Top row: indices 0..6 -> (0,0) to (0,6)
// Right col: indices 7..13 -> (0,7) to (6,7)
// Bottom row: indices 14..20 -> (7,7) down to (7,1)
// Left col: indices 21..27 -> (7,0) down to (1,0)
const TRACK_COORDINATES: { r: number; c: number }[] = [
  { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }, { r: 0, c: 5 }, { r: 0, c: 6 },
  { r: 0, c: 7 }, { r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }, { r: 6, c: 7 },
  { r: 7, c: 7 }, { r: 7, c: 6 }, { r: 7, c: 5 }, { r: 7, c: 4 }, { r: 7, c: 3 }, { r: 7, c: 2 }, { r: 7, c: 1 },
  { r: 7, c: 0 }, { r: 6, c: 0 }, { r: 5, c: 0 }, { r: 4, c: 0 }, { r: 3, c: 0 }, { r: 2, c: 0 }, { r: 1, c: 0 },
];

const DICE_DOTS: Record<number, string[]> = {
  1: ['col-start-2 row-start-2'],
  2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
  3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
  4: [
    'col-start-1 row-start-1',
    'col-start-3 row-start-1',
    'col-start-1 row-start-3',
    'col-start-3 row-start-3',
  ],
  5: [
    'col-start-1 row-start-1',
    'col-start-3 row-start-1',
    'col-start-2 row-start-2',
    'col-start-1 row-start-3',
    'col-start-3 row-start-3',
  ],
  6: [
    'col-start-1 row-start-1',
    'col-start-3 row-start-1',
    'col-start-1 row-start-2',
    'col-start-3 row-start-2',
    'col-start-1 row-start-3',
    'col-start-3 row-start-3',
  ],
};

export const Ludo: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'ludo')!;

  const [playerCount, setPlayerCount] = useState<number>(2);
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [dice, setDice] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('Roll the dice!');
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);

  const getTileTrackIndex = (player: Player, token: Token): number | null => {
    if (token.inBase || token.steps >= 28) return null;
    return (player.startTrackPos + token.steps) % 28;
  };

  const rollDice = () => {
    if (isRolling || hasRolled || isMoving || gameOver) return;
    setIsRolling(true);
    sounds.playDice();

    let cycles = 0;
    const interval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      cycles++;
      if (cycles >= 8) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDice(finalRoll);
        setIsRolling(false);
        setHasRolled(true);
        evaluateRoll(finalRoll);
      }
    }, 75);
  };

  const evaluateRoll = (roll: number) => {
    const curPlayer = players[currentTurn];
    const canMove = curPlayer.tokens.some((t) => {
      if (t.inBase) return roll === 6;
      if (t.steps >= 28) return false;
      return t.steps + roll <= 28;
    });

    if (!canMove) {
      setStatusMsg(`Player ${curPlayer.name} rolled ${roll} — no valid moves.`);
      setTimeout(() => {
        passTurn();
      }, 1000);
    } else {
      setStatusMsg(`Player ${curPlayer.name} rolled ${roll}! Select a highlighted token.`);
    }
  };

  const handleTokenClick = (pId: number, tokenId: number) => {
    if (pId !== currentTurn || !hasRolled || !dice || isMoving || gameOver) return;

    const curPlayer = players[pId];
    const token = curPlayer.tokens[tokenId];

    // Out of base
    if (token.inBase) {
      if (dice !== 6) return;
      setIsMoving(true);
      sounds.playMove();

      const nextPlayers = [...players];
      nextPlayers[pId].tokens[tokenId] = {
        id: tokenId,
        inBase: false,
        steps: 0,
      };
      setPlayers(nextPlayers);

      checkCapture(pId, curPlayer.startTrackPos);
      setIsMoving(false);
      finishMove(true);
      return;
    }

    // Move along track
    if (token.steps + dice <= 28) {
      setIsMoving(true);
      const stepsToMove = dice;
      let stepCounter = 0;

      const stepInterval = setInterval(() => {
        stepCounter++;
        sounds.playMove();

        setPlayers((prev) => {
          const next = [...prev];
          const currTok = next[pId].tokens[tokenId];
          next[pId].tokens[tokenId] = {
            ...currTok,
            steps: currTok.steps + 1,
          };
          return next;
        });

        if (stepCounter >= stepsToMove) {
          clearInterval(stepInterval);
          setIsMoving(false);

          setPlayers((latest) => {
            const finalToken = latest[pId].tokens[tokenId];
            // Check Home
            if (finalToken.steps >= 28) {
              sounds.playScore();
              // Check if all tokens home
              if (latest[pId].tokens.every((t) => t.steps >= 28)) {
                setGameOver(true);
                setWinner(curPlayer);
                sounds.playWin();
                return latest;
              }
            } else {
              const finalTileIndex = (curPlayer.startTrackPos + finalToken.steps) % 28;
              checkCapture(pId, finalTileIndex);
            }
            return latest;
          });

          finishMove(dice === 6);
        }
      }, 140);
    }
  };

  const checkCapture = (activePId: number, targetTile: number) => {
    if (SAFE_TILES.includes(targetTile)) return;

    setPlayers((prev) => {
      const copy = [...prev];
      for (let p = 0; p < playerCount; p++) {
        if (p === activePId) continue;
        copy[p].tokens.forEach((t) => {
          if (!t.inBase && t.steps < 28) {
            const tile = (copy[p].startTrackPos + t.steps) % 28;
            if (tile === targetTile) {
              // Captured! Send back to base
              t.inBase = true;
              t.steps = 0;
              sounds.playHit();
              setStatusMsg(`💥 Knockout! Player ${copy[p].name}'s token sent back to base!`);
            }
          }
        });
      }
      return copy;
    });
  };

  const finishMove = (bonusRoll: boolean) => {
    if (bonusRoll) {
      setStatusMsg(`Rolled a 6! Player ${players[currentTurn].name} gets a bonus roll!`);
      setHasRolled(false);
      setDice(null);
    } else {
      passTurn();
    }
  };

  const passTurn = () => {
    setHasRolled(false);
    setDice(null);
    const nextP = (currentTurn + 1) % playerCount;
    setCurrentTurn(nextP);
    setStatusMsg(`Player ${players[nextP].name}'s turn! Roll the dice.`);
  };

  const resetGame = () => {
    setPlayers(
      INITIAL_PLAYERS.map((p) => ({
        ...p,
        tokens: [{ id: 0, inBase: true, steps: 0 }, { id: 1, inBase: true, steps: 0 }],
      }))
    );
    setCurrentTurn(0);
    setDice(null);
    setHasRolled(false);
    setIsRolling(false);
    setIsMoving(false);
    setStatusMsg('Roll the dice to start!');
    setGameOver(false);
    setWinner(null);
  };

  const activePlayer = players[currentTurn];

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
          {[2, 3, 4].map((cnt) => (
            <button
              key={cnt}
              onClick={() => {
                setPlayerCount(cnt);
                resetGame();
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                playerCount === cnt ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {cnt} Players
            </button>
          ))}
        </div>
      }
    >
      <div className="w-full max-w-lg flex flex-col items-center select-none">
        {/* Turn & 3D Dice Action Bar */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-3 px-5 mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full ${activePlayer.bg} ring-4 ring-white/20 shadow-lg`}
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Turn</span>
              <p className={`text-sm font-bold ${activePlayer.textColor}`}>
                Player {activePlayer.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 3D Tumbling Dice */}
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br from-white to-slate-200 border-2 border-slate-300 shadow-lg flex items-center justify-center transition-all ${
                isRolling ? 'anim-dice-roll' : ''
              }`}
            >
              {dice ? (
                <div className="grid grid-cols-3 grid-rows-3 w-8 h-8 p-0.5 gap-0.5">
                  {DICE_DOTS[dice].map((pos, i) => (
                    <span key={i} className={`w-2 h-2 rounded-full bg-slate-900 ${pos}`} />
                  ))}
                </div>
              ) : (
                <Dices className="w-6 h-6 text-slate-500" />
              )}
            </div>

            <button
              onClick={rollDice}
              disabled={isRolling || hasRolled || isMoving || gameOver}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-violet-600/30 transition-all flex items-center gap-1.5"
            >
              <span>{isRolling ? 'Rolling...' : 'Roll Dice'}</span>
            </button>
          </div>
        </div>

        {/* Ludo Track Arena (8x8 Grid Layout) */}
        <div className="w-full aspect-square max-w-[420px] bg-[#0c0e18] p-3 rounded-3xl border-2 border-slate-800 shadow-2xl relative grid grid-cols-8 grid-rows-8 gap-1">
          {/* Perimeter 28 Track Tiles */}
          {TRACK_COORDINATES.map((coord, tileIdx) => {
            const isSafe = SAFE_TILES.includes(tileIdx);
            // Check if any active player's tokens are here
            const tokensOnTile: { player: Player; token: Token }[] = [];
            players.slice(0, playerCount).forEach((p) => {
              p.tokens.forEach((t) => {
                if (getTileTrackIndex(p, t) === tileIdx) {
                  tokensOnTile.push({ player: p, token: t });
                }
              });
            });

            // Safe corner colors
            let cornerColor = 'border-slate-800 bg-[#141728]';
            if (tileIdx === 0) cornerColor = 'border-rose-500/40 bg-rose-950/30';
            if (tileIdx === 7) cornerColor = 'border-emerald-500/40 bg-emerald-950/30';
            if (tileIdx === 14) cornerColor = 'border-amber-500/40 bg-amber-950/30';
            if (tileIdx === 21) cornerColor = 'border-blue-500/40 bg-blue-950/30';

            return (
              <div
                key={tileIdx}
                style={{ gridRowStart: coord.r + 1, gridColumnStart: coord.c + 1 }}
                className={`w-full h-full rounded-lg border flex items-center justify-center relative ${cornerColor} transition-all`}
              >
                {isSafe && tokensOnTile.length === 0 && (
                  <Star className="w-3 h-3 text-amber-400/70" />
                )}

                {tokensOnTile.map(({ player, token }) => {
                  const canMoveThis =
                    player.id === currentTurn &&
                    hasRolled &&
                    dice !== null &&
                    !isMoving &&
                    token.steps + dice <= 28;

                  return (
                    <button
                      key={`${player.id}-${token.id}`}
                      onClick={() => handleTokenClick(player.id, token.id)}
                      disabled={!canMoveThis}
                      className={`w-5 h-5 rounded-full ${player.bg} border border-white shadow-md flex items-center justify-center text-[9px] font-black text-white transition-transform ${
                        canMoveThis ? 'scale-115 ring-2 ring-white anim-pulse-glow z-20 cursor-pointer' : ''
                      }`}
                    >
                      {token.id + 1}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Inner Red Base (Rows 2-4, Cols 2-4) -> CSS Grid rows 2..4, cols 2..4 */}
          <div className="col-start-2 col-end-5 row-start-2 row-end-4 bg-rose-950/40 border border-rose-500/40 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 z-10">
            <span className="text-[9px] font-black text-rose-400">RED BASE</span>
            <div className="flex gap-2">
              {players[0].tokens.map((tok) => {
                const canSpawn = currentTurn === 0 && hasRolled && dice === 6 && tok.inBase && !isMoving;
                return (
                  <button
                    key={tok.id}
                    onClick={() => handleTokenClick(0, tok.id)}
                    disabled={!canSpawn}
                    className={`w-6 h-6 rounded-full bg-rose-500 border border-white shadow flex items-center justify-center text-[10px] font-black text-white transition-transform ${
                      tok.inBase ? 'opacity-100' : 'opacity-20'
                    } ${canSpawn ? 'scale-120 ring-4 ring-white anim-pulse-glow cursor-pointer' : ''}`}
                  >
                    {tok.id + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inner Green Base (Rows 2-3, Cols 5-7) */}
          {playerCount >= 2 && (
            <div className="col-start-5 col-end-8 row-start-2 row-end-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 z-10">
              <span className="text-[9px] font-black text-emerald-400">GREEN BASE</span>
              <div className="flex gap-2">
                {players[1].tokens.map((tok) => {
                  const canSpawn = currentTurn === 1 && hasRolled && dice === 6 && tok.inBase && !isMoving;
                  return (
                    <button
                      key={tok.id}
                      onClick={() => handleTokenClick(1, tok.id)}
                      disabled={!canSpawn}
                      className={`w-6 h-6 rounded-full bg-emerald-500 border border-white shadow flex items-center justify-center text-[10px] font-black text-white transition-transform ${
                        tok.inBase ? 'opacity-100' : 'opacity-20'
                      } ${canSpawn ? 'scale-120 ring-4 ring-white anim-pulse-glow cursor-pointer' : ''}`}
                    >
                      {tok.id + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Center Trophy / Goal Area (Rows 4-5, Cols 3-6) */}
          <div className="col-start-3 col-end-7 row-start-4 row-end-6 bg-[#121526] border-2 border-slate-700 rounded-xl flex flex-col items-center justify-center p-1 shadow-inner z-10">
            <Trophy className="w-5 h-5 text-amber-400 mb-0.5" />
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">HOME GOAL</span>
            <div className="flex gap-2 mt-0.5">
              {players.slice(0, playerCount).map((p) => {
                const homeTokens = p.tokens.filter((t) => t.steps >= 28).length;
                return (
                  <span key={p.id} className={`text-[10px] font-black ${p.textColor}`}>
                    {p.name[0]}:{homeTokens}/2
                  </span>
                );
              })}
            </div>
          </div>

          {/* Inner Blue Base (Rows 6-7, Cols 2-4) */}
          {playerCount >= 4 ? (
            <div className="col-start-2 col-end-5 row-start-6 row-end-8 bg-blue-950/40 border border-blue-500/40 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 z-10">
              <span className="text-[9px] font-black text-blue-400">BLUE BASE</span>
              <div className="flex gap-2">
                {players[3].tokens.map((tok) => {
                  const canSpawn = currentTurn === 3 && hasRolled && dice === 6 && tok.inBase && !isMoving;
                  return (
                    <button
                      key={tok.id}
                      onClick={() => handleTokenClick(3, tok.id)}
                      disabled={!canSpawn}
                      className={`w-6 h-6 rounded-full bg-blue-500 border border-white shadow flex items-center justify-center text-[10px] font-black text-white transition-transform ${
                        tok.inBase ? 'opacity-100' : 'opacity-20'
                      } ${canSpawn ? 'scale-120 ring-4 ring-white anim-pulse-glow cursor-pointer' : ''}`}
                    >
                      {tok.id + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="col-start-2 col-end-5 row-start-6 row-end-8" />
          )}

          {/* Inner Yellow Base (Rows 6-7, Cols 5-7) */}
          {playerCount >= 3 ? (
            <div className="col-start-5 col-end-8 row-start-6 row-end-8 bg-amber-950/40 border border-amber-500/40 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 z-10">
              <span className="text-[9px] font-black text-amber-400">YELLOW BASE</span>
              <div className="flex gap-2">
                {players[2].tokens.map((tok) => {
                  const canSpawn = currentTurn === 2 && hasRolled && dice === 6 && tok.inBase && !isMoving;
                  return (
                    <button
                      key={tok.id}
                      onClick={() => handleTokenClick(2, tok.id)}
                      disabled={!canSpawn}
                      className={`w-6 h-6 rounded-full bg-amber-400 border border-white shadow flex items-center justify-center text-[10px] font-black text-white transition-transform ${
                        tok.inBase ? 'opacity-100' : 'opacity-20'
                      } ${canSpawn ? 'scale-120 ring-4 ring-white anim-pulse-glow cursor-pointer' : ''}`}
                    >
                      {tok.id + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="col-start-5 col-end-8 row-start-6 row-end-8" />
          )}
        </div>

        {/* Status bar */}
        <div className="w-full mt-3 bg-[#121420] border border-slate-800 rounded-xl px-4 py-2 text-center text-xs text-slate-300 font-medium">
          {statusMsg}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={`🎉 Player ${winner ? winner.name : ''} Won!`}
        message="Brought all tokens safely home!"
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
