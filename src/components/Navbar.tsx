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
    const randomIndex = Math.floor(Math.random() * GAMES.length);
    const chosen = GAMES[randomIndex];
    navigate(`/games/${chosen.id}`);
    setMobileMenuOpen(false);
  };

  const navTo = (path: string) => {
    sounds.playClick();
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090a0f]/85 dark:bg-[#090a0f]/85 light:bg-white/85 border-b border-slate-800/80 light:border-slate-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={() => navTo('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navTo('/'); }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-violet-600/30 group-hover:scale-105 group-hover:shadow-violet-600/50 transition-all duration-200">
            <Gamepad2 className="w-5 h-5 group-hover:rotate-6 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 light:from-slate-900 light:to-slate-700 bg-clip-text text-transparent">
                PlayBreak
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                Play
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Bored? Play something.</p>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => navTo('/')}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              currentRoute === '/' 
                ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm' 
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navTo('/#games')}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              currentRoute.startsWith('/games') && currentRoute === '/games'
                ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Games
          </button>
          <button
            onClick={() => navTo('/#categories')}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
          >
            Categories
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Play Random Button */}
          <button
            onClick={handleRandomPlay}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 hover:shadow-violet-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            title="Launch a surprise random game"
          >
            <Dices className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Random</span>
          </button>

          <SoundToggle />
          <ThemeToggle />

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800/80 bg-[#090a0f]/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fadeIn">
          <button
            onClick={() => navTo('/')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-medium hover:bg-violet-600/20 flex items-center gap-2.5"
          >
            <Compass className="w-4 h-4 text-violet-400" />
            Home
          </button>
          <button
            onClick={() => navTo('/#games')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-medium hover:bg-violet-600/20 flex items-center gap-2.5"
          >
            <Gamepad2 className="w-4 h-4 text-violet-400" />
            All Games
          </button>
          <button
            onClick={() => navTo('/#categories')}
            className="w-full text-left px-4 py-2.5 rounded-xl text-slate-200 font-medium hover:bg-violet-600/20 flex items-center gap-2.5"
          >
            <Layers className="w-4 h-4 text-violet-400" />
            Categories
          </button>
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleRandomPlay}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30"
            >
              <Dices className="w-4 h-4" />
              Play Something Random
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
