import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Undo2,
  HelpCircle,
  Volume2,
  VolumeX,
  Bot,
  Users,
  Compass,
  ShieldAlert,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BOARD_SIZE,
  WALL_GRID_SIZE,
  STARTING_WALLS,
  getInitialState,
  getLegalPawnMoves,
  validateWallPlacement,
  applyAction,
  undoAction,
  findShortestPath,
  areCellsEqual
} from './gameEngine';
import { getAIMove } from './ai';
import { wallzAudio } from './audio';
import { sounds } from '../../lib/audio';
import { navigate } from '../../lib/router';
import type {
  PlayerId,
  Cell,
  Wall,
  WallOrientation,
  GameState,
  GameMode,
  AIDifficulty
} from './types';

export const WallzArena: React.FC = () => {
  // Game Setup & State
  const [mode, setMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [firstPlayer, setFirstPlayer] = useState<PlayerId>(1);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(() => sounds.isEnabled());

  // Core Game State
  const [state, setState] = useState<GameState>(() =>
    getInitialState('ai', 'medium', 1)
  );

  // Active interaction mode
  const [actionMode, setActionMode] = useState<'move' | 'wall-h' | 'wall-v'>('move');
  const [hoveredWall, setHoveredWall] = useState<{
    r: number;
    c: number;
    orientation: WallOrientation;
  } | null>(null);

  // Status & Feedback
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [invalidFeedback, setInvalidFeedback] = useState<string | null>(null);
  const [turnTransitionBanner, setTurnTransitionBanner] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Dynamic Telemetry: BFS Shortest Paths
  const p1Path = useMemo(
    () => findShortestPath(state.p1, 1, state.walls),
    [state.p1, state.walls]
  );
  const p2Path = useMemo(
    () => findShortestPath(state.p2, 2, state.walls),
    [state.p2, state.walls]
  );

  // Legal pawn moves for active player
  const legalPawnMoves = useMemo(() => {
    if (state.winner !== null) return [];
    if (mode === 'ai' && state.currentTurn === 2) return [];
    return getLegalPawnMoves(state, state.currentTurn);
  }, [state, mode]);

  // Audio Toggle
  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundActive(next);
  };

  // Start new match
  const startNewMatch = (
    newMode = mode,
    newDiff = difficulty,
    newFirst = firstPlayer
  ) => {
    setMode(newMode);
    setDifficulty(newDiff);
    setFirstPlayer(newFirst);
    setState(getInitialState(newMode, newDiff, newFirst));
    setActionMode('move');
    setHoveredWall(null);
    setIsAiThinking(false);
    setInvalidFeedback(null);
    setTurnTransitionBanner(null);
    setShowSetupModal(false);
    setShowConfirmReset(false);
  };

  // Trigger brief invalid message with sound
  const flashInvalid = useCallback((message: string) => {
    wallzAudio.playInvalid();
    setInvalidFeedback(message);
    setTimeout(() => {
      setInvalidFeedback((prev) => (prev === message ? null : prev));
    }, 2400);
  }, []);

  // Handle Player Pawn Move
  const handlePawnMove = useCallback(
    (target: Cell) => {
      if (state.winner !== null || isAiThinking) return;
      if (mode === 'ai' && state.currentTurn === 2) return;

      const isLegal = legalPawnMoves.some((m) => areCellsEqual(m, target));
      if (!isLegal) {
        flashInvalid('Illegal pawn destination');
        return;
      }

      const currentPos = state.currentTurn === 1 ? state.p1 : state.p2;
      const dist = Math.abs(currentPos.r - target.r) + Math.abs(currentPos.c - target.c);
      const isJump = dist > 1;

      if (isJump) {
        wallzAudio.playJump();
      } else {
        wallzAudio.playPawnMove();
      }

      const action = {
        type: 'move' as const,
        player: state.currentTurn,
        from: currentPos,
        to: target,
        isJump
      };

      const nextState = applyAction(state, action);
      setState(nextState);

      // Pass & Play transition banner
      if (mode === 'pass-and-play' && nextState.winner === null) {
        const nextPlayerName = nextState.currentTurn === 1 ? 'Player 1 (Amber)' : 'Player 2 (Cyan)';
        setTurnTransitionBanner(`${nextPlayerName}'s Turn`);
        setTimeout(() => setTurnTransitionBanner(null), 1200);
      }
    },
    [state, isAiThinking, mode, legalPawnMoves, flashInvalid]
  );

  // Handle Wall Placement
  const handlePlaceWall = useCallback(
    (r: number, c: number, orientation: WallOrientation) => {
      if (state.winner !== null || isAiThinking) return;
      if (mode === 'ai' && state.currentTurn === 2) return;

      const player = state.currentTurn;
      const wallsLeft = player === 1 ? state.p1WallsLeft : state.p2WallsLeft;

      if (wallsLeft <= 0) {
        flashInvalid('No walls remaining in your inventory!');
        return;
      }

      const validation = validateWallPlacement(state, r, c, orientation, player);
      if (!validation.valid) {
        flashInvalid(validation.reason || 'Illegal wall placement');
        return;
      }

      wallzAudio.playWallPlace();

      const newWall: Wall = { r, c, orientation, player };
      const action = {
        type: 'wall' as const,
        player,
        wall: newWall
      };

      setHoveredWall(null);
      const nextState = applyAction(state, action);
      setState(nextState);

      // Revert to move mode after placing wall
      setActionMode('move');

      // Pass & Play transition banner
      if (mode === 'pass-and-play' && nextState.winner === null) {
        const nextPlayerName = nextState.currentTurn === 1 ? 'Player 1 (Amber)' : 'Player 2 (Cyan)';
        setTurnTransitionBanner(`${nextPlayerName}'s Turn`);
        setTimeout(() => setTurnTransitionBanner(null), 1200);
      }
    },
    [state, isAiThinking, mode, flashInvalid]
  );

  // Trigger AI move when it's AI turn
  useEffect(() => {
    if (mode !== 'ai' || state.winner !== null) return;
    if (state.currentTurn !== 2) return;

    setIsAiThinking(true);

    const timer = setTimeout(() => {
      try {
        const aiAction = getAIMove(state, difficulty, 2);

        if (aiAction.type === 'move') {
          const currentPos = state.p2;
          const dist = Math.abs(currentPos.r - aiAction.to.r) + Math.abs(currentPos.c - aiAction.to.c);
          if (dist > 1) {
            wallzAudio.playJump();
          } else {
            wallzAudio.playPawnMove();
          }
        } else if (aiAction.type === 'wall') {
          wallzAudio.playWallPlace();
        }

        setState((curr) => applyAction(curr, aiAction));
      } catch (err) {
        console.error('AI calculation error:', err);
      } finally {
        setIsAiThinking(false);
      }
    }, 600); // realistic strategic pacing

    return () => clearTimeout(timer);
  }, [state, mode, difficulty]);

  // Handle Victory fanfare
  useEffect(() => {
    if (state.winner !== null) {
      wallzAudio.playVictory();
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: state.winner === 1 ? ['#f97316', '#f59e0b', '#fbbf24'] : ['#06b6d4', '#14b8a6', '#38bdf8']
        });
      } catch {
        // ignore confetti errors
      }
    }
  }, [state.winner]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0 || isAiThinking || state.winner !== null) return;
    sounds.playClick();
    const stepsToUndo = mode === 'ai' ? 2 : 1;
    const nextState = undoAction(state, stepsToUndo);
    setState(nextState);
    setHoveredWall(null);
  }, [state, isAiThinking, mode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSetupModal || showHowToPlay) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        setActionMode('move');
      } else if (key === 'h') {
        setActionMode('wall-h');
      } else if (key === 'v') {
        setActionMode('wall-v');
      } else if (key === 'u') {
        handleUndo();
      } else if (key === 'r') {
        setShowConfirmReset(true);
      } else if (key === 'escape') {
        setHoveredWall(null);
        setActionMode('move');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, showSetupModal, showHowToPlay]);

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100 antialiased selection:bg-orange-500 selection:text-black">
      {/* 1. TOP RESPONSIVE HEADER BAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#08090d]/90 border-b border-white/10 px-3 sm:px-6 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                sounds.playClick();
                navigate('/');
              }}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
              title="Return to Games library"
            >
              <span>←</span>
              <span className="hidden min-[380px]:inline">Games</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="text-lg sm:text-2xl shrink-0">🧱</span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-black text-white leading-tight truncate flex items-center gap-1">
                  <span>Wallz</span>
                  <span className="text-orange-400 font-semibold text-xs sm:text-sm">Arena</span>
                </h1>
                <div className="text-[10px] text-slate-400 font-mono hidden sm:block truncate">
                  {mode === 'ai' ? `1 vs AI • ${difficulty.toUpperCase()}` : 'Pass & Play • 2P'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls: Setup, How to Play, Sound, Undo, Reset */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={toggleSound}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer shrink-0"
              title={soundActive ? 'Mute Sound' : 'Enable Sound'}
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setShowHowToPlay(true);
              }}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all cursor-pointer shrink-0"
              title="Rules & How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={handleUndo}
              disabled={state.moveHistory.length === 0 || isAiThinking || state.winner !== null}
              className={`inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                state.moveHistory.length > 0 && !isAiThinking && state.winner === null
                  ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                  : 'opacity-40 text-slate-500 border-white/5 cursor-not-allowed'
              }`}
              title="Undo last action"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setShowConfirmReset(true);
              }}
              className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer shrink-0"
              title="Restart match or change settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Match</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN ARENA CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex flex-col items-center justify-between gap-2 sm:gap-3 overflow-x-hidden">
        {/* COMPACT PLAYER TELEMETRY PANELS */}
        <div className="w-full max-w-[720px] flex items-center justify-between gap-1.5 sm:gap-2 px-1">
          {/* Player 2 / AI Card (TOP) */}
          <div
            className={`flex-1 min-w-0 rounded-xl sm:rounded-2xl p-2 sm:p-3 border transition-all duration-300 ${
              state.currentTurn === 2 && state.winner === null
                ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'bg-[#111422] border-white/5 opacity-85'
            }`}
          >
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                  {mode === 'ai' ? <Bot className="w-4 h-4 sm:w-5 sm:h-5" /> : <Users className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-sm font-bold text-white flex items-center gap-1 truncate">
                    <span className="truncate">{mode === 'ai' ? `AI (${difficulty})` : 'Player 2'}</span>
                    {state.currentTurn === 2 && state.winner === null && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-cyan-300/80 font-mono truncate">
                    🏁 {p2Path.distance === Infinity ? 'Blocked' : `${p2Path.distance} to row 8`}
                  </div>
                </div>
              </div>

              {/* Walls Left (Number + Miniature Rack) */}
              <div className="flex flex-col items-end shrink-0 pl-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400">Walls</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm sm:text-lg font-black text-cyan-400">{state.p2WallsLeft}</span>
                  <div className="hidden sm:flex gap-0.5">
                    {Array.from({ length: STARTING_WALLS }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-xs transition-all ${
                          i < state.p2WallsLeft ? 'bg-cyan-400 shadow-[0_0_4px_rgba(6,182,212,0.8)]' : 'bg-slate-700/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VS / Turn Badge */}
          <div className="shrink-0 flex flex-col items-center justify-center px-1">
            <div className="text-[9px] sm:text-[10px] font-mono uppercase text-slate-500 font-bold">Turn</div>
            <div className="text-xs sm:text-base font-black text-slate-300 font-mono">{state.turnCount}</div>
          </div>

          {/* Player 1 Card (BOTTOM) */}
          <div
            className={`flex-1 min-w-0 rounded-xl sm:rounded-2xl p-2 sm:p-3 border transition-all duration-300 ${
              state.currentTurn === 1 && state.winner === null
                ? 'bg-orange-950/40 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                : 'bg-[#111422] border-white/5 opacity-85'
            }`}
          >
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-sm font-bold text-white flex items-center gap-1 truncate">
                    <span className="truncate">{mode === 'ai' ? 'You (P1)' : 'Player 1'}</span>
                    {state.currentTurn === 1 && state.winner === null && (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-amber-300/80 font-mono truncate">
                    🏁 {p1Path.distance === Infinity ? 'Blocked' : `${p1Path.distance} to row 0`}
                  </div>
                </div>
              </div>

              {/* Walls Left (Number + Miniature Rack) */}
              <div className="flex flex-col items-end shrink-0 pl-1">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono text-slate-400">Walls</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm sm:text-lg font-black text-amber-400">{state.p1WallsLeft}</span>
                  <div className="hidden sm:flex gap-0.5">
                    {Array.from({ length: STARTING_WALLS }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-xs transition-all ${
                          i < state.p1WallsLeft ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.8)]' : 'bg-slate-700/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATION FEEDBACK PILLS (AI Thinking / Invalid feedback / Turn notification) */}
        <div className="min-h-[28px] flex items-center justify-center w-full max-w-[760px] px-2">
          {isAiThinking && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold animate-pulse shadow-md">
              <Bot className="w-3.5 h-3.5 animate-spin" />
              <span>AI is calculating strategic moves & paths...</span>
            </div>
          )}

          {invalidFeedback && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold animate-bounce shadow-md">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{invalidFeedback}</span>
            </div>
          )}

          {turnTransitionBanner && !invalidFeedback && !isAiThinking && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold animate-fadeIn shadow-md">
              <Compass className="w-3.5 h-3.5" />
              <span>{turnTransitionBanner}</span>
            </div>
          )}
        </div>

        {/* 3. THE PROMINENT 9x9 BOARD (Dominant Desktop 650-780px, Responsive Mobile) */}
        <div className="w-full max-w-full flex items-center justify-center relative touch-manipulation select-none overflow-hidden px-1">
          <div
            ref={boardRef}
            className="aspect-square bg-[#0b0d18] border-2 sm:border-[3px] border-slate-700/60 rounded-2xl sm:rounded-3xl p-1.5 sm:p-3.5 shadow-[0_12px_45px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] relative overflow-hidden"
            style={{
              width: 'min(94vw, calc(100vh - 250px), 720px)',
              maxWidth: '100%',
              display: 'grid',
              gridTemplateColumns:
                'repeat(8, minmax(0, 1fr) clamp(6px, 1.6vw, 15px)) minmax(0, 1fr)',
              gridTemplateRows:
                'repeat(8, minmax(0, 1fr) clamp(6px, 1.6vw, 15px)) minmax(0, 1fr)'
            }}
          >
            {/* GOAL LINE ACCENT MARKERS */}
            {/* Top row (P1 Goal) - Subtle warm glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0 pointer-events-none" />
            {/* Bottom row (P2 Goal) - Subtle cyan glow */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/60 to-cyan-500/0 pointer-events-none" />

            {/* 81 PLAYABLE SQUARE CELLS */}
            {Array.from({ length: BOARD_SIZE }).map((_, r) =>
              Array.from({ length: BOARD_SIZE }).map((_, c) => {
                const isP1 = state.p1.r === r && state.p1.c === c;
                const isP2 = state.p2.r === r && state.p2.c === c;
                const isLegalDestination = legalPawnMoves.some((m) => m.r === r && m.c === c);
                const isGoalForP1 = r === 0;
                const isGoalForP2 = r === 8;

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    onClick={() => {
                      if (isLegalDestination) {
                        handlePawnMove({ r, c });
                      } else if ((isP1 && state.currentTurn === 1) || (isP2 && state.currentTurn === 2)) {
                        setActionMode('move');
                      }
                    }}
                    style={{
                      gridRow: 2 * r + 1,
                      gridColumn: 2 * c + 1
                    }}
                    className={`relative rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                      isLegalDestination
                        ? 'bg-orange-500/20 border-2 border-orange-400/80 shadow-[0_0_12px_rgba(249,115,22,0.4)] hover:bg-orange-500/35 scale-[1.03] z-10'
                        : isGoalForP1
                        ? 'bg-[#15192c] hover:bg-[#1b2038] border border-amber-500/20'
                        : isGoalForP2
                        ? 'bg-[#15192c] hover:bg-[#1b2038] border border-cyan-500/20'
                        : 'bg-[#131627] hover:bg-[#191d33] border border-white/5'
                    }`}
                  >
                    {/* Legal move destination indicator */}
                    {isLegalDestination && (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-orange-400 shadow-md animate-pulse" />
                    )}

                    {/* PLAYER 1 PAWN */}
                    {isP1 && (
                      <div className="w-4/5 h-4/5 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 p-0.5 sm:p-1 flex items-center justify-center shadow-[0_0_18px_rgba(249,115,22,0.8)] border border-amber-300 transition-all transform scale-100 z-10">
                        <Flame className="w-full h-full text-slate-950 drop-shadow-sm" />
                      </div>
                    )}

                    {/* PLAYER 2 / AI PAWN */}
                    {isP2 && (
                      <div className="w-4/5 h-4/5 rounded-full bg-gradient-to-tr from-cyan-400 via-teal-500 to-cyan-500 p-0.5 sm:p-1 flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.8)] border border-cyan-200 transition-all transform scale-100 z-10">
                        {mode === 'ai' ? (
                          <Bot className="w-full h-full text-slate-950 drop-shadow-sm" />
                        ) : (
                          <Users className="w-full h-full text-slate-950 drop-shadow-sm" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* PLACED WALLS */}
            {state.walls.map((w, idx) => {
              const isH = w.orientation === 'H';
              const isP1Wall = w.player === 1;

              return (
                <div
                  key={`wall-${idx}`}
                  style={{
                    gridRow: isH ? 2 * w.r + 2 : `${2 * w.r + 1} / span 3`,
                    gridColumn: isH ? `${2 * w.c + 1} / span 3` : 2 * w.c + 2
                  }}
                  className={`z-20 rounded-md transition-all shadow-lg ${
                    isP1Wall
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                      : 'bg-gradient-to-r from-cyan-400 via-teal-500 to-cyan-500 border border-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  }`}
                />
              );
            })}

            {/* WALL GHOST PREVIEW (Hover or Selected) */}
            {hoveredWall && (
              <div
                style={{
                  gridRow:
                    hoveredWall.orientation === 'H'
                      ? 2 * hoveredWall.r + 2
                      : `${2 * hoveredWall.r + 1} / span 3`,
                  gridColumn:
                    hoveredWall.orientation === 'H'
                      ? `${2 * hoveredWall.c + 1} / span 3`
                      : 2 * hoveredWall.c + 2
                }}
                className={`z-30 rounded-md pointer-events-none transition-all ${
                  validateWallPlacement(
                    state,
                    hoveredWall.r,
                    hoveredWall.c,
                    hoveredWall.orientation,
                    state.currentTurn
                  ).valid
                    ? state.currentTurn === 1
                      ? 'bg-orange-400/80 border-2 border-amber-300 shadow-[0_0_16px_rgba(249,115,22,0.9)] animate-pulse'
                      : 'bg-cyan-400/80 border-2 border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.9)] animate-pulse'
                    : 'bg-rose-500/80 border-2 border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.9)] animate-bounce'
                }`}
              />
            )}

            {/* INTERACTIVE WALL SLOTS (TOUCH & HOVER HIT AREAS) */}
            {Array.from({ length: WALL_GRID_SIZE }).map((_, r) =>
              Array.from({ length: WALL_GRID_SIZE }).map((_, c) => {
                const currentOrientation = actionMode === 'wall-v' ? 'V' : 'H';

                return (
                  <button
                    key={`slot-${r}-${c}`}
                    type="button"
                    style={{
                      gridRow: 2 * r + 2,
                      gridColumn: 2 * c + 2
                    }}
                    onMouseEnter={() => {
                      if (actionMode !== 'move') {
                        setHoveredWall({ r, c, orientation: currentOrientation });
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoveredWall?.r === r && hoveredWall?.c === c) {
                        setHoveredWall(null);
                      }
                    }}
                    onClick={() => {
                      if (actionMode === 'wall-h') {
                        handlePlaceWall(r, c, 'H');
                      } else if (actionMode === 'wall-v') {
                        handlePlaceWall(r, c, 'V');
                      } else {
                        // In move mode, clicking a slot previews horizontal wall
                        setActionMode('wall-h');
                        setHoveredWall({ r, c, orientation: 'H' });
                      }
                    }}
                    aria-label={`Wall slot (${r}, ${c})`}
                    className="z-10 w-full h-full rounded-xs bg-slate-800/20 hover:bg-white/20 transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <span className="w-1 h-1 rounded-full bg-white/20 pointer-events-none" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 4. BALANCED TACTICAL CONTROLS BAR (Move, Horizontal Wall, Vertical Wall) */}
        <div className="w-full max-w-[720px] flex items-center justify-center gap-1.5 sm:gap-3 p-1.5 bg-[#101322] border border-white/10 rounded-2xl shadow-lg">
          {/* Action 1: Move Pawn */}
          <button
            onClick={() => {
              sounds.playClick();
              setActionMode('move');
              setHoveredWall(null);
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              actionMode === 'move'
                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Move</span>
            <span className="text-[10px] opacity-70 hidden md:inline font-mono">[M]</span>
          </button>

          {/* Action 2: Horizontal Wall */}
          <button
            onClick={() => {
              sounds.playClick();
              setActionMode('wall-h');
              if (hoveredWall) {
                setHoveredWall({ ...hoveredWall, orientation: 'H' });
              }
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              actionMode === 'wall-h'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="text-sm sm:text-base leading-none font-black shrink-0">━</span>
            <span className="truncate">Horiz<span className="hidden sm:inline">ontal</span></span>
            <span className="text-[10px] opacity-70 hidden md:inline font-mono">[H]</span>
          </button>

          {/* Action 3: Vertical Wall */}
          <button
            onClick={() => {
              sounds.playClick();
              setActionMode('wall-v');
              if (hoveredWall) {
                setHoveredWall({ ...hoveredWall, orientation: 'V' });
              }
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              actionMode === 'wall-v'
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="text-sm sm:text-base leading-none font-black shrink-0">┃</span>
            <span className="truncate">Vert<span className="hidden sm:inline">ical</span></span>
            <span className="text-[10px] opacity-70 hidden md:inline font-mono">[V]</span>
          </button>
        </div>
      </main>

      {/* 5. VICTORY MODAL OVERLAY */}
      {state.winner !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#0c0e18]/95 backdrop-blur-2xl border border-white/10 p-6 sm:p-7 text-center shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30 font-black">
              🏆
            </div>

            <h2 className="text-2xl font-black text-white mb-1">
              {state.winner === 1
                ? mode === 'ai'
                  ? 'Victory Achieved!'
                  : 'Player 1 Wins!'
                : mode === 'ai'
                ? 'AI Victorious!'
                : 'Player 2 Wins!'}
            </h2>
            <p className="text-sm text-slate-300 mb-5">
              {state.winner === 1
                ? 'You successfully navigated through the arena and crossed the goal line first!'
                : mode === 'ai'
                ? 'The AI calculated an optimal route and out-maneuvered your defenses.'
                : 'Player 2 reached the goal line first in a thrilling match!'}
            </p>

            <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/10 mb-6 flex items-center justify-around text-xs font-mono">
              <div>
                <span className="text-slate-400 block">Total Turns</span>
                <span className="text-lg font-bold text-white">{state.turnCount}</span>
              </div>
              <div className="border-l border-white/10 pl-4">
                <span className="text-slate-400 block">Walls Used</span>
                <span className="text-lg font-bold text-amber-300">
                  {STARTING_WALLS * 2 - state.p1WallsLeft - state.p2WallsLeft}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  sounds.playClick();
                  startNewMatch();
                }}
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-950" />
                <span>Rematch</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  setShowSetupModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
              >
                Change Game Mode / Difficulty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SETUP / NEW GAME MODAL */}
      {(showSetupModal || showConfirmReset) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#0d0f1a] border border-white/10 p-6 shadow-2xl text-left">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <span>⚔️ Wallz: Strategy Arena</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select your match format, opponent, and opening move rules.
            </p>

            {/* Mode selection */}
            <div className="mb-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'ai'
                      ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-5 h-5 text-orange-400" />
                  <span className="text-xs font-bold">1 vs AI</span>
                  <span className="text-[10px] text-slate-400">Play against engine</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('pass-and-play')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'pass-and-play'
                      ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-bold">Pass & Play</span>
                  <span className="text-[10px] text-slate-400">Two humans on device</span>
                </button>
              </div>
            </div>

            {/* AI Difficulty (if mode === 'ai') */}
            {mode === 'ai' && (
              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  AI Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                        difficulty === diff
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* First Move Selection */}
            <div className="mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Who Moves First?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFirstPlayer(1)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    firstPlayer === 1
                      ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'ai' ? 'You First (P1)' : 'Player 1 First'}
                </button>
                <button
                  type="button"
                  onClick={() => setFirstPlayer(2)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    firstPlayer === 2
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'ai' ? 'AI First (P2)' : 'Player 2 First'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSetupModal(false);
                  setShowConfirmReset(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startNewMatch(mode, difficulty, firstPlayer)}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-orange-500/30 cursor-pointer"
              >
                Start Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. HOW TO PLAY / RULES MODAL */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0d0f1a] border border-white/10 p-6 text-left shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span>📖 Strategy Manual</span>
                <span className="text-orange-400">Wallz Arena</span>
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div>
                <h4 className="font-bold text-orange-400 uppercase tracking-wide text-xs mb-1">
                  🎯 Objective
                </h4>
                <p>
                  Be the first player whose pawn reaches any square on the opponent's starting edge
                  (Row 0 for Player 1, Row 8 for Player 2).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-orange-400 uppercase tracking-wide text-xs mb-1">
                  ⚡ Turns & Actions
                </h4>
                <p>
                  Each turn, you perform exactly <strong>one action</strong>:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                  <li><strong>Move Pawn:</strong> Step one square horizontally or vertically.</li>
                  <li><strong>Place Wall:</strong> Deploy one of your 10 walls horizontally or vertically.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-orange-400 uppercase tracking-wide text-xs mb-1">
                  🦘 Jumping Pawns
                </h4>
                <p>
                  When two pawns face each other directly with no wall between them:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                  <li>
                    <strong>Straight Jump:</strong> If the square behind the opponent is open, you jump directly over them!
                  </li>
                  <li>
                    <strong>Diagonal Jump:</strong> If a wall or board edge blocks the straight jump, you can jump diagonally to either side of the opponent.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-orange-400 uppercase tracking-wide text-xs mb-1">
                  🧱 Wall Rules & Pathfinding
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Walls span two square edges and block movement between them.</li>
                  <li>Walls cannot overlap or cross each other.</li>
                  <li>
                    <strong>Golden Rule:</strong> You can never completely trap an opponent. Both players must ALWAYS retain at least one open path to their goal row!
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Keyboard Shortcuts
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#141728] px-2.5 py-1 rounded-lg border border-white/5 flex justify-between">
                    <code className="text-orange-400">M</code>
                    <span className="text-slate-400">Move Pawn</span>
                  </div>
                  <div className="bg-[#141728] px-2.5 py-1 rounded-lg border border-white/5 flex justify-between">
                    <code className="text-orange-400">H</code>
                    <span className="text-slate-400">Horizontal Wall</span>
                  </div>
                  <div className="bg-[#141728] px-2.5 py-1 rounded-lg border border-white/5 flex justify-between">
                    <code className="text-orange-400">V</code>
                    <span className="text-slate-400">Vertical Wall</span>
                  </div>
                  <div className="bg-[#141728] px-2.5 py-1 rounded-lg border border-white/5 flex justify-between">
                    <code className="text-orange-400">U</code>
                    <span className="text-slate-400">Undo Action</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
