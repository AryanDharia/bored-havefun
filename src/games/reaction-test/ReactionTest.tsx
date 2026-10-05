import React, { useState, useRef } from 'react';
import { GameLayout } from '../../components/GameLayout';
import { GameOverModal } from '../../components/GameOverModal';
import { GAMES } from '../../lib/gamesRegistry';
import { sounds } from '../../lib/audio';
import { saveHighScore, getHighScore } from '../../lib/storage';
import { Zap, Timer } from 'lucide-react';

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export const ReactionTest: React.FC = () => {
  const gameInfo = GAMES.find((g) => g.id === 'reaction-test')!;

  const [state, setState] = useState<State>('idle');
  const [currentMs, setCurrentMs] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => getHighScore('reaction-test') || 999);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  const handleStart = () => {
    sounds.playClick();
    setState('waiting');

    // Random delay 1.5s to 4s
    const delay = Math.floor(Math.random() * 2500) + 1500;
    timeoutRef.current = window.setTimeout(() => {
      startTimeRef.current = performance.now();
      setState('ready');
      sounds.playMove();
    }, delay);
  };

  const handleScreenClick = () => {
    if (state === 'idle') {
      handleStart();
    } else if (state === 'waiting') {
      // Clicked too early!
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      sounds.playHit();
      setState('early');
    } else if (state === 'ready') {
      // Good reaction!
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      sounds.playScore();
      setCurrentMs(elapsed);
      setState('result');

      const nextHistory = [...history, elapsed];
      setHistory(nextHistory);

      if (nextHistory.length >= 5) {
        // Complete 5 attempts
        const avg = Math.round(nextHistory.reduce((a, b) => a + b, 0) / nextHistory.length);
        setAverageScore(avg);
        setGameOver(true);

        const currentBest = getHighScore('reaction-test');
        if (currentBest === 0 || avg < currentBest) {
          setIsNewHigh(true);
          setBestScore(avg);
          saveHighScore('reaction-test', avg);
        }
      }
    } else if (state === 'result' || state === 'early') {
      handleStart();
    }
  };

  const getRating = (ms: number) => {
    if (ms < 200) return '⚡ Godlike Reflexes!';
    if (ms < 250) return '🚀 Lightning Fast!';
    if (ms < 300) return '🎯 Great Reflexes';
    if (ms < 400) return '👍 Average Human Speed';
    return '🐢 A little sleepy today';
  };

  const restartAll = () => {
    setState('idle');
    setHistory([]);
    setCurrentMs(0);
    setGameOver(false);
    setIsNewHigh(false);
  };

  return (
    <GameLayout game={gameInfo} onRestart={restartAll}>
      <div className="w-full max-w-md flex flex-col items-center select-none">
        {/* Attempt tracker */}
        <div className="w-full flex items-center justify-between bg-[#121420] border border-slate-800 rounded-2xl py-2 px-5 mb-4 text-xs font-bold text-slate-300">
          <span>Attempt {history.length}/5</span>
          {bestScore < 999 && <span>Best Average: {bestScore}ms</span>}
        </div>

        {/* Interactive Reaction Box */}
        <div
          onClick={handleScreenClick}
          className={`w-full aspect-[4/3] max-w-[420px] rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl transition-all duration-200 ${
            state === 'idle'
              ? 'bg-[#141728] border-2 border-violet-500/50 hover:bg-[#1a1e33] hover:scale-[1.01]'
              : state === 'waiting'
              ? 'bg-rose-900 border-2 border-rose-500 shadow-rose-950/60'
              : state === 'ready'
              ? 'bg-emerald-500 border-2 border-emerald-300 shadow-emerald-500/60 shadow-2xl scale-[1.02] anim-pop'
              : state === 'early'
              ? 'bg-amber-900 border-2 border-amber-500 anim-shake'
              : 'bg-violet-950/70 border-2 border-violet-500/60 anim-pop'
          }`}
        >
          {state === 'idle' && (
            <>
              <Zap className="w-12 h-12 text-violet-400 mb-3 animate-bounce" />
              <h2 className="text-2xl font-black text-white mb-1">Reaction Speed Test</h2>
              <p className="text-xs text-slate-400">Click anywhere to begin.</p>
            </>
          )}

          {state === 'waiting' && (
            <>
              <span className="text-4xl mb-3">🛑</span>
              <h2 className="text-3xl font-black text-white mb-1">WAIT FOR GREEN...</h2>
              <p className="text-xs text-rose-200">Do not click yet!</p>
            </>
          )}

          {state === 'ready' && (
            <>
              <span className="text-5xl mb-3 anim-pop">⚡</span>
              <h2 className="text-4xl font-black text-white drop-shadow">CLICK NOW!</h2>
            </>
          )}

          {state === 'early' && (
            <>
              <span className="text-4xl mb-3">⚠️</span>
              <h2 className="text-2xl font-black text-white mb-1">Too Early!</h2>
              <p className="text-xs text-amber-200">You clicked before it turned green. Click to retry.</p>
            </>
          )}

          {state === 'result' && (
            <>
              <Timer className="w-10 h-10 text-emerald-400 mb-2 anim-pop" />
              <div className="text-5xl font-black text-white mb-2 font-mono anim-pop">
                {currentMs} <span className="text-2xl font-normal text-emerald-400">ms</span>
              </div>
              <p className="text-sm font-bold text-slate-200 mb-2">{getRating(currentMs)}</p>
              <span className="text-xs text-slate-400">Click to proceed to next attempt</span>
            </>
          )}
        </div>
      </div>

      <GameOverModal
        isOpen={gameOver}
        title="🏆 Test Complete!"
        score={averageScore}
        highScore={bestScore}
        isNewHighScore={isNewHigh}
        message={`Average Reaction Time: ${averageScore}ms. ${getRating(averageScore)}`}
        onRestart={restartAll}
      />
    </GameLayout>
  );
};
