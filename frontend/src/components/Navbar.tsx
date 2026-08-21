import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  ClipboardList,
  ArrowLeftRight,
  ShoppingCart,
  LogOut,
  User,
  Menu,
  LayoutDashboard,
} from 'lucide-react';

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Boxes },
    { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { path: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-blue-50 text-[#2563EB] border border-blue-200';
      case 'OPERATIONS':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      case 'SALES':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <header className="bg-white/95 border-b border-slate-200/80 text-slate-900 sticky top-0 z-40 shadow-sm backdrop-blur-xl transition-colors duration-300">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Leftmost Corner: Mobile Drawer Toggle & Brand Logo */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {onOpenMobileSidebar && (
              <button
                onClick={onOpenMobileSidebar}
                className="xl:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="Open navigation sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/dashboard" className="flex items-center space-x-2.5 sm:space-x-3.5 group">
              <div className="bg-[#2563EB] p-2.5 rounded-2xl text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-none">
                    Mini Operations ERP
                  </span>
                  <span className="bg-blue-50 text-[#2563EB] border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase hidden sm:inline-block">
                    v1.0
                  </span>
                </div>
                <span className="text-[10px] text-[#2563EB] font-mono tracking-widest uppercase block -mt-0.5 font-bold truncate max-w-[140px] sm:max-w-none">
                  Enterprise Operations Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Module Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
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
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rightmost Corner: User Role Badge & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            {/* User Profile & Role Pill */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 border-l border-slate-200 pl-2.5 sm:pl-3.5">
              <div className="bg-slate-100 p-2 rounded-full text-slate-700 border border-slate-200 shadow-sm hidden sm:block">
                <User className="h-4 w-4 text-[#2563EB]" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 block leading-none mb-0.5 sm:mb-1 truncate max-w-[90px] sm:max-w-none">
                  {user.name}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider ${getRoleBadge(
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
              className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 transition-all duration-200 active:scale-95 shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Horizontal Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
