import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import {
  Zap,
  Trophy,
  Flame,
  RotateCcw,
  Play,
  Pause,
  Clock,
  Gauge,
  CheckCircle2,
  Sparkles,
  Layers,
  Keyboard
} from 'lucide-react';
import type { GameMode, GameStatus, TypingStats, RunnerState } from './types';
import { SPEED_RUN_TRACKS, getEndlessWords, TIME_ATTACK_CHALLENGES, PRACTICE_PASSAGES } from './textCorpus';
import { RunnerRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from './runnerRenderer';
import { typingAudio } from './audio';

export const TypingSpeedRush: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'typing-speed-rush') || {
    id: 'typing-speed-rush',
    name: 'Typing Speed Rush',
    description: 'High-octane arcade typing racer! Speed through neon streets by typing phrases fast and accurately.',
    icon: '⚡',
    category: 'Arcade' as const,
    playerCount: '1 Player',
    difficulty: 'Adaptive' as const,
    tier: 1,
    estimatedTime: '1–3 min',
    howToPlay: [
      'Type the highlighted text on screen as quickly and accurately as possible.',
      'Correct letters accelerate your runner; errors trigger a brief slowdown.',
      'Maintain continuous streaks to build nitro boost multipliers and reach maximum speed.',
      'Select between Speed Run, Endless Rush, Time Attack, and Practice modes!'
    ],
    controls: [
      { key: 'Keyboard', action: 'Type displayed words / letters' },
      { key: 'Esc / P', action: 'Pause / Resume game' },
      { key: 'R', action: 'Restart current mode' }
    ],
    tags: ['typing', 'speed', 'arcade', 'runner', 'wpm', 'words', 'racing', 'retro']
  };

  // Game Settings & Modes
  const [mode, setMode] = useState<GameMode>('speed-run');
  const [speedTrackIdx, setSpeedTrackIdx] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(30); // 30s or 60s
  const [status, setStatus] = useState<GameStatus>('ready');
  const [countdown, setCountdown] = useState<number>(3);

  // Text State
  const [fullText, setFullText] = useState<string>(() => SPEED_RUN_TRACKS[0].text);
  const [charIndex, setCharIndex] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorChar, setErrorChar] = useState<string>('');

  // Statistics State
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    netWpm: 0,
    peakWpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    streak: 0,
    maxStreak: 0,
    combo: 0,
    distance: 0,
    targetDistance: SPEED_RUN_TRACKS[0].distance,
    elapsedTime: 0,
    timeRemaining: 30,
    wordsCompleted: 0
  });

  const [personalBestWpm, setPersonalBestWpm] = useState<number>(() => getHighScore('typing-speed-rush'));
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<RunnerRenderer>(new RunnerRenderer());
  const lastTimeRef = useRef<number>(0);
  const typingContainerRef = useRef<HTMLDivElement | null>(null);

  // Runner state in ref to avoid React re-render lag in 60fps canvas loop
  const runnerRef = useRef<RunnerState>({
    x: 100,
    y: 280,
    speed: 0,
    targetSpeed: 0,
    animationFrame: 0,
    animationTimer: 0,
    stumbleTimer: 0,
    boostTimer: 0,
    streakLevel: 0
  });

  // Calculate live stats helper
  const calculateLiveWpm = useCallback((correct: number, incorrect: number, seconds: number) => {
    const elapsedMinutes = Math.max(seconds, 0.5) / 60;
    const rawWpm = Math.round((correct / 5) / elapsedMinutes);
    const netWpm = Math.max(0, rawWpm - Math.round((incorrect / 5) / elapsedMinutes));
    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    return { wpm: rawWpm, netWpm, accuracy };
  }, []);

  // Initialize Text based on selected mode
  const initModeText = useCallback(() => {
    if (mode === 'speed-run') {
      const track = SPEED_RUN_TRACKS[speedTrackIdx] || SPEED_RUN_TRACKS[0];
      setFullText(track.text);
      setStats((s) => ({ ...s, targetDistance: track.distance }));
    } else if (mode === 'endless') {
      const words = getEndlessWords(1, 8);
      setFullText(words.join(' ') + ' ');
      setStats((s) => ({ ...s, targetDistance: 999999 }));
    } else if (mode === 'time-attack') {
      const texts = [...TIME_ATTACK_CHALLENGES].sort(() => Math.random() - 0.5).slice(0, 4);
      setFullText(texts.join(' '));
      setStats((s) => ({ ...s, targetDistance: 999999, timeRemaining: timeLimit }));
    } else if (mode === 'practice') {
      const passage = PRACTICE_PASSAGES[Math.floor(Math.random() * PRACTICE_PASSAGES.length)];
      setFullText(passage);
      setStats((s) => ({ ...s, targetDistance: 999999 }));
    }
  }, [mode, speedTrackIdx, timeLimit]);

  // Reset Game
  const resetGame = useCallback(() => {
    rendererRef.current.reset();
    runnerRef.current.speed = 0;
    runnerRef.current.targetSpeed = 0;
    runnerRef.current.stumbleTimer = 0;
    runnerRef.current.boostTimer = 0;
    runnerRef.current.streakLevel = 0;

    setCharIndex(0);
    setHasError(false);
    setErrorChar('');
    setIsNewRecord(false);

    setStats({
      wpm: 0,
      netWpm: 0,
      peakWpm: 0,
      accuracy: 100,
      correctChars: 0,
      incorrectChars: 0,
      totalChars: 0,
      streak: 0,
      maxStreak: 0,
      combo: 0,
      distance: 0,
      targetDistance: mode === 'speed-run' ? (SPEED_RUN_TRACKS[speedTrackIdx]?.distance || 150) : 999999,
      elapsedTime: 0,
      timeRemaining: timeLimit,
      wordsCompleted: 0
    });

    initModeText();
    setStatus('ready');
  }, [mode, speedTrackIdx, timeLimit, initModeText]);

  // Start Countdown then Play
  const startGame = useCallback(() => {
    resetGame();
    setStatus('countdown');
    setCountdown(3);
    typingAudio.playCountdown(false);
  }, [resetGame]);

  // Countdown timer effect
  useEffect(() => {
    if (status !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        const next = countdown - 1;
        setCountdown(next);
        typingAudio.playCountdown(next === 0);
      }, 850);
      return () => clearTimeout(timer);
    } else {
      setStatus('playing');
      lastTimeRef.current = performance.now();
      hiddenInputRef.current?.focus();
    }
  }, [status, countdown]);

  // Ensure input is focused when playing
  useEffect(() => {
    if (status === 'playing') {
      hiddenInputRef.current?.focus();
    }
  }, [status]);

  // End Game & High Scores
  const finishGame = useCallback(() => {
    setStatus('finished');
    runnerRef.current.targetSpeed = 0;

    const finalWpm = stats.wpm;
    const isRecord = saveHighScore('typing-speed-rush', finalWpm);
    if (isRecord) {
      setIsNewRecord(true);
      setPersonalBestWpm(finalWpm);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti fallback
      }
    }
    typingAudio.playFinish(isRecord);
  }, [stats.wpm]);

  // Handle Keystrokes
  const handleKeyInput = useCallback((key: string) => {
    if (status !== 'playing') return;

    const targetChar = fullText[charIndex];
    if (!targetChar) return;

    // Check match
    if (key === targetChar) {
      // Correct keystroke
      const nextIndex = charIndex + 1;
      const nextCorrect = stats.correctChars + 1;
      const nextStreak = stats.streak + 1;
      const nextMaxStreak = Math.max(stats.maxStreak, nextStreak);
      const comboMultiplier = Math.floor(nextStreak / 10);

      // Sound
      typingAudio.playKey(comboMultiplier);

      // Accelerate runner
      runnerRef.current.speed = Math.min(13, runnerRef.current.speed + 0.35);

      setCharIndex(nextIndex);
      setHasError(false);
      setErrorChar('');

      // Check Word Completion (space or punctuation or end)
      const isWordEnd = targetChar === ' ' || nextIndex >= fullText.length;
      if (isWordEnd) {
        typingAudio.playWordSuccess(comboMultiplier);
        runnerRef.current.boostTimer = 0.6;
        runnerRef.current.speed = Math.min(15, runnerRef.current.speed + 1.2);
        rendererRef.current.triggerWordBoost(runnerRef.current.x, runnerRef.current.y, comboMultiplier);
      }

      setStats((prev) => {
        const nextWords = isWordEnd ? prev.wordsCompleted + 1 : prev.wordsCompleted;
        const live = calculateLiveWpm(nextCorrect, prev.incorrectChars, prev.elapsedTime);
        return {
          ...prev,
          correctChars: nextCorrect,
          totalChars: prev.totalChars + 1,
          streak: nextStreak,
          maxStreak: nextMaxStreak,
          combo: comboMultiplier,
          wordsCompleted: nextWords,
          wpm: live.wpm,
          netWpm: live.netWpm,
          peakWpm: Math.max(prev.peakWpm, live.wpm),
          accuracy: live.accuracy
        };
      });

      // Endless mode: stream next words if running low
      if (mode === 'endless' && nextIndex >= fullText.length - 15) {
        const tier = stats.distance > 500 ? 3 : stats.distance > 200 ? 2 : 1;
        const extraWords = getEndlessWords(tier, 5);
        setFullText((curr) => curr + extraWords.join(' ') + ' ');
      }

      // Speed Run mode: finish condition
      if (mode === 'speed-run' && nextIndex >= fullText.length) {
        finishGame();
      }
    } else {
      // Wrong keystroke
      typingAudio.playError();
      setHasError(true);
      setErrorChar(key);

      // Runner stumble & deceleration
      runnerRef.current.stumbleTimer = 0.4;
      runnerRef.current.speed = Math.max(0.6, runnerRef.current.speed * 0.72);
      rendererRef.current.triggerMistakeGlitch(runnerRef.current.x, runnerRef.current.y);

      setStats((prev) => {
        const nextIncorrect = prev.incorrectChars + 1;
        const live = calculateLiveWpm(prev.correctChars, nextIncorrect, prev.elapsedTime);
        return {
          ...prev,
          incorrectChars: nextIncorrect,
          totalChars: prev.totalChars + 1,
          streak: 0,
          combo: 0,
          wpm: live.wpm,
          netWpm: live.netWpm,
          accuracy: live.accuracy
        };
      });
    }
  }, [status, fullText, charIndex, stats, mode, finishGame, calculateLiveWpm]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default for Space and standard keys when playing
      if (status === 'playing') {
        if (e.key === ' ' || e.key === 'Tab') {
          e.preventDefault();
        }
      }

      // Pause toggle: Esc or P
      if (e.key === 'Escape' || (e.key === 'p' && (e.ctrlKey || e.metaKey))) {
        if (status === 'playing') {
          setStatus('paused');
          return;
        } else if (status === 'paused') {
          setStatus('playing');
          return;
        }
      }

      // Quick restart shortcut: R (when not typing words with r in playing state)
      if (e.key === 'r' && (status === 'finished' || status === 'paused' || status === 'ready')) {
        e.preventDefault();
        startGame();
        return;
      }

      if (status !== 'playing') return;

      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length > 1 && e.key !== 'Space') return;

      const charToType = e.key === 'Space' ? ' ' : e.key;
      handleKeyInput(charToType);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleKeyInput, startGame]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        // Natural speed decay if player pauses typing
        if (status === 'playing') {
          runnerRef.current.speed = Math.max(0.4, runnerRef.current.speed * Math.pow(0.965, dt * 60));

          // Update stats over time
          setStats((prev) => {
            const nextElapsed = prev.elapsedTime + dt;
            const nextDistance = Math.round(prev.distance + runnerRef.current.speed * dt * 3.5);
            const live = calculateLiveWpm(prev.correctChars, prev.incorrectChars, nextElapsed);

            let nextTimeRemaining = prev.timeRemaining;
            if (mode === 'time-attack') {
              nextTimeRemaining = Math.max(0, prev.timeRemaining - dt);
              if (nextTimeRemaining <= 0) {
                finishGame();
              }
            }

            return {
              ...prev,
              elapsedTime: nextElapsed,
              distance: nextDistance,
              timeRemaining: nextTimeRemaining,
              wpm: live.wpm,
              netWpm: live.netWpm,
              peakWpm: Math.max(prev.peakWpm, live.wpm),
              accuracy: live.accuracy
            };
          });
        }

        // Update Runner Renderer Physics
        rendererRef.current.update(
          dt,
          runnerRef.current,
          stats.wpm,
          stats.distance,
          stats.targetDistance,
          mode
        );

        // Render Canvas Frame
        rendererRef.current.render(
          ctx,
          runnerRef.current,
          stats.wpm,
          stats.accuracy,
          stats.distance,
          stats.targetDistance,
          mode,
          stats.combo >= 2
        );
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [status, mode, stats.wpm, stats.accuracy, stats.distance, stats.targetDistance, stats.combo, finishGame, calculateLiveWpm]);

  // Change Game Mode
  const selectMode = (newMode: GameMode) => {
    sounds.playClick();
    setMode(newMode);
    setStatus('ready');
  };

  // Performance Grade
  const rank = useMemo(() => {
    if (stats.wpm >= 85 && stats.accuracy >= 96) return { badge: '👑 S-TIER', color: 'text-amber-400', desc: 'Supersonic Typist' };
    if (stats.wpm >= 65 && stats.accuracy >= 92) return { badge: '⚡ A-TIER', color: 'text-sky-400', desc: 'Arcade Champion' };
    if (stats.wpm >= 45 && stats.accuracy >= 85) return { badge: '🚀 B-TIER', color: 'text-emerald-400', desc: 'Swift Cruiser' };
    return { badge: '🏁 C-TIER', color: 'text-slate-300', desc: 'Pavement Pounder' };
  }, [stats.wpm, stats.accuracy]);

  return (
    <GameLayout
      game={gameInfo}
      score={stats.wpm}
      streak={stats.streak}
      onRestart={resetGame}
    >
      <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex flex-col gap-3 sm:gap-4 select-none">
        {/* Hidden accessible input for mobile keyboards and screen readers */}
        <input
          ref={hiddenInputRef}
          type="text"
          className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          value=""
          onChange={(e) => {
            const val = e.target.value;
            if (val.length > 0) {
              handleKeyInput(val[val.length - 1]);
            }
          }}
          aria-label="Typing Input Field"
        />

        {/* 1. Mode Selection Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
            <button
              onClick={() => selectMode('speed-run')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                mode === 'speed-run'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Speed Run</span>
            </button>

            <button
              onClick={() => selectMode('endless')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                mode === 'endless'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Endless Rush</span>
            </button>

            <button
              onClick={() => selectMode('time-attack')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                mode === 'time-attack'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Time Attack</span>
            </button>

            <button
              onClick={() => selectMode('practice')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                mode === 'practice'
                  ? 'bg-orange-500 text-black shadow-md shadow-orange-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice</span>
            </button>
          </div>

          {/* Sub-options for Speed Run distance & Time limits */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {mode === 'speed-run' && (
              <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
                {SPEED_RUN_TRACKS.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      sounds.playClick();
                      setSpeedTrackIdx(idx);
                      setStatus('ready');
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                      speedTrackIdx === idx
                        ? 'bg-white/20 text-orange-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.distance}m
                  </button>
                ))}
              </div>
            )}

            {mode === 'time-attack' && (
              <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
                {[30, 60].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      sounds.playClick();
                      setTimeLimit(t);
                      setStatus('ready');
                    }}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                      timeLimit === t
                        ? 'bg-white/20 text-orange-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Top In-Game HUD (Live WPM, Accuracy, Streak, Distance, Time) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {/* WPM Gauge */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent border border-orange-500/30 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> WPM
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5">
                {stats.wpm}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">PEAK</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{stats.peakWpm}</span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Accuracy
              </span>
              <div className={`text-2xl sm:text-3xl font-black leading-none mt-0.5 ${
                stats.accuracy >= 95 ? 'text-emerald-400' : stats.accuracy >= 88 ? 'text-amber-400' : 'text-orange-400'
              }`}>
                {stats.accuracy}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">ERRORS</span>
              <span className="text-xs font-bold text-red-400 font-mono">{stats.incorrectChars}</span>
            </div>
          </div>

          {/* Combo / Streak */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Flame className={`w-3 h-3 ${stats.streak >= 10 ? 'text-orange-500 animate-pulse' : 'text-slate-500'}`} />
                Streak
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 flex items-baseline gap-1">
                <span>{stats.streak}</span>
                {stats.combo > 0 && (
                  <span className="text-xs font-bold text-amber-400 font-mono">x{1 + stats.combo * 0.5}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">BEST</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{stats.maxStreak}</span>
            </div>
          </div>

          {/* Distance */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-sky-400" /> Distance
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5">
                {stats.distance}m
              </div>
            </div>
            {mode === 'speed-run' && (
              <div className="text-right">
                <span className="text-[9px] font-mono text-slate-400 block">GOAL</span>
                <span className="text-xs font-bold text-sky-400 font-mono">{stats.targetDistance}m</span>
              </div>
            )}
          </div>

          {/* Timer / Time Remaining */}
          <div className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> {mode === 'time-attack' ? 'Remaining' : 'Time'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 font-mono">
                {mode === 'time-attack' ? `${Math.ceil(stats.timeRemaining)}s` : `${Math.floor(stats.elapsedTime)}s`}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">RECORD</span>
              <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-0.5">
                <Trophy className="w-3 h-3" /> {personalBestWpm}
              </span>
            </div>
          </div>
        </div>

        {/* 3. The 2D Canvas Runner Viewport */}
        <div className="relative w-full aspect-[800/380] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-cover block"
          />

          {/* Ready Overlay */}
          {status === 'ready' && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-3xl mb-3 shadow-[0_0_25px_rgba(249,115,22,0.3)]">
                ⚡
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-1">
                {mode === 'speed-run' ? 'Speed Run Sprint' : mode === 'endless' ? 'Endless Rush' : mode === 'time-attack' ? `${timeLimit}s Time Attack` : 'Typing Practice'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-5">
                Type each character cleanly to accelerate your cyber runner. Build streaks for nitro boosts and conquer the track!
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all cursor-pointer flex items-center gap-2 transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Start Race</span>
              </button>
            </div>
          )}

          {/* Countdown Overlay (3, 2, 1, GO!) */}
          {status === 'countdown' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-10 select-none">
              <div className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-orange-400 to-orange-600 animate-pulse drop-shadow-[0_0_35px_rgba(249,115,22,0.6)]">
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <span className="font-mono text-sm tracking-widest text-slate-300 mt-2 uppercase font-bold">
                {countdown > 0 ? 'READY TO TYPE' : 'ACCELERATE!'}
              </span>
            </div>
          )}

          {/* Paused Overlay */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Pause className="w-6 h-6 text-orange-500" /> Race Paused
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setStatus('playing');
                    hiddenInputRef.current?.focus();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Resume
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    startGame();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* Finish / Victory Modal */}
          {status === 'finished' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20">
              <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight ${rank.color}`}>
                    {rank.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">• {rank.desc}</span>
                </div>

                {isNewRecord && (
                  <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-bounce flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> NEW PERSONAL BEST!
                  </div>
                )}

                {/* Score Stats Grid */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Speed</span>
                    <span className="text-2xl font-black text-white">{stats.wpm}</span>
                    <span className="text-[9px] font-mono text-orange-400 block">WPM</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Accuracy</span>
                    <span className="text-2xl font-black text-emerald-400">{stats.accuracy}%</span>
                    <span className="text-[9px] font-mono text-slate-400 block">{stats.incorrectChars} typos</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Distance</span>
                    <span className="text-2xl font-black text-sky-400">{stats.distance}m</span>
                    <span className="text-[9px] font-mono text-slate-400 block">{Math.floor(stats.elapsedTime)}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full pt-1">
                  <button
                    onClick={startGame}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Race Again
                  </button>
                  <button
                    onClick={() => setStatus('ready')}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Modes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. The Interactive Typing Arena */}
        <div
          ref={typingContainerRef}
          onClick={() => hiddenInputRef.current?.focus()}
          className="relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-3 cursor-text transition-all focus-within:border-orange-500/40 focus-within:ring-2 focus-within:ring-orange-500/20"
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-wider text-[11px]">
              <Keyboard className="w-3.5 h-3.5" />
              {status === 'playing' ? 'Type the text below:' : 'Click or tap here to begin typing'}
            </span>
            <span>
              {charIndex} / {fullText.length} chars
            </span>
          </div>

          {/* Typing Text Stream with Crisp High-Contrast Styling */}
          <div className="text-lg sm:text-2xl font-mono leading-relaxed tracking-wide select-none min-h-[90px] flex flex-wrap items-center">
            {fullText.split('').map((char, idx) => {
              const isTyped = idx < charIndex;
              const isCurrent = idx === charIndex;
              const isUpcoming = idx > charIndex;

              let charStyle = 'text-slate-400 opacity-60';
              if (isTyped) {
                charStyle = 'text-emerald-400 font-bold';
              } else if (isCurrent) {
                charStyle = hasError
                  ? 'text-red-400 bg-red-500/30 rounded px-0.5 animate-pulse border-b-2 border-red-500'
                  : 'text-white bg-orange-500/30 rounded px-0.5 border-b-2 border-orange-400 animate-pulse font-bold shadow-[0_0_10px_rgba(249,115,22,0.4)]';
              } else if (isUpcoming) {
                charStyle = 'text-slate-200';
              }

              return (
                <span
                  key={idx}
                  className={`transition-colors duration-75 inline-block ${charStyle}`}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            })}
          </div>

          {/* On-Screen Mobile Focus Helper Button */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400">
              {hasError ? (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  ⚠️ Pressed '{errorChar === ' ' ? 'Space' : errorChar}'. Strike '{fullText[charIndex] === ' ' ? 'Space' : fullText[charIndex]}' to continue!
                </span>
              ) : (
                <span>Next key: <strong className="text-white font-bold">'{fullText[charIndex] === ' ' ? 'Space' : fullText[charIndex]}'</strong></span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                hiddenInputRef.current?.focus();
              }}
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              <Keyboard className="w-3.5 h-3.5" /> Tap to open keyboard
            </button>
          </div>
        </div>
      </div>
    </GameLayout>
  );
};
