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
  const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg ?? '').filter(Boolean).join(', ');
  return fallback;
}
