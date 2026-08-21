import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import {
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  LogOut,
  User,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Boxes },
    { path: '/inventory', label: 'Inventory', icon: Boxes },
    { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { path: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight },
    { path: '/orders', label: 'Customer Orders', icon: ShoppingCart },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-50 dark:bg-blue-500/20 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-500/40';
      case 'OPERATIONS':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700';
      case 'SALES':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <header className="bg-white/95 dark:bg-slate-950/95 border-b border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 sticky top-0 z-40 shadow-sm backdrop-blur-xl transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Leftmost Corner: Mobile Drawer Toggle & Brand Logo */}
          <div className="flex items-center space-x-3">
            {onOpenMobileSidebar && (
              <button
                onClick={onOpenMobileSidebar}
                className="xl:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Open navigation sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/dashboard" className="flex items-center space-x-3.5 group">
              <div className="bg-[#2563EB] p-2.5 rounded-2xl text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    Mini Operations ERP
                  </span>
                  <span className="bg-blue-50 dark:bg-blue-500/10 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                    v1.0
                  </span>
                </div>
                <span className="text-[10px] text-[#2563EB] dark:text-blue-400 font-mono tracking-widest uppercase block -mt-0.5 font-bold">
                  Enterprise Operations Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Module Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-inner transition-colors duration-300">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rightmost Corner: Theme Switcher, User Role Badge & Logout */}
          <div className="flex items-center space-x-3.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile & Role Pill */}
            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-3.5">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hidden sm:block">
                <User className="h-4 w-4 text-[#2563EB] dark:text-blue-400" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block leading-none mb-1">
                  {user.name}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            {/* Logout CTA */}
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-500/30 transition-all duration-200 active:scale-95 shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
