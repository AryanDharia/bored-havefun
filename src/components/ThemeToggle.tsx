import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../lib/storage';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return getStorageItem<boolean>('theme_dark', true);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    setStorageItem('theme_dark', isDark);
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-400" />}
    </button>
  );
};
