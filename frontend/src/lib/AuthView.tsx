import { useState } from 'react';
import { LogIn, UserPlus, Shield } from 'lucide-react';
import { api, setAuthToken } from './api';
import { setStoredUsername } from './storage';

interface AuthViewProps {
  onAuthenticated: () => void;
  onShowPrivacy: () => void;
}

export default function AuthView({ onAuthenticated, onShowPrivacy }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(username.trim(), password);
      }
      const token = await api.login(username.trim(), password);
      await setAuthToken(token.access_token);
      await setStoredUsername(username.trim());
      onAuthenticated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Authentication failed. Please try again.';
      setError(typeof msg === 'string' ? msg : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center content-pad relative z-10 min-h-dvh">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <div className="brand-mark scale-[1.8] mb-5">
            <span className="brand-mark-inner">₹</span>
          </div>
          <h1 className="section-title text-white text-center">
            <span className="text-gradient">Spendly</span>
          </h1>
          <p className="text-sm text-zinc-400 font-medium mt-2 text-center max-w-[18rem] leading-relaxed">
            {mode === 'login'
              ? 'Log expenses in seconds. Know exactly what you can spend today.'
              : 'Build the daily habit. Your money, your rules, your data.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-4">
          <div>
            <label htmlFor="username" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="input-field"
            />
          </div>
          {error && <p className="text-rose-400 text-xs font-semibold text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full mt-4 text-sm text-zinc-500 font-semibold hover:text-teal-400 transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
        <button
          type="button"
          onClick={onShowPrivacy}
          className="w-full mt-3 text-xs text-zinc-600 font-medium hover:text-zinc-400 flex items-center justify-center gap-1"
        >
          <Shield className="w-3.5 h-3.5" />
          Privacy Policy
        </button>
      </div>
    </div>
  );
}
