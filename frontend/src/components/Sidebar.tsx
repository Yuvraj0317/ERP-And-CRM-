import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  FileText,
  PieChart,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();

  const mainNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Boxes },
    { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { path: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight },
    { path: '/orders', label: 'Customer Orders', icon: ShoppingCart },
  ];

  const secondaryNavItems = [
    { label: 'Reports', icon: FileText, badge: 'Soon' },
    { label: 'Analytics', icon: PieChart, badge: 'Soon' },
    { label: 'Settings', icon: Settings, badge: 'Soon' },
  ];

  const sidebarContent = (
    <aside className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between p-4 transition-colors duration-300">
      <div className="space-y-6">
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between xl:hidden border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Navigation Menu
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Primary Operations Navigation */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block">
            Core Modules
          </span>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Secondary Extensions Preview */}
        <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block">
            System Tools
          </span>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-75"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  {item.badge}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Branding Info */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2.5 text-xs">
          <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <div className="text-[11px] overflow-hidden">
            <span className="font-bold text-slate-900 dark:text-white block truncate">
              PostgreSQL Engine
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
              Atomic Reservations Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden xl:block h-full flex-shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer Slide-Over */}
      {isOpen && (
        <div className="fixed inset-0 z-50 xl:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-10 w-64 h-full shadow-2xl animate-fade-in-rise">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
