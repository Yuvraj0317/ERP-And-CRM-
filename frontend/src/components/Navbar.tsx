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
  ShieldAlert,
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
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OPERATIONS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SALES':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-sky-500 p-2 rounded-lg text-white font-bold">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-wide">Mini Operations ERP</span>
              <span className="text-xs text-sky-400 block -mt-1 font-mono">v1.0 Production</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 border-r border-slate-700 pr-4">
              <div className="bg-slate-800 p-1.5 rounded-full text-slate-300">
                <User className="h-4 w-4" />
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-100 block">{user.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-md text-sm font-medium border border-red-500/30 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
