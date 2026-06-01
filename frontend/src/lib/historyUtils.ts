import type { Transaction } from './api';
import { INCOME_CATEGORY, AUTO_PAY_CATEGORY, formatDate, parseLocalDate } from './utils';

export type HistoryFilter = 'all' | 'expense' | 'income';

export interface DayGroup {
  date: string;
  label: string;
  dayTotal: number;
  txs: Transaction[];
}

export interface MonthGroup {
  ym: string;
  label: string;
  days: DayGroup[];
  expenseTotal: number;
  incomeTotal: number;
}

export function formatMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatDayLabel(dateStr: string): string {
  const today = formatDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  if (dateStr === today) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  return parseLocalDate(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function isIncomeTx(tx: Transaction): boolean {
  return tx.is_income || tx.category === INCOME_CATEGORY;
}

export function isAutoPayTx(tx: Transaction): boolean {
  return Boolean(tx.auto_pay_id) || tx.category === AUTO_PAY_CATEGORY;
}

export function groupTransactions(
  transactions: Transaction[],
  search: string,
  filter: HistoryFilter,
): MonthGroup[] {
  const q = search.trim().toLowerCase();

  const filtered = transactions.filter((tx) => {
    if (filter === 'income' && !isIncomeTx(tx)) return false;
    if (filter === 'expense' && isIncomeTx(tx)) return false;
    if (!q) return true;
    return (
      tx.category.toLowerCase().includes(q) ||
      tx.date.includes(q) ||
      tx.time.toLowerCase().includes(q) ||
      String(tx.amount).includes(q)
    );
  });

  const monthMap = new Map<string, MonthGroup>();

  for (const tx of filtered) {
    const ym = tx.date.substring(0, 7);
    const inc = isIncomeTx(tx);

    if (!monthMap.has(ym)) {
      monthMap.set(ym, {
        ym,
        label: formatMonthYear(ym),
        days: [],
        expenseTotal: 0,
        incomeTotal: 0,
      });
    }

    const mg = monthMap.get(ym)!;
    if (inc) mg.incomeTotal += Number(tx.amount);
    else mg.expenseTotal += Number(tx.amount);

    let dayGroup = mg.days.find((d) => d.date === tx.date);
    if (!dayGroup) {
      dayGroup = {
        date: tx.date,
        label: formatDayLabel(tx.date),
        dayTotal: 0,
        txs: [],
      };
      mg.days.push(dayGroup);
    }

    if (!inc) dayGroup.dayTotal += Number(tx.amount);
    dayGroup.txs.push(tx);
  }

  const months = [...monthMap.values()].sort((a, b) => b.ym.localeCompare(a.ym));

  months.forEach((mg) => {
    mg.days.sort((a, b) => b.date.localeCompare(a.date));
    mg.days.forEach((d) => {
      d.txs.sort((a, b) => {
        const ta = a.time || '';
        const tb = b.time || '';
        return tb.localeCompare(ta);
      });
    });
  });

  return months;
}

export function computeHistoryStats(transactions: Transaction[]) {
  let expense = 0;
  let income = 0;
  for (const tx of transactions) {
    if (isIncomeTx(tx)) income += Number(tx.amount);
    else expense += Number(tx.amount);
  }
  return { count: transactions.length, expense, income, net: income - expense };
}
