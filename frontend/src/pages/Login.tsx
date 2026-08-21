import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  BarChart2,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, quickLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please check your email and password.');
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'OPERATIONS' | 'SALES') => {
    setError('');
    try {
      await quickLogin(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Quick login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Architectural Vector Composition */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Grid */}
          <pattern id="bg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-300/40" strokeWidth="0.8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#bg-grid)" />

          {/* Architectural Soft Light Polygons */}
          <polygon points="0,900 600,300 900,900" fill="url(#poly-grad-1)" opacity="0.15" />
          <polygon points="800,0 1440,500 1440,0" fill="url(#poly-grad-2)" opacity="0.1" />

          <defs>
            <linearGradient id="poly-grad-1" x1="0" y1="300" x2="900" y2="900" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="poly-grad-2" x1="800" y1="0" x2="1440" y2="500" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#0F172A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Bar with Brand Header */}
      <header className="relative z-10 w-full px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-[#2563EB] p-2.5 rounded-2xl text-white shadow-md shadow-blue-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-base text-slate-900 tracking-tight">
            Mini Operations ERP
          </span>
        </div>
      </header>

      {/* Main Two-Column Centered Layout Container */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 lg:px-12 py-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* LEFT COLUMN: Marketing & Branding Section */}
        <div className="flex-1 space-y-8 text-left animate-fade-in-rise">
          {/* Main Headline with Serif Typography for 'Minimal. Powerful. Built for Growth.' */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-slate-900 tracking-tight leading-[1.1]">
              Minimal. <br />
              Powerful. <br />
              Built for <span className="text-[#2563EB] font-serif italic">Growth.</span>
            </h1>
            <div className="w-16 h-1 bg-[#2563EB] rounded-full"></div>
            <p className="text-slate-600 text-sm sm:text-base max-w-md leading-relaxed font-normal">
              Mini Operations ERP helps you manage inventory, production and orders effortlessly.
            </p>
          </div>

          {/* Three Feature Highlights Row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80 max-w-lg">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-[#2563EB]">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold text-slate-900">Secure</span>
              </div>
              <span className="text-[11px] text-slate-500 block leading-tight">Enterprise Grade</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-[#2563EB]">
                <BarChart2 className="h-4 w-4" />
                <span className="text-xs font-bold text-slate-900">Reliable</span>
              </div>
              <span className="text-[11px] text-slate-500 block leading-tight">99.9% Uptime</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-[#2563EB]">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold text-slate-900">Efficient</span>
              </div>
              <span className="text-[11px] text-slate-500 block leading-tight">Built for Scale</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Minimalist Login Card */}
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/90 space-y-6 animate-modal-scale">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 text-xs font-normal">Sign in to continue to your account</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl text-center font-medium animate-fade-in-rise">
              {error}
            </div>
          )}

          {/* Manual Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox Options Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span>Remember me</span>
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link has been sent to your email address.'); }} className="text-[#2563EB] font-semibold hover:underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium">or</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Quick Demo Login Section */}
          <div className="space-y-3">
            <div className="text-center space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">Quick Demo Login</h4>
              <p className="text-[11px] text-slate-400">Explore the system with demo accounts</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-800 text-xs font-semibold transition-all hover:border-[#2563EB]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Shield className="h-4 w-4 mb-1 text-[#2563EB]" />
                <span className="font-bold">Admin</span>
                <span className="text-[9px] text-slate-400 font-normal">Full Access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('OPERATIONS')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-800 text-xs font-semibold transition-all hover:border-[#2563EB]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserCheck className="h-4 w-4 mb-1 text-[#2563EB]" />
                <span className="font-bold">Operations</span>
                <span className="text-[9px] text-slate-400 font-normal">Ops Access</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('SALES')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-800 text-xs font-semibold transition-all hover:border-[#2563EB]/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4 mb-1 text-[#2563EB]" />
                <span className="font-bold">Sales</span>
                <span className="text-[9px] text-slate-400 font-normal">Sales Access</span>
              </button>
            </div>
          </div>

          {/* Security Footer Note */}
          <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center space-x-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Your data is protected with enterprise-grade security.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
        Mini Operations ERP Platform &copy; 2026 — Verified Core Engines
      </footer>
    </div>
  );
};
