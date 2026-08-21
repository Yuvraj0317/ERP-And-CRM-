import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 space-y-3 group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center space-x-1.5 text-xs font-semibold">
          {trend.isPositive !== false ? (
            <TrendingUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
          <span className={trend.isPositive !== false ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
