import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Boxes, Shield, UserCheck, ShoppingBag, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.response?.data?.error || 'Failed to login');
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center">
          <div className="inline-flex bg-sky-500/10 p-3 rounded-2xl text-sky-400 border border-sky-500/20 mb-3">
            <Boxes className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-white">Mini Operations ERP</h2>
          <p className="text-slate-400 text-sm mt-1">Multi-location Inventory & Order Portal</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Quick Role Switcher Buttons */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block text-center mb-2">
            ⚡ Quick Demo Login (Select Role)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('ADMIN')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition"
            >
              <Shield className="h-4 w-4 mb-1 text-purple-400" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => handleQuickLogin('OPERATIONS')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium transition"
            >
              <UserCheck className="h-4 w-4 mb-1 text-blue-400" />
              <span>Operations</span>
            </button>
            <button
              onClick={() => handleQuickLogin('SALES')}
              disabled={isLoading}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition"
            >
              <ShoppingBag className="h-4 w-4 mb-1 text-emerald-400" />
              <span>Sales User</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase tracking-wider">or sign in manually</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@erp.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-500/20"
          >
            <span>Sign In to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
