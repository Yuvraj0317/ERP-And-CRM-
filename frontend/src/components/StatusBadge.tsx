import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getBadgeStyle = (statusVal: string) => {
    switch (statusVal.toUpperCase()) {
      case 'COMPLETED':
      case 'RECEIVED':
      case 'RESERVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10';
      case 'DISPATCHED':
      case 'IN_PROGRESS':
        return 'bg-sky-50 text-sky-700 border-sky-200/80 ring-sky-500/10';
      case 'ASSIGNED':
      case 'REQUESTED':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10';
      case 'CANCELLED':
      case 'SHORTAGE':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide ring-1 transition-all ${getBadgeStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75 animate-pulse"></span>
      {status}
    </span>
  );
};
