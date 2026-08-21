import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionButton?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  actionButton,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 transition-all hover:shadow-md">
      <div className="flex items-center space-x-3.5">
        <div className="bg-sky-50 text-sky-600 p-3 rounded-2xl border border-sky-100/80 shadow-inner">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-xs font-normal mt-0.5">{description}</p>
        </div>
      </div>

      {actionButton && <div className="flex items-center space-x-3">{actionButton}</div>}
    </div>
  );
};
