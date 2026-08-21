import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  FileText,
  PieChart,
  Settings,
  User,
  ChevronDown,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const mainNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Boxes },
    { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { path: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight },
    { path: '/orders', label: 'Customer Orders', icon: ShoppingCart },
  ];

  const secondaryNavItems = [
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <aside className="w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between p-4 transition-colors duration-300">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="bg-[#2563EB] p-2.5 rounded-2xl text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Boxes className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
              Mini Operations ERP
            </span>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="xl:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Main Navigation Items */}
        <div className="space-y-1">
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
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-[#2563EB] dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 pb-1 px-3">
            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          {/* Secondary Fully-Functional Navigation Items */}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-[#2563EB] dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Profile Card at Bottom Left */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs flex-shrink-0">
              <User className="h-4 w-4 text-[#2563EB]" />
            </div>
            <div className="text-xs overflow-hidden">
              <span className="font-bold text-slate-900 dark:text-white block truncate">
                {user?.name || 'Operations User'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase block truncate">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
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
