import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const SideThemeToggle: React.FC = () => {
  const { isDark, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className="fixed right-4 sm:right-5 top-1/2 -translate-y-1/2 z-[9990] flex items-center group">
      <button
        onClick={toggleTheme}
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 rounded-full shadow-2xl border border-slate-200/90 dark:border-slate-800 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center focus:outline-none ring-2 ring-[#2563EB]/20"
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-amber-400 animate-spin-slow" />
        ) : (
          <Moon className="h-5 w-5 text-[#2563EB]" />
        )}
      </button>

      {/* Side Hover Tooltip Badge */}
      <span className="absolute right-14 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      </span>
    </div>
  );
};
