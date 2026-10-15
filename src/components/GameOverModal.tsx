import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

interface GameOverModalProps {
  isOpen: boolean;
  title: string;
  score?: number;
  highScore?: number;
  isNewHighScore?: boolean;
  message?: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  title,
  score,
  highScore,
  isNewHighScore,
  message,
  onRestart,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (isNewHighScore || title.toLowerCase().includes('win') || title.toLowerCase().includes('congrat')) {
        sounds.playWin();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#fb923c', '#f59e0b', '#10b981', '#38bdf8'],
          });
        } catch {
          // ignore canvas-confetti issues
        }
      } else {
        sounds.playGameOver();
      }
    }
  }, [isOpen, isNewHighScore, title]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#0c0e18]/92 backdrop-blur-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-7 text-center shadow-2xl animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Glow & Badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30 font-black">
          {isNewHighScore ? '🏆' : title.includes('Win') ? '🎉' : '💀'}
        </div>

        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h2>
        {message && <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>}

        {/* Score Card */}
        {score !== undefined && (
          <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-4 border border-slate-200 dark:border-white/10 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Score</span>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-0.5 mb-1">{score}</div>

            {isNewHighScore && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-bold animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
                <span>New High Score!</span>
              </div>
            )}

            {highScore !== undefined && !isNewHighScore && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mt-1 font-medium">
                <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span>Best: {highScore}</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-950" />
            <span className="text-slate-950">Play Again</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              navigate('/');
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-300 dark:border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
        </div>
      </div>
    </div>
  );
};
