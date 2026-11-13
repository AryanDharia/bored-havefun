import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import type {
  GameMode,
  SequencePhase,
  RoundAttempt
} from './reactionEngine';
import {
  TOTAL_ROUNDS,
  LIGHTS_COUNT,
  LIGHT_INTERVAL_MS,
  getRandomHoldDuration,
  evaluateReaction,
  calculatePlayerStats,
  getRating,
  determineWinner,
  getPersonalBestMs,
  savePersonalBestMs
} from './reactionEngine';
import { reactionAudio } from './reactionAudio';
import { CockpitView } from './CockpitView';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Zap,
  Users,
  Trophy,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

export const ReactionTest: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'reaction-test')!;

  // Game configuration
  const [mode, setMode] = useState<GameMode | null>(null);
  const [phase, setPhase] = useState<SequencePhase>('IDLE');
  const [activeLightsCount, setActiveLightsCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => !reactionAudio.getMuted());

  // Current Turn tracking
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<0 | 1>(0); // 0 = Player 1, 1 = Player 2
  const [currentRoundNumber, setCurrentRoundNumber] = useState<number>(1); // 1 to 5
  const [currentMs, setCurrentMs] = useState<number | null>(null);
  const [isPersonalBest, setIsPersonalBest] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Attempt histories
  const [p1Attempts, setP1Attempts] = useState<RoundAttempt[]>([]);
  const [p2Attempts, setP2Attempts] = useState<RoundAttempt[]>([]);

  // Persistent record
  const [personalBest, setPersonalBest] = useState<number>(() => getPersonalBestMs());

  // High-precision refs for input latency elimination & anti-cheat
  const signalTimestampRef = useRef<number>(0);
  const hasActedRef = useRef<boolean>(false);
  const lightTimeoutsRef = useRef<number[]>([]);
  const holdTimeoutRef = useRef<number | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  // Clear all pending gantry timers
  const clearAllTimers = useCallback(() => {
    lightTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    lightTimeoutsRef.current = [];
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (autoAdvanceTimeoutRef.current) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Audio Toggle
  const toggleSound = () => {
    const nextMuted = reactionAudio.toggleMute();
    setSoundEnabled(!nextMuted);
  };

  // Start a fresh game session
  const startNewGame = (selectedMode: GameMode) => {
    clearAllTimers();
    setMode(selectedMode);
    setPhase('IDLE');
    setCurrentPlayerIndex(0);
    setCurrentRoundNumber(1);
    setCurrentMs(null);
    setIsPersonalBest(false);
    setIsShaking(false);
    setP1Attempts([]);
    setP2Attempts([]);
    setActiveLightsCount(0);
    hasActedRef.current = false;
  };

  // Trigger starting lights sequence for the current round
  const stageRound = useCallback(() => {
    clearAllTimers();
    setPhase('STAGING');
    setActiveLightsCount(0);
    setCurrentMs(null);
    setIsPersonalBest(false);
    setIsShaking(false);
    hasActedRef.current = false;

    // Brief 500ms staging pause, then light 1..5 in sequence
    const stageDelay = 500;
    const timeouts: number[] = [];

    for (let i = 1; i <= LIGHTS_COUNT; i++) {
      const timeoutId = window.setTimeout(() => {
        setActiveLightsCount(i);
        setPhase('LIGHTS_ON');
        reactionAudio.playLightBeep(i - 1);

        // When all 5 lights are illuminated, begin randomized hold
        if (i === LIGHTS_COUNT) {
          setPhase('HOLDING');
          const holdDuration = getRandomHoldDuration();

          holdTimeoutRef.current = window.setTimeout(() => {
            // LIGHTS OUT! The exact moment player must react
            setActiveLightsCount(0);
            setPhase('LIGHTS_OUT');
            signalTimestampRef.current = performance.now();
            reactionAudio.playLightsOut();
          }, holdDuration);
        }
      }, stageDelay + (i - 1) * LIGHT_INTERVAL_MS);

      timeouts.push(timeoutId);
    }

    lightTimeoutsRef.current = timeouts;
  }, [clearAllTimers]);

  // Record completed attempt for current player and schedule next step
  const recordAttempt = useCallback(
    (attempt: RoundAttempt) => {
      if (currentPlayerIndex === 0) {
        setP1Attempts((prev) => [...prev, attempt]);
      } else {
        setP2Attempts((prev) => [...prev, attempt]);
      }

      // Automatically advance to next round after 2.8 seconds of result display
      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        advanceWorkflow(attempt);
      }, 2800);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPlayerIndex, mode, currentRoundNumber]
  );

  // Workflow engine: move to next round, handover, or final game over
  const advanceWorkflow = useCallback(
    (_lastAttempt?: RoundAttempt) => {
      clearAllTimers();

      if (mode === 'BEST_OF_5') {
        if (currentRoundNumber >= TOTAL_ROUNDS) {
          setPhase('GAME_OVER');
        } else {
          setCurrentRoundNumber((prev) => prev + 1);
          setPhase('IDLE');
          hasActedRef.current = false;
          setActiveLightsCount(0);
          setCurrentMs(null);
        }
      } else if (mode === 'VS_FRIEND') {
        if (currentPlayerIndex === 0) {
          // Player 1 finished this round -> Handover to Player 2
          setCurrentPlayerIndex(1);
          setPhase('HANDOVER');
          hasActedRef.current = false;
          setActiveLightsCount(0);
          setCurrentMs(null);
        } else {
          // Player 2 finished this round
          if (currentRoundNumber >= TOTAL_ROUNDS) {
            setPhase('GAME_OVER');
          } else {
            // Handover back to Player 1 for next round
            setCurrentPlayerIndex(0);
            setCurrentRoundNumber((prev) => prev + 1);
            setPhase('HANDOVER');
            hasActedRef.current = false;
            setActiveLightsCount(0);
            setCurrentMs(null);
          }
        }
      }
    },
    [clearAllTimers, mode, currentRoundNumber, currentPlayerIndex]
  );

  // PRIMARY HIGH-PRECISION POINTER EVENT HANDLER
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const inputTimestamp = performance.now();

      // Guard: If player already acted in this round, ignore extra/multitouch taps
      if (hasActedRef.current && (phase === 'LIGHTS_OUT' || phase === 'HOLDING' || phase === 'LIGHTS_ON' || phase === 'STAGING')) {
        return;
      }

      // 1. In IDLE or HANDOVER: Tap anywhere in cockpit to start staging
      if (phase === 'IDLE') {
        stageRound();
        return;
      }

      if (phase === 'HANDOVER') {
        setPhase('IDLE');
        stageRound();
        return;
      }

      // 2. In RESULT or FALSE_START: Tap to skip waiting and advance immediately
      if (phase === 'RESULT' || phase === 'FALSE_START') {
        if (autoAdvanceTimeoutRef.current) {
          window.clearTimeout(autoAdvanceTimeoutRef.current);
          autoAdvanceTimeoutRef.current = null;
        }
        advanceWorkflow();
        return;
      }

      // 3. FALSE START / JUMP START: Tapped before lights turned off
      if (phase === 'STAGING' || phase === 'LIGHTS_ON' || phase === 'HOLDING') {
        hasActedRef.current = true;
        clearAllTimers();
        setActiveLightsCount(0);
        setPhase('FALSE_START');
        setIsShaking(true);
        reactionAudio.playFalseStart();

        setTimeout(() => setIsShaking(false), 450);

        const falseStartAttempt: RoundAttempt = {
          roundNumber: currentRoundNumber,
          playerIndex: currentPlayerIndex,
          reactionMs: null,
          isFalseStart: true,
          signalTimestamp: 0,
          inputTimestamp
        };
        recordAttempt(falseStartAttempt);
        return;
      }

      // 4. VALID REACTION: Tapped immediately upon LIGHTS_OUT
      if (phase === 'LIGHTS_OUT') {
        hasActedRef.current = true;
        const reactionMs = evaluateReaction(signalTimestampRef.current, inputTimestamp);

        setCurrentMs(reactionMs);
        setPhase('RESULT');

        // Check & save personal record in Single Player mode
        let newRecord = false;
        if (mode === 'BEST_OF_5') {
          newRecord = savePersonalBestMs(reactionMs);
          if (newRecord) {
            setIsPersonalBest(true);
            setPersonalBest(reactionMs);
            reactionAudio.playPersonalBest();
          } else {
            reactionAudio.playSuccess();
          }
        } else {
          reactionAudio.playSuccess();
        }

        const validAttempt: RoundAttempt = {
          roundNumber: currentRoundNumber,
          playerIndex: currentPlayerIndex,
          reactionMs,
          isFalseStart: false,
          signalTimestamp: signalTimestampRef.current,
          inputTimestamp
        };
        recordAttempt(validAttempt);
      }
    },
    [phase, stageRound, advanceWorkflow, clearAllTimers, currentRoundNumber, currentPlayerIndex, mode, recordAttempt]
  );

  // Compute final statistics
  const p1Stats = calculatePlayerStats('Player 1', p1Attempts);
  const p2Stats = calculatePlayerStats('Player 2', p2Attempts);
  const vsOutcome = mode === 'VS_FRIEND' ? determineWinner(p1Stats, p2Stats) : null;

  const currentHistory = currentPlayerIndex === 0 ? p1Attempts : p2Attempts;
  const currentPlayerName = mode === 'VS_FRIEND' ? (currentPlayerIndex === 0 ? 'Player 1' : 'Player 2') : 'Player 1';

  return (
    <GameLayout
      game={gameInfo}
      onRestart={() => startNewGame(mode || 'BEST_OF_5')}
      headerControls={
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Mode Switcher */}
          {mode && (
            <button
              onClick={() => {
                clearAllTimers();
                setMode(null);
                setPhase('IDLE');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-xs font-bold font-mono cursor-pointer"
            >
              Mode Menu
            </button>
          )}
        </div>
      }
    >
      <div className="w-full max-w-4xl flex flex-col items-center select-none px-2 sm:px-4">
        {/* ========================================== */}
        {/* VIEW 1: GAME MODE SELECTION MENU */}
        {/* ========================================== */}
        {!mode && (
          <div className="w-full max-w-2xl flex flex-col items-center py-6 sm:py-10 text-center animate-fade-in">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="w-3.5 h-3.5" />
              Formula Starting Grid Reaction
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3 font-display">
              REACTION SPEED TEST
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
              Step into the cockpit, lock your eyes onto the five red starting lights, and launch the instant all lights switch OFF.
            </p>

            {/* Mode Cards Grid (Strictly 2 Modes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
              {/* MODE A: BEST OF 5 */}
              <div
                onClick={() => startNewGame('BEST_OF_5')}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#141724] to-[#0c0e17] border border-slate-800 hover:border-orange-500/60 transition-all cursor-pointer shadow-xl hover:shadow-orange-500/10 flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider mb-1">
                    Solo Challenge
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Best of 5</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Complete 5 starting grid launches with randomized holds. Live telemetry, personal best tracking, and reflex rating.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-orange-400 group-hover:text-orange-300">
                  <span>Enter Cockpit</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* MODE B: VS FRIEND (PASS & PLAY) */}
              <div
                onClick={() => startNewGame('VS_FRIEND')}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#141724] to-[#0c0e17] border border-slate-800 hover:border-cyan-500/60 transition-all cursor-pointer shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between text-left"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    Local 2-Player
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">VS Friend</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Pass &amp; play head-to-head on the same device. 5 alternating attempts each with independent delays and head-to-head debrief.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                  <span>Start Duel</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Personal Record Pill */}
            {personalBest > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 shadow">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Personal Best Reaction:</span>
                <span className="text-amber-400 font-black">{personalBest}ms</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 2: ACTIVE COCKPIT RACE VIEW */}
        {/* ========================================== */}
        {mode && phase !== 'GAME_OVER' && phase !== 'HANDOVER' && (
          <div className="w-full flex flex-col items-center gap-3">
            {/* Main Interactive First-Person Cockpit */}
            <CockpitView
              phase={phase}
              activeLightsCount={activeLightsCount}
              currentMs={currentMs}
              roundNumber={currentRoundNumber}
              totalRounds={TOTAL_ROUNDS}
              playerIndex={currentPlayerIndex}
              playerName={currentPlayerName}
              bestMs={mode === 'BEST_OF_5' ? personalBest : null}
              isPersonalBest={isPersonalBest}
              isShaking={isShaking}
              history={currentHistory}
              onPointerDown={handlePointerDown}
            />

            {/* Quick Action Button below Cockpit for Mobile Ergonomics */}
            <div className="w-full max-w-md flex items-center justify-between gap-3 px-1 mt-1">
              <span className="text-[11px] font-mono text-slate-400">
                {phase === 'IDLE' && 'READY • TAP COCKPIT OR BUTTON TO START'}
                {phase === 'STAGING' && 'WATCHING GANTRY LIGHTS...'}
                {phase === 'LIGHTS_ON' && 'HOLD STILL... DO NOT JUMP START'}
                {phase === 'HOLDING' && 'READY TO LAUNCH...'}
                {phase === 'LIGHTS_OUT' && '⚡ REACT AS FAST AS POSSIBLE!'}
                {phase === 'RESULT' && 'ROUND RECORDED • TAP TO PROCEED'}
                {phase === 'FALSE_START' && 'PENALTY • TAP TO RETRY'}
              </span>

              {phase === 'IDLE' && (
                <button
                  type="button"
                  onClick={stageRound}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                >
                  Stage Start
                </button>
              )}

              {(phase === 'RESULT' || phase === 'FALSE_START') && (
                <button
                  type="button"
                  onClick={() => advanceWorkflow()}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
                >
                  Next Round
                </button>
              )}
            </div>

            {/* Live Round Telemetry Grid */}
            <div className="w-full max-w-xl grid grid-cols-5 gap-2 mt-2">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                const attempt = currentHistory[i];
                const isCurrent = i === currentRoundNumber - 1 && phase !== 'RESULT' && phase !== 'FALSE_START';

                return (
                  <div
                    key={i}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      attempt
                        ? attempt.isFalseStart
                          ? 'bg-red-950/40 border-red-500/50 text-red-400'
                          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                        : isCurrent
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400 animate-pulse'
                        : 'bg-black/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      R{i + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-black font-mono mt-0.5">
                      {attempt
                        ? attempt.isFalseStart
                          ? 'FAIL'
                          : `${attempt.reactionMs}ms`
                        : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 3: PASS & PLAY HANDOVER INTERMEDIARY */}
        {/* ========================================== */}
        {mode === 'VS_FRIEND' && phase === 'HANDOVER' && (
          <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#141724] to-[#0c0e17] border border-cyan-500/40 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl animate-fade-in my-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-bounce">
              <Users className="w-8 h-8" />
            </div>

            <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-1">
              Pass &amp; Play Turn Change
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
              PASS DEVICE TO {currentPlayerName.toUpperCase()}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
              Hand the device to <span className="font-bold text-cyan-300">{currentPlayerName}</span> for Round {currentRoundNumber} of {TOTAL_ROUNDS}.
            </p>

            <button
              type="button"
              onClick={() => {
                setPhase('IDLE');
                stageRound();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{currentPlayerName} Ready • Enter Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 4: FINAL RESULTS & LEADERBOARD DEBRIEF */}
        {/* ========================================== */}
        {phase === 'GAME_OVER' && (
          <div className="w-full max-w-2xl rounded-3xl bg-gradient-to-b from-[#141724] to-[#0a0c14] border border-slate-800 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl animate-fade-in my-4">
            {/* Header Badge */}
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-1 font-display">
              {mode === 'BEST_OF_5' ? 'RACE TEST COMPLETE' : vsOutcome ? vsOutcome.winner === 'TIE' ? 'DEAD HEAT TIE!' : `${vsOutcome.winner === 'P1' ? 'PLAYER 1' : 'PLAYER 2'} WINS!` : 'DUEL COMPLETE'}
            </h2>

            {mode === 'VS_FRIEND' && vsOutcome && (
              <p className="text-xs sm:text-sm text-cyan-400 font-bold mb-4 font-mono">
                {vsOutcome.reason}
              </p>
            )}

            {/* SINGLE PLAYER BEST OF 5 METRICS */}
            {mode === 'BEST_OF_5' && (
              <div className="w-full flex flex-col items-center mb-6">
                {/* Rating Card */}
                {(() => {
                  const rating = getRating(p1Stats.validAverageMs);
                  return (
                    <div className="w-full p-4 rounded-2xl bg-black/60 border border-slate-800 mb-6 flex flex-col items-center">
                      <span
                        className="text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border"
                        style={{ color: rating.color, borderColor: `${rating.color}40`, backgroundColor: `${rating.color}15` }}
                      >
                        {rating.badge}
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-white mb-1">
                        {rating.title}
                      </h4>
                      <p className="text-xs text-slate-300 max-w-md">
                        {rating.desc}
                      </p>
                    </div>
                  );
                })()}

                {/* 3 Core Stats Cards */}
                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                  <div className="p-3.5 rounded-2xl bg-[#0f121b] border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Valid Average
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                      {p1Stats.validAverageMs ? `${p1Stats.validAverageMs}ms` : 'N/A'}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      {p1Stats.validCount}/5 valid
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0f121b] border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      Best Round
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
                      {p1Stats.bestMs ? `${p1Stats.bestMs}ms` : 'N/A'}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      Peak reflex
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#0f121b] border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                      False Starts
                    </span>
                    <span className={`text-xl sm:text-2xl font-black font-mono mt-1 ${p1Stats.falseStartsCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {p1Stats.falseStartsCount}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      Penalties
                    </span>
                  </div>
                </div>

                {/* 5 Round Detailed Breakdown */}
                <div className="w-full flex flex-col gap-1.5 mb-2 text-left">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase px-1">
                    Round Breakdown
                  </span>
                  {p1Attempts.map((attempt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/40 border border-slate-800/80 text-xs font-mono"
                    >
                      <span className="text-slate-400 font-bold">Round {idx + 1}</span>
                      {attempt.isFalseStart ? (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> False Start (Failed)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {attempt.reactionMs} ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TWO PLAYER VS FRIEND HEAD-TO-HEAD MATRIX */}
            {mode === 'VS_FRIEND' && (
              <div className="w-full flex flex-col gap-4 mb-6">
                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Player 1 Summary Card */}
                  <div className={`p-4 rounded-2xl border ${vsOutcome?.winner === 'P1' ? 'bg-orange-500/10 border-orange-500' : 'bg-[#0f121b] border-slate-800'} text-left`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-orange-400">PLAYER 1</span>
                      {vsOutcome?.winner === 'P1' && <span className="text-xs">🏆 WINNER</span>}
                    </div>
                    <div className="text-2xl font-black text-white font-mono mb-1">
                      {p1Stats.validAverageMs ? `${p1Stats.validAverageMs}ms` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>Best: {p1Stats.bestMs ? `${p1Stats.bestMs}ms` : '--'}</div>
                      <div>False Starts: {p1Stats.falseStartsCount}</div>
                    </div>
                  </div>

                  {/* Player 2 Summary Card */}
                  <div className={`p-4 rounded-2xl border ${vsOutcome?.winner === 'P2' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-[#0f121b] border-slate-800'} text-left`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">PLAYER 2</span>
                      {vsOutcome?.winner === 'P2' && <span className="text-xs">🏆 WINNER</span>}
                    </div>
                    <div className="text-2xl font-black text-white font-mono mb-1">
                      {p2Stats.validAverageMs ? `${p2Stats.validAverageMs}ms` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>Best: {p2Stats.bestMs ? `${p2Stats.bestMs}ms` : '--'}</div>
                      <div>False Starts: {p2Stats.falseStartsCount}</div>
                    </div>
                  </div>
                </div>

                {/* Round by Round Comparison Table */}
                <div className="w-full rounded-2xl bg-black/40 border border-slate-800 overflow-hidden text-xs font-mono">
                  <div className="grid grid-cols-3 p-2.5 bg-slate-900/60 font-bold text-slate-400 border-b border-slate-800">
                    <span>Round</span>
                    <span>Player 1</span>
                    <span>Player 2</span>
                  </div>
                  {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                    const r1 = p1Attempts[i];
                    const r2 = p2Attempts[i];

                    return (
                      <div key={i} className="grid grid-cols-3 p-2.5 border-b border-slate-800/50 last:border-0 text-slate-300">
                        <span className="text-slate-500 font-bold">R{i + 1}</span>
                        <span className={r1?.isFalseStart ? 'text-red-400' : 'text-orange-300 font-bold'}>
                          {r1 ? (r1.isFalseStart ? 'FAIL' : `${r1.reactionMs}ms`) : '--'}
                        </span>
                        <span className={r2?.isFalseStart ? 'text-red-400' : 'text-cyan-300 font-bold'}>
                          {r2 ? (r2.isFalseStart ? 'FAIL' : `${r2.reactionMs}ms`) : '--'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                type="button"
                onClick={() => startNewGame(mode || 'BEST_OF_5')}
                className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearAllTimers();
                  setMode(null);
                  setPhase('IDLE');
                }}
                className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Change Mode
              </button>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
};
