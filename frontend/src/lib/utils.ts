export const INCOME_CATEGORY = 'Income';
export const AUTO_PAY_CATEGORY = 'Auto-Pay';

/** Local calendar date as YYYY-MM-DD (avoids UTC timezone shift). */
export const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Connect to sign in or register.';
  }

  const axiosErr = err as {
    response?: { status?: number; data?: { detail?: string | Array<{ msg?: string; loc?: string[] }> } };
    code?: string;
    message?: string;
  };

  if (!axiosErr.response) {
    if (axiosErr.code === 'ECONNABORTED') return 'Request timed out. Try again.';
    if (axiosErr.message?.includes('Network Error')) {
      return 'Cannot reach the server. Check your connection and that the backend is running.';
    }
    return fallback;
  }

  const status = axiosErr.response?.status ?? 0;
  const detail = axiosErr.response?.data?.detail;

  if (status === 422 && Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = d.loc?.slice(-1)[0];
        const label = field === 'confirm_password' ? 'Confirm password' : field;
        return label ? `${label}: ${d.msg}` : d.msg;
      })
      .filter(Boolean)
      .join('. ');
  }

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? '').filter(Boolean).join(', ');
  }

  if (status === 401) return 'Incorrect username or password';
  if (status === 409) return 'This username is already taken';
  if (status >= 500) return 'Server error. Please try again in a moment.';

  return fallback;
}
