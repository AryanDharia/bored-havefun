import React from 'react';
import { Gamepad2, Sparkles } from 'lucide-react';
import { GAMES } from '../lib/gamesRegistry';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-[#090a0f] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">PlayBreak</span>
              <span className="text-xs text-slate-500">— Quick games for quick breaks</span>
            </div>
            <p className="text-xs text-slate-500">Play instantly in any browser. No downloads or signups required.</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <button
            onClick={() => {
              sounds.playClick();
              const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
              navigate(`/games/${randomGame.id}`);
            }}
            className="hover:text-violet-400 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Random Game
          </button>
          <span>•</span>
          <button
            onClick={() => {
              sounds.playClick();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-white transition-colors"
          >
            Back to Top ↑
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-slate-800/40 text-center text-[11px] text-slate-600">
        PlayBreak Arcade Platform • Built with modern web standards and high-performance HTML5/React logic.
      </div>
    </footer>
  );
};
