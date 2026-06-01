/**
 * Client-side auth validation — mirrors backend rules in schemas.UserRegister.
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 50;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export type FieldErrors = {
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export function validateUsername(username: string): string | undefined {
  const trimmed = username.trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters`;
  if (trimmed.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters`;
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Letters, numbers, underscore and hyphen only';
  }
  return undefined;
}

export function validatePassword(password: string, forRegister = false): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX) return `At most ${PASSWORD_MAX} characters`;
  if (forRegister && !/[a-zA-Z]/.test(password)) return 'Include at least one letter';
  if (forRegister && !/[0-9]/.test(password)) return 'Include at least one number';
  return undefined;
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return undefined;
}

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN) return 'weak';
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}

export function validateAuthForm(
  mode: 'login' | 'register',
  username: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const u = validateUsername(username);
  if (u) errors.username = u;
  const p = validatePassword(password, mode === 'register');
  if (p) errors.password = p;
  if (mode === 'register') {
    const c = validateConfirmPassword(password, confirmPassword);
    if (c) errors.confirmPassword = c;
  }
  return errors;
}
