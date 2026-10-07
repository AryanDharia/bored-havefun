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
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'bg-white dark:bg-[#11131c] text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181a28] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none'
            }`}
          >
            <span>{icon}</span>
            <span className={isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>{cat}</span>
            <span
              className={`text-[10px] font-mono-telemetry px-1.5 py-0.2 rounded font-medium ${
                isSelected
                  ? 'bg-violet-700/80 text-violet-100'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-transparent'
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
