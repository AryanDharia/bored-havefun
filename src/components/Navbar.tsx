import React, { useState } from 'react';
import { Gamepad2, Dices, Menu, X, Compass, Layers } from 'lucide-react';
import { navigate, useCurrentRoute } from '../lib/router';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { GAMES } from '../lib/gamesRegistry';
import { sounds } from '../lib/audio';

export const Navbar: React.FC = () => {
  const currentRoute = useCurrentRoute();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRandomPlay = () => {
    sounds.playClick();
    const playable = GAMES.filter((g) => !g.comingSoon);
    const randomIndex = Math.floor(Math.random() * playable.length);
    const chosen = playable[randomIndex];
    navigate(`/games/${chosen.id}`);
    setMobileMenuOpen(false);
  };

  const navTo = (path: string) => {
    sounds.playClick();
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090a0f]/90 dark:bg-[#090a0f]/90 light:bg-white/90 border-b border-slate-800/80 light:border-slate-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={() => navTo('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navTo('/'); }}
        >
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-600/30 group-hover:scale-105 transition-all duration-150">
            <Gamepad2 className="w-5 h-5 group-hover:rotate-6 transition-transform" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-tight text-white light:text-slate-900">
              PLAYBREAK
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono-telemetry font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {GAMES.length} GAMES
            </span>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 font-display">
          <button
            onClick={() => navTo('/')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              currentRoute === '/' 
                ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30' 
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navTo('/#games')}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            All Games
          </button>
          <button
            onClick={() => navTo('/#categories')}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            Categories
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Random Game Launcher with R key tooltip */}
          <button
            onClick={handleRandomPlay}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            title="Launch a surprise random game immediately [Press R]"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Random</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono-telemetry bg-violet-700/80 rounded border border-violet-500/40 text-violet-100">
              R
            </kbd>
          </button>

          <SoundToggle />
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-[#090a0f]/98 backdrop-blur-xl px-4 py-4 space-y-2 animate-fadeIn font-display">
          <button
            onClick={() => navTo('/')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-semibold hover:bg-violet-600/20 flex items-center gap-2.5 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-violet-400" />
            Home
          </button>
          <button
            onClick={() => navTo('/#games')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-semibold hover:bg-violet-600/20 flex items-center gap-2.5 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            All {GAMES.length} Games
          </button>
          <button
            onClick={() => navTo('/#categories')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-semibold hover:bg-violet-600/20 flex items-center gap-2.5 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-violet-400" />
            Categories
          </button>
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleRandomPlay}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 cursor-pointer"
            >
              <Dices className="w-4 h-4" />
              Play Something Random [R]
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
