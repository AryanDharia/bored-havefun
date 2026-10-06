import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getStorageItem, setStorageItem } from '../lib/storage';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    return getStorageItem<boolean>('theme_dark', true);
  });

  useEffect(() => {
    const applyTheme = (dark: boolean) => {
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    applyTheme(isDark);
    setStorageItem('theme_dark', isDark);

    const handleSync = () => {
      const saved = getStorageItem<boolean>('theme_dark', true);
      setIsDark(saved);
      applyTheme(saved);
    };

    window.addEventListener('theme-changed', handleSync);
    return () => window.removeEventListener('theme-changed', handleSync);
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    setStorageItem('theme_dark', next);
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    >
      {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-500" />}
    </button>
  );
};
