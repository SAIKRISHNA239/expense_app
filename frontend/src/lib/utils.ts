export const INCOME_CATEGORY = 'Income';
export const AUTO_PAY_CATEGORY = 'Auto-Pay';

export const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
};

export const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }); // "10:30 AM"
};

export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
