import React from 'react';
import { Gamepad2, Dices, ArrowUp, Keyboard } from 'lucide-react';
import { GAMES } from '../lib/gamesRegistry';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

export const Footer: React.FC = () => {
  const handleRandomPlay = () => {
    sounds.playClick();
    const playable = GAMES.filter((g) => !g.comingSoon);
    const randomGame = playable[Math.floor(Math.random() * playable.length)];
    navigate(`/games/${randomGame.id}`);
  };

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#090a0f] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg text-slate-900 dark:text-white">PLAYBREAK</span>
              <span className="text-xs font-mono-telemetry text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                0.0S LATENCY
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Zero-friction browser arcade for quick 2-to-5 minute mental breaks.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts Cheat Sheet */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono-telemetry text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 text-slate-500 font-bold">
            <Keyboard className="w-3.5 h-3.5" />
            SHORTCUTS:
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm font-medium">
            <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold">R</kbd> Surprise Game
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm font-medium">
            <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold">/</kbd> Search
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm font-medium">
            <kbd className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-bold">ESC</kbd> Reset
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 text-xs font-display">
          <button
            onClick={handleRandomPlay}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
          >
            <Dices className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            Random Game
          </button>
          <button
            onClick={() => {
              sounds.playClick();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Top
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono-telemetry text-slate-500">
        <span>© 2026 PlayBreak Arcade • Pure Client-Side HTML5 / React logic</span>
        
        {/* Subtle Developer Branding */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
          <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/70 border border-violet-300 dark:border-violet-500/30 text-[10px] font-bold text-violet-700 dark:text-violet-300 font-mono-telemetry">
            AD
          </span>
          <span className="text-slate-700 dark:text-slate-400 font-medium tracking-wide">
            Built by Aryan Dharia
          </span>
        </div>

        <span>NO TRACKING • NO COOKIES • NO PAYWALLS</span>
      </div>
    </footer>
  );
};
