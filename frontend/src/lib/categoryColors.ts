/** Per-category accent colors for a lively, scannable UI. */

export interface CategoryAccent {
  bg: string;
  border: string;
  text: string;
  glow: string;
}

const PRESET: Record<string, CategoryAccent> = {
  Diet: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#86efac', glow: 'rgba(34,197,94,0.2)' },
  'Snacks/Chai': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d', glow: 'rgba(245,158,11,0.2)' },
  'Gym & Supplements': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#fca5a5', glow: 'rgba(239,68,68,0.2)' },
  Travel: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#93c5fd', glow: 'rgba(59,130,246,0.2)' },
  'Outside Food': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', text: '#fdba74', glow: 'rgba(249,115,22,0.2)' },
  Shopping: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', text: '#d8b4fe', glow: 'rgba(168,85,247,0.2)' },
  Misc: { bg: 'rgba(161,161,170,0.12)', border: 'rgba(161,161,170,0.25)', text: '#d4d4d8', glow: 'rgba(161,161,170,0.15)' },
};

const FALLBACK: CategoryAccent[] = [
  { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#93c5fd', glow: 'rgba(59,130,246,0.2)' },
  { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)', text: '#f9a8d4', glow: 'rgba(236,72,153,0.2)' },
  { bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)', text: '#5eead4', glow: 'rgba(20,184,166,0.2)' },
  { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', text: '#fde047', glow: 'rgba(234,179,8,0.2)' },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function getCategoryAccent(name: string): CategoryAccent {
  return PRESET[name] ?? FALLBACK[hash(name) % FALLBACK.length];
}
