/** Numpad amount rules — shared by Numpad and LogView display. */

export const MAX_AMOUNT = 9_999_999;
export const MAX_DECIMALS = 2;

const AMOUNT_PATTERN = /^\d{0,7}(\.\d{0,2})?$/;

export function parseAmountNum(amountStr: string): number {
  const n = parseFloat(amountStr);
  return Number.isFinite(n) ? n : 0;
}

export function isValidAmountString(s: string): boolean {
  if (s === '' || s === '0') return true;
  if (!AMOUNT_PATTERN.test(s)) return false;
  const n = parseFloat(s);
  return !Number.isNaN(n) && n <= MAX_AMOUNT;
}

export function applyNumpadKey(current: string, key: string): string {
  if (key === 'delete') return current.slice(0, -1);
  if (key === 'clear') return '';

  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }

  if (!/^\d$/.test(key)) return current;

  const next = current === '0' ? key : current + key;
  return isValidAmountString(next) ? next : current;
}

export function addQuickAmount(current: string, delta: number): string {
  const sum = Math.min(parseAmountNum(current) + delta, MAX_AMOUNT);
  if (sum === 0) return '';
  const rounded = Math.round(sum * 100) / 100;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(2).replace(/\.?0+$/, '');
}

/** Indian-style grouping for the hero display (preserves trailing dot). */
export function formatAmountDisplay(amountStr: string): string {
  if (!amountStr) return '0';

  const endsWithDot = amountStr.endsWith('.');
  const [intRaw, dec] = amountStr.split('.');
  const intPart = intRaw === '' ? '0' : intRaw;

  const formattedInt = Number(intPart).toLocaleString('en-IN');

  if (dec !== undefined) return `${formattedInt}.${dec}`;
  if (endsWithDot) return `${formattedInt}.`;
  return formattedInt;
}
