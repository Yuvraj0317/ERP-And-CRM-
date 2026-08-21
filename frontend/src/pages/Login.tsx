import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  Boxes,
  Shield,
  UserCheck,
  ShoppingBag,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, quickLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/inventory');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please check your email and password.');
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'OPERATIONS' | 'SALES') => {
    setError('');
    try {
      await quickLogin(role);
      navigate('/inventory');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Quick login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-500">
      {/* Creative & Aesthetic Ambient Animated Vector Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Grid Pattern */}
          <pattern id="login-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" className="text-sky-500/10 dark:text-sky-400/10" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#login-grid)" />

          {/* Animated Connecting Node Lines */}
          <g className="animate-float-slow">
            <line x1="150" y1="180" x2="400" y2="350" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1.5" strokeDasharray="6 6" />
            <line x1="1200" y1="200" x2="950" y2="450" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1.5" strokeDasharray="6 6" />
            <line x1="300" y1="700" x2="650" y2="800" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>

          {/* Pulsing Ocean Blue Ambient Glow Orbs */}
          <circle cx="200" cy="180" r="320" fill="url(#ocean-orb-1)" className="animate-pulse-glow" />
          <circle cx="1250" cy="720" r="400" fill="url(#ocean-orb-2)" className="animate-pulse-glow" style={{ animationDelay: '2s' }} />

          <defs>
            <radialGradient id="ocean-orb-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 180) rotate(90) scale(320)">
              <stop stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ocean-orb-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1250 720) rotate(90) scale(400)">
              <stop stopColor="#0369a1" stopOpacity="0.18" />
              <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Header with Brand Logo & Theme Selector */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 dark:bg-sky-500 p-2.5 rounded-2xl text-white shadow-lg shadow-sky-600/25 transition-transform hover:scale-105">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight block">
              Mini Operations ERP
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono tracking-widest uppercase block -mt-0.5 font-bold">
              Enterprise Operations Platform
            </span>
          </div>
        </div>

        {/* Theme Switcher Toggle */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Hero Composition */}
        <div className="flex-1 space-y-8 text-left animate-fade-in-rise hidden lg:block">
          <div className="inline-flex items-center space-x-2 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-700 dark:text-sky-400 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>High-Performance Operations Engine</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Real-Time Stock <br />
              <span className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-400 bg-clip-text text-transparent">
                Reservation & ERP
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg leading-relaxed font-normal">
              Empowering enterprise teams with multi-location stock tracking, atomic customer order reservations, and dynamic material shortage calculations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 backdrop-blur-sm hover:border-sky-500/50 shadow-sm transition">
              <Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Multi-Location Stock</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Physical vs available balance tracking</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1.5 backdrop-blur-sm hover:border-sky-500/50 shadow-sm transition">
              <Cpu className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Atomic Concurrency</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Race-condition safe stock reservations</p>
            </div>
          </div>
        </div>

        {/* Right Glassmorphism Login Card */}
        <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-6 animate-modal-scale transition-colors duration-300">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Sign In to Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Select a quick demo role or enter credentials</p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-2xl text-center font-semibold animate-fade-in-rise">
              {error}
            </div>
          )}

          {/* Quick Demo Role Switcher Buttons */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3">
            <span className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-widest block text-center">
              ⚡ Quick Demo Sign In
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:border-sky-400 hover:scale-[1.03] active:scale-[0.97] shadow-sm"
              >
                <Shield className="h-4 w-4 mb-1 text-sky-600 dark:text-sky-400" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATIONS')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:border-sky-400 hover:scale-[1.03] active:scale-[0.97] shadow-sm"
              >
                <UserCheck className="h-4 w-4 mb-1 text-sky-600 dark:text-sky-400" />
                <span>Ops</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('SALES')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all hover:border-sky-400 hover:scale-[1.03] active:scale-[0.97] shadow-sm"
              >
                <ShoppingBag className="h-4 w-4 mb-1 text-sky-600 dark:text-sky-400" />
                <span>Sales</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono font-bold">
              or sign in manually
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@erp.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-600/25 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-900/80 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        Mini Operations ERP Platform &copy; 2026 — Verified Core Engines
      </footer>
    </div>
  );
};
