/** Emoji + short label for scannable, friendly category buttons. */

const PRESET: Record<string, string> = {
  Diet: '🥗',
  'Snacks/Chai': '☕',
  'Gym & Supplements': '💪',
  Travel: '✈️',
  'Outside Food': '🍔',
  Shopping: '🛍️',
  Misc: '📦',
  Income: '💰',
};

const FALLBACK = ['💸', '🎯', '⭐', '🔖'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function getCategoryEmoji(name: string): string {
  return PRESET[name] ?? FALLBACK[hash(name) % FALLBACK.length];
}
