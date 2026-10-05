import React, { useState, useMemo, useRef } from 'react';
import { Hero } from '../components/Hero';
import { SearchBar } from '../components/SearchBar';
import { CategoryFilter } from '../components/CategoryFilter';
import { GameCard } from '../components/GameCard';
import type { GameCategory } from '../types';
import { GAMES } from '../lib/gamesRegistry';
import { Gamepad2, SearchX } from 'lucide-react';

export const Home: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const gamesGridRef = useRef<HTMLDivElement>(null);

  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      // Category match
      const categoryMatch =
        selectedCategory === 'All' ||
        game.category === selectedCategory ||
        game.additionalCategories?.includes(selectedCategory);

      // Search match
      const searchLower = search.trim().toLowerCase();
      const searchMatch =
        !searchLower ||
        game.name.toLowerCase().includes(searchLower) ||
        game.description.toLowerCase().includes(searchLower) ||
        game.category.toLowerCase().includes(searchLower) ||
        game.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      return categoryMatch && searchMatch;
    });
  }, [search, selectedCategory]);

  const scrollToGames = () => {
    gamesGridRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <Hero onExploreClick={scrollToGames} />

      {/* Discovery Section */}
      <div 
        ref={gamesGridRef}
        id="games" 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full"
      >
        {/* Search & Filter Header Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {selectedCategory === 'All' ? 'All Games' : `${selectedCategory} Games`}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 ml-2">
              {filteredGames.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 px-4 bg-[#11131c] rounded-3xl border border-slate-800/80 max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No games found</h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-5">
              We couldn't find any games matching &quot;{search}&quot;. Try exploring another category or clear the search.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-violet-600/30"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
