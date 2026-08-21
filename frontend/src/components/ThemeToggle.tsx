import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../context/ThemeContext';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';

export const ThemeToggle: React.FC<{ variant?: 'compact' | 'full' }> = ({ variant = 'compact' }) => {
  const { theme, setTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: Theme; label: string; icon: React.FC<{ className?: string }> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  const currentOption = options.find((opt) => opt.value === theme) || options[2];
  const CurrentIcon = currentOption.icon;

  if (variant === 'full') {
    return (
      <div className="flex items-center bg-slate-900/60 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-700/60 dark:border-slate-800">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={`Switch to ${opt.label} theme`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-700/80 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-200 dark:text-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-700/80 dark:border-slate-800 text-xs font-medium transition shadow-sm"
        title="Change theme preference"
      >
        <CurrentIcon className="h-4 w-4 text-sky-400" />
        <span className="capitalize text-[11px] font-semibold hidden sm:inline">{theme}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-slate-900 dark:bg-slate-950 rounded-xl shadow-xl border border-slate-800 p-1 z-50 animate-fade-in-rise">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
