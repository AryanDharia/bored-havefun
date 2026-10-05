import React from 'react';
import type { GameCategory } from '../types';
import { CATEGORIES } from '../lib/gamesRegistry';
import { sounds } from '../lib/audio';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => {
              sounds.playClick();
              onSelectCategory(cat);
            }}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
              isSelected
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-[1.02]'
                : 'bg-[#11131c] text-slate-400 hover:text-slate-200 hover:bg-[#181b27] border border-slate-800/80'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
