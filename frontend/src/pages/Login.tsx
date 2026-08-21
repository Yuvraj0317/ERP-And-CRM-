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
  CheckCircle2,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Interactive Minimalist Ambient Animated Vector Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Grid Lines */}
          <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />

          {/* Animated Ambient Light Orbs */}
          <circle cx="250" cy="200" r="350" fill="url(#orb-sky)" className="animate-pulse" style={{ animationDuration: '8s' }} />
          <circle cx="1200" cy="700" r="450" fill="url(#orb-purple)" className="animate-pulse" style={{ animationDuration: '10s' }} />

          <defs>
            <radialGradient id="orb-sky" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 200) rotate(90) scale(350)">
              <stop stopColor="#38bdf8" stopOpacity="0.2" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="orb-purple" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1200 700) rotate(90) scale(450)">
              <stop stopColor="#818cf8" stopOpacity="0.15" />
              <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Top Bar with Brand & Theme Switcher */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-900/80 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-sky-600 to-sky-400 p-2.5 rounded-2xl text-white shadow-lg shadow-sky-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight block">
              Mini Operations ERP
            </span>
            <span className="text-[10px] text-sky-400 font-mono tracking-widest uppercase block -mt-0.5">
              Enterprise Control Engine
            </span>
          </div>
        </div>

        {/* Theme Selector */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Hero + Login Card Split Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column: Platform Feature Highlights */}
        <div className="flex-1 space-y-8 text-left animate-fade-in-rise hidden lg:block">
          <div className="inline-flex items-center space-x-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>High-Performance Operations Engine</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Real-Time Stock <br />
              <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Reservation & ERP
              </span>
            </h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed font-normal">
              Empowering enterprise teams with multi-location stock tracking, atomic customer order reservations, and dynamic material shortage calculations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5 backdrop-blur-sm hover:border-sky-500/40 transition">
              <Layers className="h-5 w-5 text-sky-400" />
              <h4 className="text-xs font-bold text-white">Multi-Location Stock</h4>
              <p className="text-[11px] text-slate-400">Physical vs available balance tracking</p>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1.5 backdrop-blur-sm hover:border-purple-500/40 transition">
              <Cpu className="h-5 w-5 text-purple-400" />
              <h4 className="text-xs font-bold text-white">Atomic Concurrency</h4>
              <p className="text-[11px] text-slate-400">Race-condition safe stock reservations</p>
            </div>
          </div>
        </div>

        {/* Right Column: Minimalist Glassmorphism Login Card */}
        <div className="w-full max-w-md bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-slate-800/90 space-y-6 animate-modal-scale">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-black text-white tracking-tight">Sign In to ERP</h2>
            <p className="text-slate-400 text-xs font-medium">Select a role below or enter account credentials</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-2xl text-center font-semibold animate-fade-in-rise">
              {error}
            </div>
          )}

          {/* Quick Demo Role Switcher Buttons */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-[11px] font-extrabold text-sky-400 uppercase tracking-widest block text-center">
              ⚡ Quick Demo Sign In
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <Shield className="h-4 w-4 mb-1 text-purple-400" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATIONS')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <UserCheck className="h-4 w-4 mb-1 text-sky-400" />
                <span>Ops</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('SALES')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <ShoppingBag className="h-4 w-4 mb-1 text-emerald-400" />
                <span>Sales</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              or enter credentials
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@erp.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-600/30 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-slate-900/80 bg-slate-950/40 backdrop-blur-md">
        Mini Operations ERP Platform &copy; 2026 — Verified Core Engines
      </footer>
    </div>
  );
};
