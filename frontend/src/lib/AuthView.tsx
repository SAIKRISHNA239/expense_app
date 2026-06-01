import { useState, useMemo } from 'react';
import {
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  WifiOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api, setAuthToken } from './api';
import { setStoredUsername } from './storage';
import { getErrorMessage } from './utils';
import { isOnline } from './network';
import {
  validateAuthForm,
  getPasswordStrength,
  USERNAME_MIN,
  PASSWORD_MIN,
  type FieldErrors,
} from './authValidation';

interface AuthViewProps {
  onAuthenticated: () => void;
  onShowPrivacy: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="auth-field-error" role="alert">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

export default function AuthView({ onAuthenticated, onShowPrivacy }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = useMemo(
    () => (mode === 'register' ? getPasswordStrength(password) : null),
    [mode, password],
  );

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setFormError('');
    setFieldErrors({});
    setTouched({});
    setConfirmPassword('');
  };

  const runClientValidation = (): boolean => {
    const errors = validateAuthForm(mode, username, password, confirmPassword);
    setFieldErrors(errors);
    setTouched({ username: true, password: true, confirmPassword: true });
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isOnline()) {
      setFormError('You need an internet connection to sign in or create an account.');
      return;
    }

    if (!runClientValidation()) return;

    setLoading(true);
    try {
      const auth =
        mode === 'register'
          ? await api.register(username, password, confirmPassword)
          : await api.login(username, password);

      await setAuthToken(auth.access_token);
      await setStoredUsername(auth.user.username);
      onAuthenticated();
    } catch (err: unknown) {
      setFormError(
        getErrorMessage(
          err,
          mode === 'login' ? 'Sign in failed. Check your credentials.' : 'Could not create account.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const blurValidate = (field: keyof FieldErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    const errors = validateAuthForm(mode, username, password, confirmPassword);
    setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
  };

  const showErr = (field: keyof FieldErrors) =>
    touched[field] ? fieldErrors[field] : undefined;

  return (
    <div className="app-shell flex flex-col relative z-10 min-h-dvh">
      <div className="flex-1 flex flex-col items-center justify-center content-pad py-8">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="flex flex-col items-center mb-6">
            <div className="brand-mark scale-[1.8] mb-4">
              <span className="brand-mark-inner">₹</span>
            </div>
            <h1 className="section-title text-white text-center">
              <span className="text-gradient">Spendly</span>
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-2 text-center max-w-[18rem] leading-relaxed">
              {mode === 'login'
                ? 'Welcome back — your expenses are waiting.'
                : 'Create your account in under a minute.'}
            </p>
          </div>

          {!isOnline() && (
            <div className="auth-offline-notice mb-4">
              <WifiOff className="w-4 h-4 shrink-0" />
              Connect to the internet to sign in or register
            </div>
          )}

          <div className="auth-tabs mb-4">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
              onClick={() => switchMode('login')}
              disabled={loading}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
              onClick={() => switchMode('register')}
              disabled={loading}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-5 sm:p-6 space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="auth-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (touched.username) blurValidate('username');
                }}
                onBlur={() => blurValidate('username')}
                disabled={loading}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`input-field ${showErr('username') ? 'input-field--error' : ''}`}
                placeholder="e.g. krishna"
                aria-invalid={!!showErr('username')}
              />
              <FieldError message={showErr('username')} />
              {mode === 'register' && !showErr('username') && (
                <p className="auth-hint">
                  {USERNAME_MIN}–50 chars · letters, numbers, _ and -
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) blurValidate('password');
                  }}
                  onBlur={() => blurValidate('password')}
                  disabled={loading}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`input-field pr-11 ${showErr('password') ? 'input-field--error' : ''}`}
                  placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                  aria-invalid={!!showErr('password')}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError message={showErr('password')} />

              {mode === 'register' && password.length > 0 && (
                <div className="mt-2">
                  <div className="auth-strength-track">
                    <div
                      className={`auth-strength-fill auth-strength-fill--${strength}`}
                      style={{
                        width:
                          strength === 'weak'
                            ? '25%'
                            : strength === 'fair'
                              ? '50%'
                              : strength === 'good'
                                ? '75%'
                                : '100%',
                      }}
                    />
                  </div>
                  <p className="auth-hint capitalize">Strength: {strength}</p>
                </div>
              )}

              {mode === 'register' && !showErr('password') && password.length === 0 && (
                <p className="auth-hint">At least {PASSWORD_MIN} chars with a letter and a number</p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="auth-label">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (touched.confirmPassword) blurValidate('confirmPassword');
                    }}
                    onBlur={() => blurValidate('confirmPassword')}
                    disabled={loading}
                    autoComplete="new-password"
                    className={`input-field pr-11 ${showErr('confirmPassword') ? 'input-field--error' : ''}`}
                    placeholder="Re-enter password"
                    aria-invalid={!!showErr('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={showErr('confirmPassword')} />
                {confirmPassword.length > 0 &&
                  password === confirmPassword &&
                  !showErr('confirmPassword') && (
                    <p className="auth-hint auth-hint--ok">
                      <CheckCircle2 className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
              </div>
            )}

            {formError && (
              <div className="auth-form-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isOnline()}
              className="btn-primary w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0c0a14]/30 border-t-[#0c0a14] rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-zinc-600 mt-4 leading-relaxed">
            By continuing, you agree to our{' '}
            <button type="button" onClick={onShowPrivacy} className="text-teal-500/80 hover:text-teal-400">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
