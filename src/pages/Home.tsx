import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { GameMarquee } from '../components/GameMarquee';
import { FeaturedCarousel } from '../components/FeaturedCarousel';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { GameCard } from '../components/GameCard';
import type { GameCategory, GameInfo } from '../types';
import { GAMES } from '../lib/gamesRegistry';
import { getGameOfTheDay, formatDailyDate } from '../lib/dailyGame';
import {
  Gamepad2,
  SearchX,
  Zap,
  Brain,
  Users,
  Calendar,
  Play,
  Clock
} from 'lucide-react';
import { navigate } from '../lib/router';
import { sounds } from '../lib/audio';

type BreakIntent = 'all' | 'quick' | 'brain' | 'multiplayer';

export const Home: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [breakIntent, setBreakIntent] = useState<BreakIntent>('all');
  const gamesGridRef = useRef<HTMLDivElement>(null);

  // Deterministic Game of the Day
  const today = useMemo(() => new Date(), []);
  const dailyGame = useMemo(() => getGameOfTheDay(today), [today]);
  const dailyDateStr = useMemo(() => formatDailyDate(today), [today]);

  // Featured carousel list: prioritize flagship multiplayer and arcade titles
  const featuredGames = useMemo(() => {
    const priorityIds = ['wallz', 'business-tycoon', 'ludo', 'retro-racing', 'scribble', 'chess', 'pocket-tanks', 'snake', '2048'];
    const curated: GameInfo[] = [];

    for (const id of priorityIds) {
      const match = GAMES.find((g) => g.id === id);
      if (match) curated.push(match);
    }

    // Add any remaining marked featured games
    GAMES.filter((g) => g.featured && !priorityIds.includes(g.id)).forEach((g) => {
      curated.push(g);
    });

    return curated;
  }, []);

  // Global Keyboard Shortcuts (R = Random, / = Search, Esc = Reset)
  useEffect(() => {
    const isEditableElement = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') return true;
      if (typeof el.closest === 'function' && el.closest('[contenteditable="true"]')) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore shortcuts if typing inside inputs
      const activeEl = document.activeElement as HTMLElement | null;
      if (isEditableElement(e.target) || isEditableElement(activeEl)) {
        if (e.key === 'Escape') {
          activeEl?.blur();
          setSearch('');
        }
        return;
      }

      // 2. Never intercept browser shortcuts (Ctrl+R, Ctrl+Shift+R)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // 3. Random Game shortcut: 'R'
      if ((e.key === 'r' || e.key === 'R') && !e.shiftKey) {
        e.preventDefault();
        sounds.playClick();
        const playable = GAMES.filter((g) => !g.comingSoon);
        const randomGame = playable[Math.floor(Math.random() * playable.length)];
        navigate(`/games/${randomGame.id}`);
        return;
      }

      // 4. Focus Search shortcut: '/'
      if (e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        const searchInput = document.getElementById('search-games-input') as HTMLInputElement | null;
        searchInput?.focus();
        return;
      }

      // 5. Reset shortcut: 'Escape'
      if (e.key === 'Escape') {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100 antialiased selection:bg-orange-500 selection:text-black">
      {/* SECTION 1: HERO SECTION */}
      <Hero onExploreClick={scrollToGames} />

      {/* SECTION 2: ANIMATED "GAME OF THE DAY" MARQUEE */}
      <GameMarquee dailyGame={dailyGame} dateStr={dailyDateStr} />

      {/* MAIN CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full flex flex-col gap-12 sm:gap-16">
        {/* SECTION 3: FEATURED ARCADES CAROUSEL */}
        <div id="featured" className="w-full scroll-mt-24">
          <FeaturedCarousel featuredGames={featuredGames} />
        </div>

        {/* SECTION 4: EDITORIAL "GAME OF THE DAY" SPOTLIGHT CARD */}
        <div className="w-full relative rounded-2xl bg-gradient-to-r from-orange-500/10 via-slate-900 to-slate-950 border border-orange-500/20 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl overflow-hidden">
          {/* Subtle watermark badge */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none text-8xl">
            {dailyGame.icon}
          </div>

          <div className="flex items-start gap-4 z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-4xl sm:text-5xl shadow-inner shrink-0">
              <span>{dailyGame.icon}</span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                  <Calendar className="w-3 h-3" />
                  TODAY'S SELECTION // {dailyDateStr}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  • {dailyGame.category}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1.5">
                {dailyGame.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {dailyGame.description}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 shrink-0">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pr-2">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {dailyGame.playerCount}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {dailyGame.estimatedTime}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                navigate(`/games/${dailyGame.id}`);
              }}
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Today's Game
            </button>
          </div>
        </div>

        {/* SECTION 5: CLEAN GAME DISCOVERY CATALOG */}
        <div ref={gamesGridRef} id="games" className="w-full flex flex-col gap-6 scroll-mt-24">
          {/* Curated Break Intent Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              FILTER BY PLAY STYLE:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setBreakIntent('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  breakIntent === 'all'
                    ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                }`}
              >
                All Styles
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setBreakIntent('quick');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  breakIntent === 'quick'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:text-amber-400 border border-white/10'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400" />
                Under 2 Min Blitz
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setBreakIntent('brain');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  breakIntent === 'brain'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:text-emerald-400 border border-white/10'
                }`}
              >
                <Brain className="w-3 h-3 text-emerald-400" />
                Brain Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setBreakIntent('multiplayer');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  breakIntent === 'multiplayer'
                    ? 'bg-rose-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:text-rose-400 border border-white/10'
                }`}
              >
                <Users className="w-3 h-3 text-rose-400" />
                Multiplayer & Rooms
              </button>
            </div>
          </div>

          {/* Search & Header Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-orange-500" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {selectedCategory === 'All' ? 'Complete Game Library' : `${selectedCategory} Games`}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 ml-1.5 font-bold">
                {filteredGames.length}
              </span>
            </div>

            <div className="w-full md:w-auto">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {/* Categories Selector */}
          <div id="categories" className="scroll-mt-24">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Games Grid */}
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 px-4 bg-white/[0.02] rounded-2xl border border-white/10 max-w-md mx-auto">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="font-display text-base font-bold text-white mb-1">
                No matching games found
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                No games matched &quot;{search}&quot;. Try exploring another category or clear the search.
              </p>
              <button
                type="button"
                onClick={() => {
                  sounds.playClick();
                  setSearch('');
                  setSelectedCategory('All');
                  setBreakIntent('all');
                }}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-mono font-bold uppercase transition-all shadow-md cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
