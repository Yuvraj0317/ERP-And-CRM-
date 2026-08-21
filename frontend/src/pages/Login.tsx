import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Boxes, Shield, UserCheck, ShoppingBag, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aesthetic Abstract Visual Background Composition */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="150" r="400" fill="url(#blue-grad-1)" opacity="0.15" />
          <circle cx="1200" cy="750" r="500" fill="url(#blue-grad-2)" opacity="0.2" />
          <path d="M-100 600 C 300 400, 700 800, 1500 500 L 1500 1000 L -100 1000 Z" fill="url(#blue-mesh)" opacity="0.08" />
          <defs>
            <radialGradient id="blue-grad-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 150) rotate(90) scale(400)">
              <stop stopColor="#38bdf8" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="blue-grad-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1200 750) rotate(90) scale(500)">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="blue-mesh" x1="0" y1="0" x2="1440" y2="1000" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Login Card Container */}
      <div className="relative z-10 max-w-md w-full space-y-7 bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-800 animate-fade-in-rise">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-sky-500/10 p-3.5 rounded-2xl text-sky-400 ring-1 ring-sky-500/30 shadow-lg shadow-sky-500/10">
            <Boxes className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Mini Operations ERP</h2>
          <p className="text-slate-400 text-xs tracking-wide">Multi-Location Inventory & Operations Platform</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl text-center font-medium animate-fade-in-rise">
            {error}
          </div>
        )}

        {/* Quick Role Switcher Buttons */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-widest block text-center">
            ⚡ Quick Demo Login (Select Role)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Shield className="h-4 w-4 mb-1 text-purple-400" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('OPERATIONS')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserCheck className="h-4 w-4 mb-1 text-sky-400" />
              <span>Ops</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('SALES')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4 mb-1 text-emerald-400" />
              <span>Sales</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            or sign in manually
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
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
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
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
    </div>
  );
};
