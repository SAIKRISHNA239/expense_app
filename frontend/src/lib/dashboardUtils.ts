import type { Transaction } from './api';
import type { DashboardOut } from './api';
import { formatDate, INCOME_CATEGORY, AUTO_PAY_CATEGORY, parseLocalDate } from './utils';
import { getCategoryAccent } from './categoryColors';

export type SafeStatus = 'over' | 'tight' | 'good' | 'healthy';

export function getSafeStatus(safe: number): SafeStatus {
  if (safe < 0) return 'over';
  if (safe < 500) return 'tight';
  if (safe < 2000) return 'good';
  return 'healthy';
}

export function getSafeStatusLabel(status: SafeStatus): string {
  if (status === 'over') return 'Over budget';
  if (status === 'tight') return 'Tight';
  if (status === 'good') return 'On track';
  return 'Healthy';
}

export function getCurrentMonthLabel(): string {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface CategorySpendRow {
  category: string;
  amount: number;
  pct: number;
  color: string;
  accentText: string;
}

export function buildCategoryBreakdown(
  categories: string[],
  summary: DashboardOut,
): CategorySpendRow[] {
  const rows = categories
    .map((cat) => ({
      category: cat,
      amount: Number(summary.current_category_spending[cat] || 0),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  if (total === 0) return [];

  return rows.map((r) => {
    const accent = getCategoryAccent(r.category);
    return {
      category: r.category,
      amount: r.amount,
      pct: (r.amount / total) * 100,
      color: accent.text,
      accentText: accent.text,
    };
  });
}

export interface WeekDayData {
  day: string;
  shortLabel: string;
  rawAmt: number;
  percent: number;
  isMax: boolean;
  isToday: boolean;
  dateStr: string;
  txs: Transaction[];
}

export interface WeeklyHeatmapResult {
  dateRangeStr: string;
  weekTotal: number;
  days: WeekDayData[];
}

const JS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DISPLAY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function buildWeeklyHeatmap(
  transactions: Transaction[],
  weekOffset: number,
): WeeklyHeatmapResult {
  const todayStr = formatDate(new Date());

  const anchor = new Date();
  anchor.setDate(anchor.getDate() - 7 * weekOffset);

  const dayOfWeek = anchor.getDay();
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekData: Record<string, { total: number; dateStr: string; txs: Transaction[] }> = {};
  DISPLAY_DAYS.forEach((d, index) => {
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + index);
    weekData[d] = { total: 0, dateStr: formatDate(targetDate), txs: [] };
  });

  transactions.forEach((tx) => {
    const dateObj = parseLocalDate(tx.date);
    if (
      dateObj >= monday &&
      dateObj <= sunday &&
      tx.category !== AUTO_PAY_CATEGORY &&
      tx.category !== INCOME_CATEGORY &&
      !tx.is_income
    ) {
      const dayName = JS_DAYS[dateObj.getDay()];
      if (weekData[dayName]) {
        weekData[dayName].total += Number(tx.amount);
        weekData[dayName].txs.push(tx);
      }
    }
  });

  const rawValues = Object.values(weekData).map((d) => d.total);
  const maxSpend = Math.max(...rawValues, 1);
  const logMax = Math.log1p(maxSpend);
  const weekTotal = rawValues.reduce((s, v) => s + v, 0);

  const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dateRangeStr = `${monday.toLocaleDateString('en-US', formatOpts)} – ${sunday.toLocaleDateString('en-US', formatOpts)}`;

  const days: WeekDayData[] = DISPLAY_DAYS.map((day) => {
    const dData = weekData[day];
    const rawAmt = dData.total;
    const logPercent = logMax > 0 ? (Math.log1p(rawAmt) / logMax) * 100 : 0;
    return {
      day,
      shortLabel: day,
      rawAmt,
      percent: Math.min(logPercent, 100),
      isMax: rawAmt === maxSpend && maxSpend > 0,
      isToday: dData.dateStr === todayStr,
      dateStr: dData.dateStr,
      txs: dData.txs,
    };
  });

  return { dateRangeStr, weekTotal, days };
}

export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}
