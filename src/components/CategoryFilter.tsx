import React from 'react';
import type { GameCategory } from '../types';
import { CATEGORIES, GAMES } from '../lib/gamesRegistry';
import { sounds } from '../lib/audio';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
}

const CATEGORY_ICONS: Record<GameCategory, string> = {
  All: '🎮',
  Arcade: '🕹️',
  Puzzle: '🧩',
  Board: '♟️',
  Brain: '🧠',
  Multiplayer: '👥',
  'Quick Games': '⚡',
  Party: '🎉'
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  // Count games per category for clear discoverability
  const counts = React.useMemo(() => {
    const map: Record<string, number> = { All: GAMES.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All') {
        map[cat] = GAMES.filter(
          (g) => g.category === cat || g.additionalCategories?.includes(cat)
        ).length;
      }
    });
    return map;
  }, []);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
        const icon = CATEGORY_ICONS[cat] || '🎮';
        const count = counts[cat] || 0;

        return (
          <button
            key={cat}
            onClick={() => {
              sounds.playClick();
              onSelectCategory(cat);
            }}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs sm:text-sm font-display font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              isSelected
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/25 ring-1 ring-orange-400/50'
                : 'bg-white/[0.04] backdrop-blur-md text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/10 shadow-xs'
            }`}
          >
            <span>{icon}</span>
            <span className={isSelected ? 'text-slate-950 font-bold' : 'text-slate-200'}>{cat}</span>
            <span
              className={`text-[10px] font-mono-telemetry px-1.5 py-0.5 rounded font-medium ${
                isSelected
                  ? 'bg-slate-950/20 text-slate-950 font-bold'
                  : 'bg-white/10 text-slate-400 border border-white/5'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
