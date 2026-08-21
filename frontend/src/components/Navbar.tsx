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
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/inventory', label: 'Inventory', icon: Boxes },
    { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { path: '/transfers', label: 'Internal Transfers', icon: ArrowLeftRight },
    { path: '/orders', label: 'Customer Orders', icon: ShoppingCart },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40 ring-1 ring-purple-500/30';
      case 'OPERATIONS':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40 ring-1 ring-sky-500/30';
      case 'SALES':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <header className="bg-slate-900/95 dark:bg-slate-950/95 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-md backdrop-blur-xl transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Leftmost Corner: Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-gradient-to-tr from-sky-600 to-sky-400 p-2.5 rounded-2xl text-white shadow-md shadow-sky-500/25 transition-transform hover:scale-105">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-white tracking-tight">
                  Mini Operations ERP
                </span>
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                  Pro
                </span>
              </div>
              <span className="text-[10px] text-sky-400 font-mono tracking-widest uppercase block -mt-0.5">
                Enterprise Multi-Location Engine
              </span>
            </div>
          </div>

          {/* Center: Module Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-950/70 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400/40 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rightmost Corner: Theme Selector, User Roles & Logout */}
          <div className="flex items-center space-x-3.5">
            {/* Theme Toggle Selector */}
            <ThemeToggle />

            {/* User Profile & Role Pill */}
            <div className="flex items-center space-x-3 border-l border-slate-800 pl-3.5">
              <div className="bg-slate-800 p-2 rounded-full text-slate-200 border border-slate-700 shadow-sm hidden sm:block">
                <User className="h-4 w-4 text-sky-400" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white block leading-none mb-1">
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
              className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 transition-all duration-200 active:scale-95 shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-slate-800 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};
