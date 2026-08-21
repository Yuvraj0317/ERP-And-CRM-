import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-0.5 bg-slate-200/70 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300/80 dark:border-slate-800 shadow-inner transition-colors duration-300">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white text-[#2563EB] shadow-sm font-bold'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-[11px]">Light</span>
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-slate-800 text-sky-400 shadow-sm font-bold'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-[11px]">Dark</span>
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-800 text-[#2563EB] dark:text-sky-400 shadow-sm font-bold'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        title="System OS Theme"
        aria-label="System OS Theme"
      >
        <Laptop className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-[11px]">System</span>
      </button>
    </div>
  );
};
