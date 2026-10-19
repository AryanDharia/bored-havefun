import React, { useState, useEffect } from 'react';
import { Dices, Menu, X } from 'lucide-react';
import { navigate, useCurrentRoute } from '../lib/router';
import { SoundToggle } from './SoundToggle';
import { GAMES } from '../lib/gamesRegistry';
import { sounds } from '../lib/audio';

type SectionId = 'home' | 'featured' | 'games' | 'categories';

export const Navbar: React.FC = () => {
  const currentRoute = useCurrentRoute();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('home');

  useEffect(() => {
    if (currentRoute !== '/') return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 120) {
        setActiveSection('home');
        return;
      }

      const categoriesEl = document.getElementById('categories');
      const gamesEl = document.getElementById('games');
      const featuredEl = document.getElementById('featured');

      const triggerOffset = 180;

      if (categoriesEl && categoriesEl.getBoundingClientRect().top <= triggerOffset) {
        setActiveSection('categories');
      } else if (gamesEl && gamesEl.getBoundingClientRect().top <= triggerOffset) {
        setActiveSection('games');
      } else if (featuredEl && featuredEl.getBoundingClientRect().top <= triggerOffset) {
        setActiveSection('featured');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentRoute]);

  const handleRandomPlay = () => {
    sounds.playClick();
    const playable = GAMES.filter((g) => !g.comingSoon);
    const randomIndex = Math.floor(Math.random() * playable.length);
    const chosen = playable[randomIndex];
    navigate(`/games/${chosen.id}`);
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId: SectionId) => {
    sounds.playClick();
    setActiveSection(sectionId);
    setMobileMenuOpen(false);

    if (currentRoute !== '/') {
      navigate(sectionId === 'home' ? '/' : `/#${sectionId}`);
      return;
    }

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#08090d]/80 border-b border-white/10 transition-colors shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo (Nothing OS & CMF Style) */}
        <div
          onClick={() => scrollToSection('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') scrollToSection('home');
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-slate-950 shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform duration-150 font-black">
            <span className="font-mono text-base font-black tracking-tighter">PB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-tight text-white">
              PLAYBREAK
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {GAMES.length} GAMES
            </span>
          </div>
        </div>

        {/* Center Navigation Links: Apple Liquid Glass Pill */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => scrollToSection('home')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'home'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('featured')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'featured'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Featured
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('games')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'games'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('categories')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSection === 'categories'
                ? 'bg-orange-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Categories
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Quick Random Game Button with R key shortcut badge */}
          <button
            type="button"
            onClick={handleRandomPlay}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-400 text-slate-950 shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            title="Launch a random game immediately [Press R]"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Random</span>
            <kbd className="px-1 text-[9px] bg-slate-950/40 text-orange-200 rounded border border-black/20 font-bold">
              R
            </kbd>
          </button>

          <SoundToggle />

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/95 p-4 space-y-2 backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => scrollToSection('home')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              activeSection === 'home'
                ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('featured')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              activeSection === 'featured'
                ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            Featured Arcades
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('games')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              activeSection === 'games'
                ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('categories')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
              activeSection === 'categories'
                ? 'bg-orange-500/15 text-orange-400 font-bold border border-orange-500/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            Categories
          </button>
          <button
            type="button"
            onClick={handleRandomPlay}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-mono font-bold text-orange-400 hover:bg-orange-500/10 flex items-center justify-between"
          >
            <span>🎲 Random Game</span>
            <span className="text-xs bg-orange-500/20 px-1.5 py-0.5 rounded border border-orange-500/30">
              TAP TO LAUNCH
            </span>
          </button>
        </div>
      )}
    </header>
  );
};
