import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(username, password);
      if (user.role.code === 'USER') {
        navigate('/my-assets');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-bgBase flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-borderDark rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-brandPrimary/10 via-[#121624] to-surface p-6 border-b border-borderDark text-center relative">
          <div className="inline-flex p-2 bg-[#121624] border border-[#2B3550] rounded-xl shadow-lg mb-3">
            <img
              src="/faith-logo-app.png"
              alt="Faith Automation"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Faith Automation IT Inventory</h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 shrink-0 text-rose-400" />
              {error}
            </div>
          )}

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            icon={<UserIcon className="w-4 h-4" />}
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2" icon={<ArrowRight className="w-4 h-4" />}>
            Sign In
          </Button>
        </form>

        {/* Development Quick Seed Login Bar */}
        <div className="px-6 py-4 bg-surfaceElevated/60 border-t border-borderDark">
          <p className="text-[11px] font-semibold text-textMuted uppercase tracking-wider mb-2 text-center">
            Development Quick Accounts
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-brandPrimary text-slate-300 text-left transition-colors"
            >
              <span className="font-bold text-brandPrimary block">ADMIN</span>
              <span className="text-[10px] text-slate-400">admin / admin123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager', 'manager123')}
              className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-brandSecondary text-slate-300 text-left transition-colors"
            >
              <span className="font-bold text-brandSecondary block">MANAGER</span>
              <span className="text-[10px] text-slate-400">manager / manager123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('it', 'it123')}
              className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-brandInfo text-slate-300 text-left transition-colors"
            >
              <span className="font-bold text-brandInfo block">IT STAFF</span>
              <span className="text-[10px] text-slate-400">it / it123</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('user', 'user123')}
              className="p-2 rounded bg-slate-900 border border-slate-800 hover:border-emerald-400 text-slate-300 text-left transition-colors"
            >
              <span className="font-bold text-emerald-400 block">USER</span>
              <span className="text-[10px] text-slate-400">user / user123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
