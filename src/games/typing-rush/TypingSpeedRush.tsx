import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GAMES } from '../../lib/gamesRegistry';
import { getHighScore, saveHighScore } from '../../lib/storage';
import { sounds } from '../../lib/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  RotateCcw,
  Pause,
  Clock,
  Gauge,
  CheckCircle2,
  Keyboard,
  Target
} from 'lucide-react';
import type { GameStatus, TypingStats, RunnerState, PassageCategory, TestDuration, TypingPassage } from './types';
import {
  TYPING_CATEGORIES,
  TEST_DURATIONS,
  globalPassageManager
} from './textCorpus';
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
      'Type the displayed text as quickly and accurately as possible.',
      'Every typed character advances the cursor; incorrect characters are marked in red.',
      'Use Backspace to correct mistakes at any time.',
      'Timer begins automatically on your first keystroke.',
      'Maintain streaks to trigger nitro boosts on your cyber runner!'
    ],
    controls: [
      { key: 'Keyboard', action: 'Type displayed words / letters' },
      { key: 'Backspace', action: 'Correct previous character' },
      { key: 'Tab', action: 'Quick restart test' },
      { key: 'Esc', action: 'Pause / Resume' }
    ],
    tags: ['typing', 'speed', 'arcade', 'runner', 'wpm', 'words', 'racing', 'retro']
  };

  // ---------------------------------------------------------------------------
  // Configuration State
  // ---------------------------------------------------------------------------
  const [category, setCategory] = useState<PassageCategory>('random');
  const [duration, setDuration] = useState<TestDuration>(30);
  const [status, setStatus] = useState<GameStatus>('ready');

  // ---------------------------------------------------------------------------
  // Passage & Typing State
  // ---------------------------------------------------------------------------
  const [currentPassage, setCurrentPassage] = useState<TypingPassage>(() =>
    globalPassageManager.getNextPassage('random', 30)
  );
  const [typedText, setTypedText] = useState<string>('');

  // Accumulated stats from multi-passage endurance within a single test session
  const [accumulatedStats, setAccumulatedStats] = useState<{
    correctChars: number;
    incorrectChars: number;
    totalKeystrokes: number;
    completedPassages: number;
  }>({
    correctChars: 0,
    incorrectChars: 0,
    totalKeystrokes: 0,
    completedPassages: 0
  });

  // ---------------------------------------------------------------------------
  // Real-Time Statistics State
  // ---------------------------------------------------------------------------
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    rawWpm: 0,
    netWpm: 0,
    peakWpm: 0,
    accuracy: 100,
    correctChars: 0,
    incorrectChars: 0,
    totalChars: 0,
    totalKeystrokes: 0,
    streak: 0,
    maxStreak: 0,
    combo: 0,
    distance: 0,
    targetDistance: 999999,
    elapsedTime: 0,
    timeRemaining: 30,
    wordsCompleted: 0
  });

  const [personalBestWpm, setPersonalBestWpm] = useState<number>(() =>
    getHighScore('typing-speed-rush')
  );
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingContainerRef = useRef<HTMLDivElement | null>(null);
  const activeCharRef = useRef<HTMLSpanElement | null>(null);
  const rendererRef = useRef<RunnerRenderer>(new RunnerRenderer());
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

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

  // ---------------------------------------------------------------------------
  // Mathematical WPM & Accuracy Calculation
  // Standard 5-character convention:
  // WPM = (correct characters / 5) / elapsed minutes
  // Raw WPM = (total keystrokes / 5) / elapsed minutes
  // Net WPM = Math.max(0, ((correct characters - incorrect characters) / 5) / elapsed minutes)
  // Accuracy = totalKeystrokes > 0 ? (correct characters / totalKeystrokes) * 100 : 100
  // ---------------------------------------------------------------------------
  const calculateMetrics = useCallback(
    (
      currentTyped: string,
      targetStr: string,
      accum: { correctChars: number; incorrectChars: number; totalKeystrokes: number },
      elapsedSeconds: number
    ) => {
      let curCorrect = 0;
      let curIncorrect = 0;

      for (let i = 0; i < currentTyped.length; i++) {
        if (i < targetStr.length) {
          if (currentTyped[i] === targetStr[i]) {
            curCorrect += 1;
          } else {
            curIncorrect += 1;
          }
        } else {
          // Extra characters beyond target string
          curIncorrect += 1;
        }
      }

      const totalCorrect = accum.correctChars + curCorrect;
      const totalIncorrect = accum.incorrectChars + curIncorrect;
      const totalKeystrokes = Math.max(totalCorrect + totalIncorrect, accum.totalKeystrokes + currentTyped.length);

      const elapsedMinutes = Math.max(elapsedSeconds, 0.5) / 60;
      const wpm = Math.round((totalCorrect / 5) / elapsedMinutes);
      const rawWpm = Math.round((totalKeystrokes / 5) / elapsedMinutes);
      const netWpm = Math.max(0, Math.round(((totalCorrect - totalIncorrect) / 5) / elapsedMinutes));
      const accuracy = totalKeystrokes > 0 ? Math.max(0, Math.min(100, Math.round((totalCorrect / totalKeystrokes) * 100))) : 100;

      return {
        wpm,
        rawWpm,
        netWpm,
        accuracy,
        totalCorrect,
        totalIncorrect,
        totalKeystrokes
      };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Reset / Start Fresh Test
  // ---------------------------------------------------------------------------
  const resetTest = useCallback(
    (newCategory?: PassageCategory, newDuration?: TestDuration) => {
      const activeCat = newCategory ?? category;
      const activeDur = newDuration ?? duration;

      rendererRef.current.reset();
      runnerRef.current.speed = 0;
      runnerRef.current.targetSpeed = 0;
      runnerRef.current.stumbleTimer = 0;
      runnerRef.current.boostTimer = 0;
      runnerRef.current.streakLevel = 0;

      startTimeRef.current = null;
      lastTimeRef.current = 0;
      setTypedText('');
      setAccumulatedStats({
        correctChars: 0,
        incorrectChars: 0,
        totalKeystrokes: 0,
        completedPassages: 0
      });
      setIsNewRecord(false);

      // Random non-repeating passage selection
      const nextPassage = globalPassageManager.getNextPassage(activeCat, activeDur);
      setCurrentPassage(nextPassage);

      setStats({
        wpm: 0,
        rawWpm: 0,
        netWpm: 0,
        peakWpm: 0,
        accuracy: 100,
        correctChars: 0,
        incorrectChars: 0,
        totalChars: 0,
        totalKeystrokes: 0,
        streak: 0,
        maxStreak: 0,
        combo: 0,
        distance: 0,
        targetDistance: 999999,
        elapsedTime: 0,
        timeRemaining: activeDur,
        wordsCompleted: 0
      });

      setStatus('ready');

      // Focus typing input
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
    [category, duration]
  );

  // ---------------------------------------------------------------------------
  // Finish Test
  // ---------------------------------------------------------------------------
  const finishTest = useCallback(() => {
    setStatus('finished');
    runnerRef.current.targetSpeed = 0;

    const finalWpm = stats.netWpm;
    const isRecord = saveHighScore('typing-speed-rush', finalWpm);
    if (isRecord && finalWpm > 0) {
      setIsNewRecord(true);
      setPersonalBestWpm(finalWpm);
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 }
        });
      } catch {}
    }
    typingAudio.playFinish(isRecord);
  }, [stats.netWpm]);

  // ---------------------------------------------------------------------------
  // Input Change Handler (Standard Native Typing Engine)
  // Handles letters, spaces, backspaces, and punctuation seamlessly
  // ---------------------------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status === 'finished') return;

    const newTyped = e.target.value;
    const prevTyped = typedText;

    // Start timer on the first actual character typed
    if (status === 'ready' && newTyped.length > 0) {
      setStatus('playing');
      startTimeRef.current = performance.now();
      lastTimeRef.current = performance.now();
    }

    const isTypingForward = newTyped.length > prevTyped.length;
    const isBackspace = newTyped.length < prevTyped.length;

    if (isTypingForward) {
      const addedChars = newTyped.slice(prevTyped.length);
      const lastIndex = newTyped.length - 1;
      const targetChar = currentPassage.text[lastIndex];
      const typedChar = newTyped[lastIndex];

      const isMatch = targetChar !== undefined && typedChar === targetChar;

      // Calculate streak & audio feedback
      if (isMatch) {
        const nextStreak = stats.streak + addedChars.length;
        const comboMultiplier = Math.floor(nextStreak / 10);
        typingAudio.playKey(comboMultiplier);

        // Accelerate runner
        runnerRef.current.speed = Math.min(14, runnerRef.current.speed + 0.35);

        // Word completed on space
        if (typedChar === ' ') {
          typingAudio.playWordSuccess(comboMultiplier);
          runnerRef.current.boostTimer = 0.55;
          runnerRef.current.speed = Math.min(16, runnerRef.current.speed + 1.1);
          rendererRef.current.triggerWordBoost(runnerRef.current.x, runnerRef.current.y, comboMultiplier);
        }

        setStats((prev) => ({
          ...prev,
          streak: nextStreak,
          maxStreak: Math.max(prev.maxStreak, nextStreak),
          combo: comboMultiplier
        }));
      } else {
        // Mistake: stumble runner and sound glitch
        typingAudio.playError();
        runnerRef.current.stumbleTimer = 0.35;
        runnerRef.current.speed = Math.max(0.6, runnerRef.current.speed * 0.72);
        rendererRef.current.triggerMistakeGlitch(runnerRef.current.x, runnerRef.current.y);

        setStats((prev) => ({
          ...prev,
          streak: 0,
          combo: 0
        }));
      }
    } else if (isBackspace) {
      // Backspace removes characters cleanly
      typingAudio.playKey(0);
    }

    // Check if passage is fully completed before time expires
    if (newTyped.length >= currentPassage.text.length) {
      // Calculate final stats of this passage
      const metrics = calculateMetrics(newTyped, currentPassage.text, accumulatedStats, stats.elapsedTime);

      setAccumulatedStats({
        correctChars: metrics.totalCorrect,
        incorrectChars: metrics.totalIncorrect,
        totalKeystrokes: metrics.totalKeystrokes,
        completedPassages: accumulatedStats.completedPassages + 1
      });

      // Seamlessly advance to a fresh new passage
      const nextPassage = globalPassageManager.getNextPassage(category, duration);
      setCurrentPassage(nextPassage);
      setTypedText('');

      typingAudio.playWordSuccess(2);
      runnerRef.current.boostTimer = 0.8;
      runnerRef.current.speed = Math.min(16, runnerRef.current.speed + 1.5);
      rendererRef.current.triggerWordBoost(runnerRef.current.x, runnerRef.current.y, 2);
      return;
    }

    setTypedText(newTyped);
  };

  // ---------------------------------------------------------------------------
  // Keyboard Event Handlers (Space & Shortcuts without Scrolling)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Space must never scroll the webpage when focused
    if (e.key === ' ') {
      e.stopPropagation();
    }

    // Tab shortcut: instant restart test
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
      return;
    }

    // Escape shortcut: pause / resume
    if (e.key === 'Escape') {
      e.preventDefault();
      if (status === 'playing') {
        setStatus('paused');
      } else if (status === 'paused') {
        setStatus('playing');
        textareaRef.current?.focus();
      }
      return;
    }
  };

  // Keep active character centered in view smoothly without jumping the browser page
  useEffect(() => {
    if (activeCharRef.current && typingContainerRef.current) {
      const charEl = activeCharRef.current;
      const containerEl = typingContainerRef.current;

      const charTop = charEl.offsetTop;
      const charBottom = charTop + charEl.offsetHeight;
      const containerTop = containerEl.scrollTop;
      const containerBottom = containerTop + containerEl.clientHeight;

      if (charBottom > containerBottom - 20) {
        containerEl.scrollTo({
          top: charTop - 40,
          behavior: 'smooth'
        });
      } else if (charTop < containerTop + 20) {
        containerEl.scrollTo({
          top: Math.max(0, charTop - 20),
          behavior: 'smooth'
        });
      }
    }
  }, [typedText]);

  // ---------------------------------------------------------------------------
  // Main 60 FPS Game Loop & Precision Timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (status === 'playing') {
        // Natural speed decay if player pauses typing
        runnerRef.current.speed = Math.max(0.4, runnerRef.current.speed * Math.pow(0.965, dt * 60));

        setStats((prev) => {
          const nextElapsed = prev.elapsedTime + dt;
          const nextTimeRemaining = Math.max(0, duration - nextElapsed);
          const nextDistance = Math.round(prev.distance + runnerRef.current.speed * dt * 3.5);

          const metrics = calculateMetrics(typedText, currentPassage.text, accumulatedStats, nextElapsed);

          if (nextTimeRemaining <= 0) {
            // End test immediately when timer hits zero
            finishTest();
          }

          return {
            ...prev,
            elapsedTime: nextElapsed,
            timeRemaining: nextTimeRemaining,
            distance: nextDistance,
            wpm: metrics.wpm,
            rawWpm: metrics.rawWpm,
            netWpm: metrics.netWpm,
            accuracy: metrics.accuracy,
            correctChars: metrics.totalCorrect,
            incorrectChars: metrics.totalIncorrect,
            totalChars: metrics.totalCorrect + metrics.totalIncorrect,
            totalKeystrokes: metrics.totalKeystrokes,
            peakWpm: Math.max(prev.peakWpm, metrics.netWpm)
          };
        });
      }

      // Render 2D Cyber Runner Viewport
      if (canvas && ctx) {
        rendererRef.current.update(
          dt,
          runnerRef.current,
          stats.netWpm,
          stats.distance,
          stats.targetDistance,
          'time-attack'
        );

        rendererRef.current.render(
          ctx,
          runnerRef.current,
          stats.netWpm,
          stats.accuracy,
          stats.distance,
          stats.targetDistance,
          'time-attack',
          stats.combo >= 2
        );
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [status, duration, typedText, currentPassage.text, accumulatedStats, calculateMetrics, finishTest, stats.netWpm, stats.accuracy, stats.distance, stats.targetDistance, stats.combo]);

  // ---------------------------------------------------------------------------
  // Category / Duration Selector Handlers
  // ---------------------------------------------------------------------------
  const handleSelectCategory = (cat: PassageCategory) => {
    sounds.playClick();
    setCategory(cat);
    resetTest(cat, duration);
  };

  const handleSelectDuration = (dur: TestDuration) => {
    sounds.playClick();
    setDuration(dur);
    resetTest(category, dur);
  };

  // ---------------------------------------------------------------------------
  // Performance Grade
  // ---------------------------------------------------------------------------
  const rank = useMemo(() => {
    const net = stats.netWpm;
    const acc = stats.accuracy;
    if (net >= 80 && acc >= 96) return { badge: '👑 S-TIER', color: 'text-amber-400', desc: 'Supersonic Typist' };
    if (net >= 60 && acc >= 92) return { badge: '⚡ A-TIER', color: 'text-sky-400', desc: 'Arcade Champion' };
    if (net >= 40 && acc >= 85) return { badge: '🚀 B-TIER', color: 'text-emerald-400', desc: 'Swift Cruiser' };
    return { badge: '🏁 C-TIER', color: 'text-slate-300', desc: 'Pavement Pounder' };
  }, [stats.netWpm, stats.accuracy]);

  return (
    <GameLayout
      game={gameInfo}
      score={stats.netWpm}
      streak={stats.streak}
      onRestart={() => resetTest()}
    >
      <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col gap-3 select-none">
        {/* ================================================================= */}
        {/* 1. Category & Duration Controls Bar */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          {/* Category Pills */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            {TYPING_CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-orange-500 text-black shadow-md shadow-orange-500/25 font-black'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                  title={cat.description}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5 font-mono text-xs">
            <span className="text-[10px] text-slate-500 font-bold px-1.5 uppercase hidden sm:inline">
              Duration:
            </span>
            {TEST_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                tabIndex={-1}
                onClick={() => handleSelectDuration(d)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                  duration === d
                    ? 'bg-white/20 text-orange-400 font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Top Statistics HUD Bar */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {/* Net WPM (Primary Metric) */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-orange-500/15 via-white/[0.03] to-transparent border border-orange-500/30 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Net WPM
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 font-mono">
                {stats.netWpm}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">RAW</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{stats.rawWpm}</span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Accuracy
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black leading-none mt-0.5 font-mono ${
                  stats.accuracy >= 95
                    ? 'text-emerald-400'
                    : stats.accuracy >= 88
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {stats.accuracy}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">ERRORS</span>
              <span className="text-xs font-bold text-rose-400 font-mono">{stats.incorrectChars}</span>
            </div>
          </div>

          {/* Streak & Multiplier */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Flame
                  className={`w-3 h-3 ${
                    stats.streak >= 10 ? 'text-orange-500 animate-pulse' : 'text-slate-500'
                  }`}
                />
                Streak
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 flex items-baseline gap-1 font-mono">
                <span>{stats.streak}</span>
                {stats.combo > 0 && (
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    x{1 + stats.combo * 0.5}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">BEST</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{stats.maxStreak}</span>
            </div>
          </div>

          {/* Characters / Progress */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-sky-400" /> Characters
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white leading-none mt-0.5 font-mono">
                {stats.correctChars}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">TYPED</span>
              <span className="text-xs font-bold text-sky-400 font-mono">{stats.totalKeystrokes}</span>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-400" /> Remaining
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black leading-none mt-0.5 font-mono ${
                  stats.timeRemaining <= 5 && status === 'playing'
                    ? 'text-rose-400 animate-pulse'
                    : 'text-white'
                }`}
              >
                {Math.ceil(stats.timeRemaining)}s
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

        {/* ================================================================= */}
        {/* 3. The 2D Canvas Cyber Runner Viewport */}
        {/* ================================================================= */}
        <div className="relative w-full aspect-[800/280] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full object-cover block pointer-events-none"
          />

          {/* Paused Overlay */}
          {status === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Pause className="w-6 h-6 text-orange-500" /> Test Paused
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    sounds.playClick();
                    setStatus('playing');
                    textareaRef.current?.focus();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Resume
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => resetTest()}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {/* Test Finished Results Modal Overlay */}
          {status === 'finished' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30">
              <div className="max-w-md w-full rounded-3xl bg-slate-900/95 border border-white/15 p-5 sm:p-6 shadow-2xl flex flex-col items-center gap-4">
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
                <div className="grid grid-cols-3 gap-2 w-full font-mono">
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Net Speed</span>
                    <span className="text-2xl font-black text-white">{stats.netWpm}</span>
                    <span className="text-[9px] text-orange-400 block font-bold">WPM</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Accuracy</span>
                    <span className="text-2xl font-black text-emerald-400">{stats.accuracy}%</span>
                    <span className="text-[9px] text-slate-400 block">{stats.incorrectChars} errors</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Raw WPM</span>
                    <span className="text-2xl font-black text-sky-400">{stats.rawWpm}</span>
                    <span className="text-[9px] text-slate-400 block">{stats.totalKeystrokes} chars</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full pt-1">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => resetTest()}
                    className="flex-1 py-3 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" /> Try Again [Tab]
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 4. The Interactive Typing Arena (High-Contrast & Non-Blocking) */}
        {/* ================================================================= */}
        <div
          onClick={() => textareaRef.current?.focus()}
          className="relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col gap-3 cursor-text transition-all focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/20"
        >
          {/* Header indicator & Topic info */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-wider text-[11px]">
              <Keyboard className="w-3.5 h-3.5" />
              {status === 'playing'
                ? `Typing: ${currentPassage.title}`
                : status === 'paused'
                ? 'Paused - Click to resume'
                : 'Click here or start typing to begin timer'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {typedText.length} / {currentPassage.text.length} chars
            </span>
          </div>

          {/* Typing Text Stream with Crisp High-Contrast Styling */}
          <div
            ref={typingContainerRef}
            className="text-lg sm:text-2xl font-mono leading-relaxed tracking-wide select-none min-h-[110px] max-h-[190px] overflow-y-auto flex flex-wrap items-center relative p-1"
          >
            {currentPassage.text.split('').map((char, idx) => {
              const isTyped = idx < typedText.length;
              const isCurrent = idx === typedText.length;
              const userChar = isTyped ? typedText[idx] : null;
              const isCorrect = isTyped && userChar === char;
              const isIncorrect = isTyped && userChar !== char;

              let charStyle = 'text-slate-400 opacity-60'; // untyped
              if (isCorrect) {
                charStyle = 'text-emerald-400 font-bold';
              } else if (isIncorrect) {
                charStyle =
                  'text-rose-400 bg-rose-500/25 rounded px-0.5 border-b-2 border-rose-500 font-bold';
              } else if (isCurrent) {
                charStyle =
                  'text-white bg-orange-500/30 rounded px-0.5 border-b-2 border-orange-400 animate-pulse font-bold shadow-[0_0_12px_rgba(249,115,22,0.45)]';
              }

              return (
                <span
                  key={idx}
                  ref={isCurrent ? activeCharRef : null}
                  className={`transition-colors duration-75 inline-block ${charStyle}`}
                >
                  {char === ' ' ? (
                    isIncorrect ? (
                      <span className="underline decoration-rose-500 font-bold">\u00A0</span>
                    ) : (
                      '\u00A0'
                    )
                  ) : (
                    char
                  )}
                </span>
              );
            })}
          </div>

          {/* Native Hidden/Transparent Textarea Overlay for Standard Keyboard & Mobile Support */}
          <textarea
            ref={textareaRef}
            value={typedText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none select-none z-10"
            aria-label="Typing input stream"
          />

          {/* Bottom Help Toolbar */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400 z-20">
            <div className="flex items-center gap-3">
              <span>
                Key: <strong className="text-white">'{currentPassage.text[typedText.length] === ' ' ? 'Space' : currentPassage.text[typedText.length] || 'End'}'</strong>
              </span>
              <span>•</span>
              <span className="hidden sm:inline">Press [Tab] to restart</span>
            </div>

            <button
              type="button"
              tabIndex={-1}
              onClick={() => textareaRef.current?.focus()}
              className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2 cursor-pointer flex items-center gap-1 sm:hidden"
            >
              <Keyboard className="w-3.5 h-3.5" /> Tap to focus keyboard
            </button>
          </div>
        </div>
      </div>
    </GameLayout>
  );
};
