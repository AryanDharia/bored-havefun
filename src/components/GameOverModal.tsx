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
            colors: ['#8b5cf6', '#a78bfa', '#ec4899', '#3b82f6', '#10b981'],
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#12141f] border border-violet-500/30 p-6 sm:p-7 text-center shadow-2xl shadow-violet-950/60 animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Glow & Badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-violet-600/40">
          {isNewHighScore ? '🏆' : title.includes('Win') ? '🎉' : '💀'}
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-2">{title}</h2>
        {message && <p className="text-sm text-slate-300 mb-4">{message}</p>}

        {/* Score Card */}
        {score !== undefined && (
          <div className="bg-[#181b2a] rounded-2xl p-4 border border-slate-800 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Score</span>
            <div className="text-4xl font-black text-white mt-0.5 mb-1">{score}</div>

            {isNewHighScore && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
                <span>New High Score!</span>
              </div>
            )}

            {highScore !== undefined && !isNewHighScore && (
              <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                <Trophy className="w-3 h-3 text-amber-400" />
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
            className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              navigate('/');
            }}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Games</span>
          </button>
        </div>
      </div>
    </div>
  );
};
