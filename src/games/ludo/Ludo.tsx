import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { Dices, Sparkles, Bot, Users, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

// Classic 15x15 Ludo Board Architecture
// 4 Players: 0: Red (Top-Left), 1: Green (Top-Right), 2: Yellow (Bottom-Right), 3: Blue (Bottom-Left)
// In 2-player mode: Red and Yellow (classic opposite diagonal)
// In 3-player mode: Red, Green, Yellow
// In 4-player mode: Red, Green, Yellow, Blue

export type AIDifficulty = 'Easy' | 'Medium' | 'Hard';

interface Token {
  id: number; // 0, 1, 2, 3
  step: number; // -1: in base yard, 0..50: on 52 track cells, 51..55: in home column, 56: Home Goal!
}

interface PlayerConfig {
  id: number;
  name: string;
  colorName: string;
  hex: string;
  bgClass: string;
  textClass: string;
  startTrackIdx: number;
  arrowDir: 'right' | 'down' | 'left' | 'up';
  baseBox: { r: number; c: number }; // Top-left of 6x6 base
}

const PLAYERS_DEF: PlayerConfig[] = [
  {
    id: 0,
    name: 'Red',
    colorName: 'Red',
    hex: '#ef4444',
    bgClass: 'bg-rose-500',
    textClass: 'text-rose-400',
    startTrackIdx: 0, // (6, 1)
    arrowDir: 'right',
    baseBox: { r: 0, c: 0 },
  },
  {
    id: 1,
    name: 'Green',
    colorName: 'Green',
    hex: '#10b981',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    startTrackIdx: 13, // (1, 8)
    arrowDir: 'down',
    baseBox: { r: 0, c: 9 },
  },
  {
    id: 2,
    name: 'Yellow',
    colorName: 'Yellow',
    hex: '#eab308',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-400',
    startTrackIdx: 26, // (8, 13)
    arrowDir: 'left',
    baseBox: { r: 9, c: 9 },
  },
  {
    id: 3,
    name: 'Blue',
    colorName: 'Blue',
    hex: '#0ea5e9',
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-400',
    startTrackIdx: 39, // (13, 6)
    arrowDir: 'up',
    baseBox: { r: 9, c: 0 },
  },
];

// The 52 track cells around the cross perimeter (rows 0..14, cols 0..14)
const TRACK_CELLS: { r: number; c: number }[] = [
  /* 0 - Red start */ { r: 6, c: 1 },
  { r: 6, c: 2 },
  { r: 6, c: 3 },
  { r: 6, c: 4 },
  { r: 6, c: 5 },
  { r: 5, c: 6 },
  { r: 4, c: 6 },
  { r: 3, c: 6 },
  /* 8 - Star safe */ { r: 2, c: 6 },
  { r: 1, c: 6 },
  { r: 0, c: 6 },
  { r: 0, c: 7 },
  { r: 0, c: 8 },
  /* 13 - Green start */ { r: 1, c: 8 },
  { r: 2, c: 8 },
  { r: 3, c: 8 },
  { r: 4, c: 8 },
  { r: 5, c: 8 },
  { r: 6, c: 9 },
  { r: 6, c: 10 },
  { r: 6, c: 11 },
  /* 21 - Star safe */ { r: 6, c: 12 },
  { r: 6, c: 13 },
  { r: 6, c: 14 },
  { r: 7, c: 14 },
  { r: 8, c: 14 },
  /* 26 - Yellow start */ { r: 8, c: 13 },
  { r: 8, c: 12 },
  { r: 8, c: 11 },
  { r: 8, c: 10 },
  { r: 8, c: 9 },
  { r: 9, c: 8 },
  { r: 10, c: 8 },
  { r: 11, c: 8 },
  /* 34 - Star safe */ { r: 12, c: 8 },
  { r: 13, c: 8 },
  { r: 14, c: 8 },
  { r: 14, c: 7 },
  { r: 14, c: 6 },
  /* 39 - Blue start */ { r: 13, c: 6 },
  { r: 12, c: 6 },
  { r: 11, c: 6 },
  { r: 10, c: 6 },
  { r: 9, c: 6 },
  { r: 8, c: 5 },
  { r: 8, c: 4 },
  { r: 8, c: 3 },
  /* 47 - Star safe */ { r: 8, c: 2 },
  { r: 8, c: 1 },
  { r: 8, c: 0 },
  { r: 7, c: 0 },
  { r: 6, c: 0 },
];

// The 8 safe cells on the main track (4 starting spots + 4 stars)
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Star coordinates on board for rendering Star symbols ⭐
const STAR_COORDS = [
  { r: 2, c: 6 },
  { r: 6, c: 12 },
  { r: 12, c: 8 },
  { r: 8, c: 2 },
];

// Colored home paths (5 steps leading from track into center goal)
const HOME_PATHS: Record<number, { r: number; c: number }[]> = {
  // Red: row 7, cols 1..5
  0: [{ r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }],
  // Green: col 7, rows 1..5
  1: [{ r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }],
  // Yellow: row 7, cols 13..9
  2: [{ r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }],
  // Blue: col 7, rows 13..9
  3: [{ r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }],
};

// Center Goal positions for tokens at step 56
const GOAL_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 6.8, y: 7.5 }, // Red (left triangle)
  1: { x: 7.5, y: 6.8 }, // Green (top triangle)
  2: { x: 8.2, y: 7.5 }, // Yellow (right triangle)
  3: { x: 7.5, y: 8.2 }, // Blue (bottom triangle)
};

// Base Pocket positions inside each player's 6x6 yard
const BASE_POCKETS: Record<number, { x: number; y: number }[]> = {
  // Red (top-left)
  0: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }],
  // Green (top-right)
  1: [{ x: 11, y: 2 }, { x: 13, y: 2 }, { x: 11, y: 4 }, { x: 13, y: 4 }],
  // Yellow (bottom-right)
  2: [{ x: 11, y: 11 }, { x: 13, y: 11 }, { x: 11, y: 13 }, { x: 13, y: 13 }],
  // Blue (bottom-left)
  3: [{ x: 2, y: 11 }, { x: 4, y: 11 }, { x: 2, y: 13 }, { x: 4, y: 13 }],
};

// Dice face pip layout
const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export const Ludo: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'ludo')!;

  // Game Settings
  const [mode, setMode] = useState<'ai' | 'pvp'>('ai');
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('Medium');

  // Active players list
  const activePlayerIds = playerCount === 2 ? [0, 2] : playerCount === 3 ? [0, 1, 2] : [0, 1, 2, 3];

  // State: 4 tokens for each of the 4 players
  const [tokens, setTokens] = useState<Record<number, Token[]>>({
    0: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    1: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    2: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    3: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
  });

  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0); // index in activePlayerIds
  const currentPId = activePlayerIds[currentTurnIdx] ?? 0;
  const currentConfig = PLAYERS_DEF[currentPId];

  // Turn Phase: 'roll' | 'select' | 'moving'
  const [turnPhase, setTurnPhase] = useState<'roll' | 'select' | 'moving'>('roll');
  const [dice, setDice] = useState<number | null>(null);
  const [displayedDice, setDisplayedDice] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [bonusRollActive, setBonusRollActive] = useState<boolean>(false);

  // Status feedback
  const [statusMsg, setStatusMsg] = useState<string>('Roll the 3D dice to start!');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winnerId, setWinnerId] = useState<number | null>(null);

  const lockRef = useRef(false);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const isCurrentAI = useCallback(() => {
    return mode === 'ai' && currentPId !== 0;
  }, [mode, currentPId]);

  // Calculate coordinates for token rendering
  const getTokenCoords = useCallback((pId: number, token: Token): { x: number; y: number } => {
    if (token.step === -1) {
      return BASE_POCKETS[pId][token.id];
    }
    if (token.step >= 0 && token.step <= 50) {
      const trackIdx = (PLAYERS_DEF[pId].startTrackIdx + token.step) % 52;
      const cell = TRACK_CELLS[trackIdx];
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    }
    if (token.step >= 51 && token.step <= 55) {
      const homeStep = token.step - 51;
      const cell = HOME_PATHS[pId][homeStep];
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    }
    // Step 56 = Goal Center
    const goal = GOAL_POSITIONS[pId];
    // slight offset per token inside goal
    const offsets = [
      { dx: -0.25, dy: -0.25 },
      { dx: 0.25, dy: -0.25 },
      { dx: -0.25, dy: 0.25 },
      { dx: 0.25, dy: 0.25 },
    ];
    return { x: goal.x + offsets[token.id].dx, y: goal.y + offsets[token.id].dy };
  }, []);

  // Check if a token can legally move given the current roll
  const canMoveToken = useCallback((token: Token, roll: number): boolean => {
    if (token.step === -1) {
      return roll === 6; // Needs a 6 to enter start square
    }
    if (token.step === 56) {
      return false; // Already home
    }
    // Exact roll to reach 56
    return token.step + roll <= 56;
  }, []);

  // Get all legally movable token IDs for current player
  const getMovableTokens = useCallback((pId: number, roll: number): number[] => {
    return tokens[pId]
      .filter((t) => canMoveToken(t, roll))
      .map((t) => t.id);
  }, [tokens, canMoveToken]);

  // Pass turn to next player
  const passTurn = useCallback(() => {
    setDice(null);
    setBonusRollActive(false);
    setTurnPhase('roll');
    setCurrentTurnIdx((prev) => (prev + 1) % activePlayerIds.length);
    lockRef.current = false;
  }, [activePlayerIds.length]);

  // Execute step-by-step token movement
  const executeMove = useCallback(async (pId: number, tokenId: number, roll: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setTurnPhase('moving');

    const curToken = tokens[pId][tokenId];
    let earnedBonus = roll === 6;

    // 1. Spawning out of base on 6
    if (curToken.step === -1) {
      sounds.playMove();
      setTokens((prev) => ({
        ...prev,
        [pId]: prev[pId].map((t) => (t.id === tokenId ? { ...t, step: 0 } : t)),
      }));
      setStatusMsg(`Player ${PLAYERS_DEF[pId].name} spawned a token on the start square!`);
      await delay(400);

      // Check capture on starting square
      const startTrackIdx = PLAYERS_DEF[pId].startTrackIdx;
      earnedBonus = (await checkAndExecuteCapture(pId, startTrackIdx)) || earnedBonus;
    } else {
      // 2. Stepping along track or home path cell-by-cell
      const stepsToTake = roll;
      let currStep = curToken.step;

      for (let s = 0; s < stepsToTake; s++) {
        currStep++;
        setTokens((prev) => ({
          ...prev,
          [pId]: prev[pId].map((t) => (t.id === tokenId ? { ...t, step: currStep } : t)),
        }));
        sounds.playMove();
        await delay(130);
      }

      // Check if token reached Home Goal (56)
      if (currStep === 56) {
        sounds.playScore();
        setStatusMsg(`🎉 Player ${PLAYERS_DEF[pId].name}'s token reached Home!`);
        earnedBonus = true; // Reaching home gives bonus roll in classic rules
        await delay(450);

        // Check Victory
        const allHome = tokens[pId].every((t) => (t.id === tokenId ? true : t.step === 56));
        if (allHome) {
          setGameOver(true);
          setWinnerId(pId);
          sounds.playWin();
          try {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } catch {
            // fallback
          }
          lockRef.current = false;
          return;
        }
      } else if (currStep <= 50) {
        // Landed on main track: check for capture!
        const landTrackIdx = (PLAYERS_DEF[pId].startTrackIdx + currStep) % 52;
        const capturedOpponent = await checkAndExecuteCapture(pId, landTrackIdx);
        if (capturedOpponent) {
          earnedBonus = true;
        }
      }
    }

    // Turn outcome: bonus roll or next turn
    if (earnedBonus) {
      setStatusMsg(`⭐ Bonus Roll! Player ${PLAYERS_DEF[pId].name} gets another roll!`);
      setDice(null);
      setBonusRollActive(true);
      setTurnPhase('roll');
      lockRef.current = false;
    } else {
      await delay(400);
      passTurn();
    }
  }, [tokens, passTurn]);

  // Check and execute capture if landing on non-safe square
  const checkAndExecuteCapture = async (activePId: number, landTrackIdx: number): Promise<boolean> => {
    // If on safe square (star or starting spot), no capture
    if (SAFE_TRACK_INDICES.includes(landTrackIdx)) {
      return false;
    }

    let captured = false;
    let victimName = '';

    setTokens((prev) => {
      const copy: Record<number, Token[]> = { ...prev };
      activePlayerIds.forEach((oppId) => {
        if (oppId === activePId) return;
        copy[oppId] = copy[oppId].map((t) => {
          if (t.step >= 0 && t.step <= 50) {
            const oppTrackIdx = (PLAYERS_DEF[oppId].startTrackIdx + t.step) % 52;
            if (oppTrackIdx === landTrackIdx) {
              // Knockout! Send back to base yard
              captured = true;
              victimName = PLAYERS_DEF[oppId].name;
              return { ...t, step: -1 };
            }
          }
          return t;
        });
      });
      return copy;
    });

    if (captured) {
      sounds.playCapture();
      setStatusMsg(`💥 KNOCKOUT! Player ${PLAYERS_DEF[activePId].name} captured ${victimName}'s token! Extra roll awarded!`);
      await delay(500);
      return true;
    }
    return false;
  };

  // Roll dice action
  const handleRoll = useCallback(async () => {
    if (isRolling || turnPhase !== 'roll' || gameOver || lockRef.current) return;
    lockRef.current = true;
    setIsRolling(true);
    sounds.playDice();

    // 1. Tumble 3D dice for 750ms
    const start = Date.now();
    let tmpRoll = 1;
    while (Date.now() - start < 750) {
      tmpRoll = Math.floor(Math.random() * 6) + 1;
      setDisplayedDice(tmpRoll);
      await delay(70);
    }

    // 2. Determine actual roll
    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDisplayedDice(finalRoll);
    setDice(finalRoll);
    setIsRolling(false);
    sounds.playClick();

    // 3. Evaluate legal moves
    const movable = getMovableTokens(currentPId, finalRoll);
    const pName = PLAYERS_DEF[currentPId].name;
    const isBot = isCurrentAI();

    if (movable.length === 0) {
      setStatusMsg(`Player ${pName} rolled ${finalRoll} — no legal moves.`);
      await delay(800);
      passTurn();
      return;
    }

    // Legal moves exist!
    setStatusMsg(`Player ${pName} rolled ${finalRoll}! ${movable.length > 1 ? 'Choose a token to advance.' : 'Moving token...'}`);
    setTurnPhase('select');
    lockRef.current = false;

    // AI automatic token selection
    if (isBot) {
      await delay(500);
      const chosenTokenId = selectAIToken(currentPId, movable, finalRoll, aiDifficulty);
      await executeMove(currentPId, chosenTokenId, finalRoll);
    } else if (movable.length === 1) {
      // Auto move single legal token for human after tiny pause
      await delay(400);
      await executeMove(currentPId, movable[0], finalRoll);
    }
  }, [isRolling, turnPhase, gameOver, currentPId, getMovableTokens, isCurrentAI, aiDifficulty, passTurn, executeMove]);

  // AI Decision Logic (Easy, Medium, Hard)
  const selectAIToken = (
    botPId: number,
    movableIds: number[],
    roll: number,
    difficulty: AIDifficulty
  ): number => {
    if (movableIds.length === 1 || difficulty === 'Easy') {
      return movableIds[Math.floor(Math.random() * movableIds.length)];
    }

    // Evaluate heuristics for Medium & Hard
    let bestId = movableIds[0];
    let bestScore = -9999;

    movableIds.forEach((tokId) => {
      const tok = tokens[botPId][tokId];
      let score = 0;

      // Spawning on 6
      if (tok.step === -1 && roll === 6) {
        score += difficulty === 'Hard' ? 110 : 70;
      } else {
        const targetStep = tok.step + roll;

        // Reaching Goal
        if (targetStep === 56) {
          score += 180;
        }

        // Entering Home Column
        if (targetStep >= 51 && tok.step < 51) {
          score += 100;
        }

        // Progress bonus
        score += targetStep * 1.5;

        // Check potential capture on track
        if (targetStep <= 50) {
          const targetTrackIdx = (PLAYERS_DEF[botPId].startTrackIdx + targetStep) % 52;

          if (!SAFE_TRACK_INDICES.includes(targetTrackIdx)) {
            // Check if any opponent token is on targetTrackIdx
            let wouldCapture = false;
            activePlayerIds.forEach((oppId) => {
              if (oppId === botPId) return;
              tokens[oppId].forEach((oppTok) => {
                if (oppTok.step >= 0 && oppTok.step <= 50) {
                  const oppTrack = (PLAYERS_DEF[oppId].startTrackIdx + oppTok.step) % 52;
                  if (oppTrack === targetTrackIdx) {
                    wouldCapture = true;
                  }
                }
              });
            });

            if (wouldCapture) {
              score += difficulty === 'Hard' ? 220 : 130;
            }
          } else {
            // Reaching safe star square!
            score += difficulty === 'Hard' ? 65 : 40;
          }

          // Hard AI: evaluate vulnerability from behind
          if (difficulty === 'Hard' && !SAFE_TRACK_INDICES.includes(targetTrackIdx)) {
            activePlayerIds.forEach((oppId) => {
              if (oppId === botPId) return;
              tokens[oppId].forEach((oppTok) => {
                if (oppTok.step >= 0 && oppTok.step <= 50) {
                  const oppTrack = (PLAYERS_DEF[oppId].startTrackIdx + oppTok.step) % 52;
                  const dist = (targetTrackIdx - oppTrack + 52) % 52;
                  if (dist >= 1 && dist <= 6) {
                    // Risk of being captured next turn!
                    score -= 40;
                  }
                }
              });
            });
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestId = tokId;
      }
    });

    return bestId;
  };

  // AI Turn Automated Trigger
  useEffect(() => {
    if (gameOver || isRolling || turnPhase !== 'roll') return;
    if (isCurrentAI()) {
      const timer = setTimeout(() => {
        handleRoll();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentTurnIdx, turnPhase, gameOver, isRolling, isCurrentAI, handleRoll]);

  const handleHumanTokenClick = (tokId: number) => {
    if (isCurrentAI() || turnPhase !== 'select' || dice === null || lockRef.current) return;
    const movable = getMovableTokens(currentPId, dice);
    if (!movable.includes(tokId)) return;
    executeMove(currentPId, tokId, dice);
  };

  const resetGame = () => {
    setTokens({
      0: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      1: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      2: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
      3: [{ id: 0, step: -1 }, { id: 1, step: -1 }, { id: 2, step: -1 }, { id: 3, step: -1 }],
    });
    setCurrentTurnIdx(0);
    setTurnPhase('roll');
    setDice(null);
    setDisplayedDice(1);
    setIsRolling(false);
    setBonusRollActive(false);
    setStatusMsg('Roll the 3D dice to start!');
    setGameOver(false);
    setWinnerId(null);
    lockRef.current = false;
  };

  const activeMovableIds = turnPhase === 'select' && dice !== null ? getMovableTokens(currentPId, dice) : [];
  const isAITurn = isCurrentAI();

  return (
    <GameLayout
      game={gameInfo}
      onRestart={resetGame}
      headerControls={
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch: vs AI or PvP */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setMode('ai');
                resetGame();
              }}
              disabled={isRolling || turnPhase === 'moving'}
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
              disabled={isRolling || turnPhase === 'moving'}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                mode === 'pvp' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pass & Play</span>
            </button>
          </div>

          {/* AI Difficulty Selector (when in AI mode) */}
          {mode === 'ai' && (
            <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
              {(['Easy', 'Medium', 'Hard'] as AIDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    aiDifficulty === diff
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          )}

          {/* Player Count */}
          <div className="flex bg-[#0d0e17] p-1 rounded-xl border border-slate-800 text-xs">
            {[2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setPlayerCount(cnt);
                  resetGame();
                }}
                disabled={isRolling || turnPhase === 'moving'}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40 ${
                  playerCount === cnt ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {cnt}P
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="w-full max-w-xl flex flex-col items-center select-none px-2 sm:px-4">
        {/* Turn & 3D Dice Action Bar */}
        <div className="w-full flex items-center justify-between bg-[#121422] border border-slate-800 rounded-3xl py-3 px-5 mb-4 shadow-xl">
          {/* Active Player */}
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full ${currentConfig.bgClass} ring-4 ring-white/20 shadow-lg flex items-center justify-center text-xs font-black text-white relative`}
            >
              {currentConfig.name[0]}
              {isAITurn && (
                <span className="absolute -top-1 -right-1 bg-slate-900 border border-slate-700 text-[9px] rounded-full px-1">
                  🤖
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Current Turn</span>
              <p className={`text-sm font-extrabold flex items-center gap-1.5 ${currentConfig.textClass}`}>
                <span>Player {currentConfig.name}</span>
                {isAITurn ? (
                  <span className="text-[11px] font-semibold text-slate-400">(Bot)</span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-400">(You)</span>
                )}
              </p>
            </div>
          </div>

          {/* Realistic 3D Tumbling Dice Box & Action */}
          <div className="flex items-center gap-3">
            {bonusRollActive && (
              <span className="hidden sm:inline text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md animate-pulse">
                Bonus Roll!
              </span>
            )}
            <div
              className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-slate-200 border-2 border-slate-300 shadow-xl flex items-center justify-center transition-transform ${
                isRolling ? 'anim-dice-spin shadow-violet-500/50' : 'hover:scale-105'
              }`}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
                {DICE_DOTS[displayedDice]?.map(([cx, cy], idx) => (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={8.5}
                    fill={displayedDice === 1 ? '#e11d48' : '#0f172a'}
                  />
                ))}
              </svg>
            </div>

            {/* Roll Dice Button */}
            <button
              onClick={handleRoll}
              disabled={isRolling || turnPhase !== 'roll' || gameOver || isAITurn}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2"
            >
              <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
              <span>
                {isRolling
                  ? 'Rolling...'
                  : turnPhase === 'select'
                  ? 'Pick Token'
                  : turnPhase === 'moving'
                  ? 'Moving...'
                  : isAITurn
                  ? 'Bot Rolling...'
                  : 'Roll Dice'}
              </span>
            </button>
          </div>
        </div>

        {/* Authentic 15x15 Vector Ludo Board (Reference Matching) */}
        <div className="relative w-full aspect-square max-w-[460px] bg-[#f8fafc] rounded-3xl p-2 shadow-2xl border-4 border-slate-800 overflow-hidden">
          <svg viewBox="0 0 15 15" className="w-full h-full select-none block">
            <defs>
              <filter id="ludoShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0.1" stdDeviation="0.08" floodColor="#000000" floodOpacity="0.4" />
              </filter>
              <filter id="ludoTokenGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.12" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Grid Cells */}
            {Array.from({ length: 15 }).map((_, r) =>
              Array.from({ length: 15 }).map((__, c) => {
                // Determine cell type / color
                let fill = '#ffffff';
                let stroke = '#cbd5e1';

                // 1. Red Base (Top-Left 6x6)
                if (r < 6 && c < 6) fill = '#ef4444';
                // 2. Green Base (Top-Right 6x6)
                else if (r < 6 && c > 8) fill = '#10b981';
                // 3. Blue Base (Bottom-Left 6x6)
                else if (r > 8 && c < 6) fill = '#0ea5e9';
                // 4. Yellow Base (Bottom-Right 6x6)
                else if (r > 8 && c > 8) fill = '#eab308';
                // 5. Red Home Path
                else if (r === 7 && c >= 1 && c <= 5) fill = '#ef4444';
                // 6. Green Home Path
                else if (c === 7 && r >= 1 && r <= 5) fill = '#10b981';
                // 7. Yellow Home Path
                else if (r === 7 && c >= 9 && c <= 13) fill = '#eab308';
                // 8. Blue Home Path
                else if (c === 7 && r >= 9 && r <= 13) fill = '#0ea5e9';
                // 9. Start Cells
                else if (r === 6 && c === 1) fill = '#ef4444'; // Red start
                else if (r === 1 && c === 8) fill = '#10b981'; // Green start
                else if (r === 8 && c === 13) fill = '#eab308'; // Yellow start
                else if (r === 13 && c === 6) fill = '#0ea5e9'; // Blue start
                // 10. Center 3x3 Triangles area
                else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) fill = 'transparent';

                return (
                  <rect
                    key={`cell-${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={0.03}
                  />
                );
              })
            )}

            {/* Inner White Yards inside 4 bases */}
            {/* Red Base Inner White Square */}
            <rect x={1} y={1} width={4} height={4} fill="#ffffff" rx={0.4} stroke="#b91c1c" strokeWidth={0.08} />
            {/* Green Base Inner White Square */}
            <rect x={10} y={1} width={4} height={4} fill="#ffffff" rx={0.4} stroke="#047857" strokeWidth={0.08} />
            {/* Yellow Base Inner White Square */}
            <rect x={10} y={10} width={4} height={4} fill="#ffffff" rx={0.4} stroke="#b45309" strokeWidth={0.08} />
            {/* Blue Base Inner White Square */}
            <rect x={1} y={10} width={4} height={4} fill="#ffffff" rx={0.4} stroke="#0369a1" strokeWidth={0.08} />

            {/* 4 Pocket Circles inside each Base Yard */}
            {activePlayerIds.map((pId) =>
              BASE_POCKETS[pId].map((pkt, idx) => (
                <g key={`pocket-${pId}-${idx}`}>
                  <circle cx={pkt.x} cy={pkt.y} r={0.65} fill="#f1f5f9" stroke={PLAYERS_DEF[pId].hex} strokeWidth={0.12} />
                  <circle cx={pkt.x} cy={pkt.y} r={0.45} fill={PLAYERS_DEF[pId].hex} opacity={0.3} />
                </g>
              ))
            )}

            {/* Center Home Goal: 4 Colored Triangles */}
            <g>
              {/* Center box frame */}
              <rect x={6} y={6} width={3} height={3} fill="#ffffff" stroke="#94a3b8" strokeWidth={0.04} />
              {/* Red Left Triangle */}
              <polygon points="6,6 6,9 7.5,7.5" fill="#ef4444" stroke="#b91c1c" strokeWidth={0.04} />
              {/* Green Top Triangle */}
              <polygon points="6,6 9,6 7.5,7.5" fill="#10b981" stroke="#047857" strokeWidth={0.04} />
              {/* Yellow Right Triangle */}
              <polygon points="9,6 9,9 7.5,7.5" fill="#eab308" stroke="#b45309" strokeWidth={0.04} />
              {/* Blue Bottom Triangle */}
              <polygon points="6,9 9,9 7.5,7.5" fill="#0ea5e9" stroke="#0369a1" strokeWidth={0.04} />
            </g>

            {/* Start Tile Directional Arrows */}
            {/* Red start arrow -> (6, 0.5) to (6.8, 0.5) */}
            <text x={0.5} y={6.7} fontSize="0.55" fill="#ef4444" textAnchor="middle" fontWeight="bold">➜</text>
            {/* Green start arrow -> (8.5, 0.5) */}
            <text x={8.5} y={0.7} fontSize="0.55" fill="#10b981" textAnchor="middle" fontWeight="bold">⬇</text>
            {/* Yellow start arrow -> (14.5, 8.7) */}
            <text x={14.5} y={8.7} fontSize="0.55" fill="#eab308" textAnchor="middle" fontWeight="bold">⬅</text>
            {/* Blue start arrow -> (6.5, 14.7) */}
            <text x={6.5} y={14.7} fontSize="0.55" fill="#0ea5e9" textAnchor="middle" fontWeight="bold">⬆</text>

            {/* Safe Star Symbols ⭐ on the 4 Star Cells */}
            {STAR_COORDS.map((st, i) => (
              <text
                key={`star-${i}`}
                x={st.c + 0.5}
                y={st.r + 0.72}
                fontSize="0.55"
                fill="#475569"
                textAnchor="middle"
                fontWeight="black"
              >
                ★
              </text>
            ))}

            {/* RENDER ALL 4 PLAYER TOKENS */}
            {activePlayerIds.map((pId) => {
              const pConfig = PLAYERS_DEF[pId];
              return tokens[pId].map((token) => {
                const coords = getTokenCoords(pId, token);
                const isMovable =
                  pId === currentPId &&
                  turnPhase === 'select' &&
                  activeMovableIds.includes(token.id);

                return (
                  <g
                    key={`tok-${pId}-${token.id}`}
                    onClick={() => handleHumanTokenClick(token.id)}
                    className="transition-all duration-150 ease-out cursor-pointer"
                    transform={`translate(${coords.x}, ${coords.y})`}
                    style={{ pointerEvents: isMovable && !isAITurn ? 'all' : 'none' }}
                  >
                    {/* Glowing Selection Pulse Ring */}
                    {isMovable && (
                      <circle
                        cx={0}
                        cy={0}
                        r={0.55}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={0.08}
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Outer Drop Shadow */}
                    <circle cx={0} cy={0.05} r={0.38} fill="#000000" opacity={0.3} />

                    {/* 3D Pawn Base (White Rim) */}
                    <circle
                      cx={0}
                      cy={0}
                      r={0.38}
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth={0.05}
                      filter="url(#ludoShadow)"
                    />

                    {/* Colored Inner Core */}
                    <circle cx={0} cy={0} r={0.28} fill={pConfig.hex} />

                    {/* Gloss / Specular Highlight */}
                    <circle cx={-0.08} cy={-0.08} r={0.09} fill="#ffffff" opacity={0.7} />

                    {/* Token Number / ID */}
                    <text
                      x={0}
                      y={0.09}
                      fontSize="0.22"
                      fill="#ffffff"
                      fontWeight="black"
                      textAnchor="middle"
                    >
                      {token.id + 1}
                    </text>
                  </g>
                );
              });
            })}
          </svg>
        </div>

        {/* Dynamic Status / Game Feedback */}
        <div className="w-full mt-3 bg-[#121422] border border-slate-800 rounded-2xl px-5 py-3 text-center text-xs text-slate-300 font-semibold shadow-inner flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{statusMsg}</span>
        </div>

        {/* Player Token Progress Cards */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {activePlayerIds.map((pId) => {
            const p = PLAYERS_DEF[pId];
            const pTokens = tokens[pId];
            const homeCount = pTokens.filter((t) => t.step === 56).length;
            const yardCount = pTokens.filter((t) => t.step === -1).length;
            const isTurn = pId === currentPId;

            return (
              <div
                key={`card-${pId}`}
                className={`flex flex-col items-center justify-between p-2 rounded-2xl border transition-all ${
                  isTurn
                    ? 'bg-[#181a2e] border-violet-500/80 shadow-md shadow-violet-500/20'
                    : 'bg-[#10121d] border-slate-800/80 opacity-80'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-3.5 h-3.5 rounded-full ${p.bgClass}`} />
                  <span className={`text-xs font-bold ${p.textClass}`}>{p.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                  <span>Yard: {yardCount}</span>
                  <span>•</span>
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5" />
                    {homeCount}/4
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title={`🎉 Player ${winnerId !== null ? PLAYERS_DEF[winnerId].name : ''} Won!`}
        message={
          mode === 'ai' && winnerId !== 0
            ? 'The Bot claimed all 4 home triangles! Want another match?'
            : 'Unstoppable victory! Guided all 4 tokens safely into the home goal!'
        }
        onRestart={resetGame}
      />
    </GameLayout>
  );
};
