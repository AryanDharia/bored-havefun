import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { GameCard } from '../components/GameCard';
import type { GameCategory } from '../types';
import { GAMES } from '../lib/gamesRegistry';
import { Gamepad2, SearchX, Sparkles, Zap, Brain, Users } from 'lucide-react';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

type BreakIntent = 'all' | 'quick' | 'brain' | 'multiplayer';

export const Home: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [breakIntent, setBreakIntent] = useState<BreakIntent>('all');
  const gamesGridRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts (R = Random, / = Search, Esc = Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setSearch('');
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sounds.playClick();
        const playable = GAMES.filter((g) => !g.comingSoon);
        const randomGame = playable[Math.floor(Math.random() * playable.length)];
        navigate(`/games/${randomGame.id}`);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-games-input') as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key === 'Escape') {
        setSearch('');
        setSelectedCategory('All');
        setBreakIntent('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      // 1. Break Intent Filter
      if (breakIntent === 'quick') {
        const time = game.estimatedTime || '';
        const isQuick = time.includes('30 sec') || time.includes('1 min') || time.includes('2 min');
        if (!isQuick) return false;
      } else if (breakIntent === 'brain') {
        const isBrain = game.category === 'Brain' || game.category === 'Puzzle' || game.additionalCategories?.includes('Brain');
        if (!isBrain) return false;
      } else if (breakIntent === 'multiplayer') {
        const isMulti = game.playerCount.includes('2') || game.playerCount.includes('4') || game.category === 'Multiplayer' || game.additionalCategories?.includes('Multiplayer');
        if (!isMulti) return false;
      }

      // 2. Category match
      const categoryMatch =
        selectedCategory === 'All' ||
        game.category === selectedCategory ||
        game.additionalCategories?.includes(selectedCategory);

      // 3. Search match
      const searchLower = search.trim().toLowerCase();
      const searchMatch =
        !searchLower ||
        game.name.toLowerCase().includes(searchLower) ||
        game.description.toLowerCase().includes(searchLower) ||
        game.category.toLowerCase().includes(searchLower) ||
        game.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      return categoryMatch && searchMatch;
    });
  }, [search, selectedCategory, breakIntent]);

  const scrollToGames = () => {
    gamesGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const featuredGames = useMemo(() => {
    return GAMES.filter((g) => g.featured);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <Hero onExploreClick={scrollToGames} />

      {/* Discovery & Arcade Catalog Section */}
      <div 
        ref={gamesGridRef}
        id="games" 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full"
      >
        {/* Curated Break Mood Selectors */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-mono-telemetry uppercase tracking-wider text-slate-400">
              Filter by Break Intent:
            </span>
            {(breakIntent !== 'all' || selectedCategory !== 'All' || search) && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setSearch('');
                  setSelectedCategory('All');
                  setBreakIntent('all');
                }}
                className="text-[11px] font-mono-telemetry text-violet-400 hover:text-violet-300 underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setBreakIntent('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all cursor-pointer ${
                breakIntent === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-850/90 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Play Styles
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setBreakIntent('quick');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                breakIntent === 'quick'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-850/90 text-slate-400 hover:text-amber-300 border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              ⚡ Under 2 Min Blitz
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setBreakIntent('brain');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                breakIntent === 'brain'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-850/90 text-slate-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              🧠 Brain Reset
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                setBreakIntent('multiplayer');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                breakIntent === 'multiplayer'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-850/90 text-slate-400 hover:text-rose-300 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-rose-400" />
              👥 2-Player Versus
            </button>
          </div>
        </div>

        {/* Search & Header Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-violet-400" />
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              {selectedCategory === 'All' ? 'Game Library' : `${selectedCategory} Games`}
            </h2>
            <span className="text-xs font-mono-telemetry px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 ml-1.5">
              {filteredGames.length}
            </span>
          </div>

          <div className="w-full md:w-auto">
            <SearchBar value={search} onChange={setSearch} />
          </div>
        </div>

        {/* Categories Bar */}
        <div id="categories" className="mb-8">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Editorial Spotlight Rail (shown when on 'All' without active search filter) */}
        {selectedCategory === 'All' && breakIntent === 'all' && !search && (
          <div className="mb-10 p-5 sm:p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-display text-base sm:text-lg font-bold text-white">
                  Featured Arcades of the Day
                </h3>
              </div>
              <span className="text-[11px] font-mono-telemetry text-slate-500">
                COMMUNITY FAVORITES
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredGames.map((game) => (
                <GameCard key={`featured-${game.id}`} game={game} />
              ))}
            </div>
          </div>
        )}

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <div>
            {selectedCategory === 'All' && breakIntent === 'all' && !search && (
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                All {GAMES.length} Games (A–Z Index)
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        ) : (
          /* Empty Search State */
          <div className="text-center py-16 px-4 bg-[#11131c] rounded-2xl border border-slate-800 max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="font-display text-base font-bold text-white mb-1">No matching games found</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              No games matched &quot;{search}&quot;. Try exploring another category or clear the search.
            </p>
            <button
              onClick={() => {
                sounds.playClick();
                setSearch('');
                setSelectedCategory('All');
                setBreakIntent('all');
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-display font-bold transition-all shadow-md shadow-violet-600/30 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
