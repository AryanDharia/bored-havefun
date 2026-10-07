import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4 text-slate-400" />
      </div>
      <input
        id="search-games-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games by name, category, or tag..."
        className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-[#11131c] border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm font-body focus:outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-inner"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <div className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono-telemetry bg-slate-800 border border-slate-700 rounded text-slate-400">
            /
          </kbd>
        </div>
      )}
    </div>
  );
};
