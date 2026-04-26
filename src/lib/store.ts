import { writable, derived, get } from 'svelte/store';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM AM/PM
  durationMonths: number;
  isIncome?: boolean;
};

export type AutoPay = {
  id: string;
  name: string;
  amount: number;
  billingDay: number; // 1-31
};

export type BudgetState = {
  monthlyIncome: number;
  baseBudget: number;
  rolloverAmount: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

export const INCOME_CATEGORY = 'Income';
export const AUTO_PAY_CATEGORY = 'Auto-Pay';

const DEFAULT_CATEGORIES = [
  'Diet',
  'Snacks/Chai',
  'Gym & Supplements',
  'Travel',
  'Outside Food',
  'Shopping',
  'Misc',
];

const STORAGE_KEYS = {
  transactions: 'zff_tx_v3',
  autoPays: 'zff_autopay_v3',
  budget: 'zff_budget_state_v3',
  categories: 'zff_categories_v5',
};

// ─── Utils ───────────────────────────────────────────────────────────────────

export const formatTime = (d: Date): string => {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getYM = (dateStr: string) => dateStr.substring(0, 7);

// ─── Storage Helpers ─────────────────────────────────────────────────────────

const loadStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    const data = JSON.parse(val);

    // V3→V4 migration: ISO date → split date+time
    if (key === STORAGE_KEYS.transactions && Array.isArray(data)) {
      return data.map((tx: any) => {
        if (typeof tx.date === 'string' && tx.date.includes('T') && !tx.time) {
          const d = new Date(tx.date);
          return { ...tx, date: formatDate(d), time: formatTime(d) };
        }
        return tx;
      }) as unknown as T;
    }
    return data;
  } catch {
    return defaultValue;
  }
};

const saveStorage = (key: string, value: unknown) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// ─── Stores ──────────────────────────────────────────────────────────────────

export const transactions = writable<Transaction[]>(loadStorage(STORAGE_KEYS.transactions, []));
export const autoPays = writable<AutoPay[]>(loadStorage(STORAGE_KEYS.autoPays, []));
export const budgetState = writable<BudgetState>(
  loadStorage(STORAGE_KEYS.budget, { monthlyIncome: 0, baseBudget: 0, rolloverAmount: 0 })
);
export const categories = writable<string[]>(
  loadStorage(STORAGE_KEYS.categories, DEFAULT_CATEGORIES)
);

// Persist
transactions.subscribe(v => saveStorage(STORAGE_KEYS.transactions, v));
autoPays.subscribe(v => saveStorage(STORAGE_KEYS.autoPays, v));
budgetState.subscribe(v => saveStorage(STORAGE_KEYS.budget, v));
categories.subscribe(v => saveStorage(STORAGE_KEYS.categories, v));

// ─── Derived: Monthly Dashboard ───────────────────────────────────────────────

export const thisMonthData = derived(
  [transactions, autoPays, budgetState, categories],
  ([$txs, $autoPays, $budgetState, $cats]) => {
    const now = new Date();
    const currentYM = getYM(formatDate(now));

    // Find earliest date to build rollover history
    let earliestDate = now;
    $txs.forEach(tx => {
      const d = new Date(tx.date || Date.now());
      if (d < earliestDate) earliestDate = d;
    });

    const activeMonths = new Set<string>();
    const d = new Date(earliestDate);
    d.setDate(1);
    while (getYM(formatDate(d)) !== currentYM) {
      activeMonths.add(getYM(formatDate(d)));
      d.setMonth(d.getMonth() + 1);
    }

    const pastAmortized: Record<string, number> = {};
    activeMonths.forEach(m => (pastAmortized[m] = 0));

    let currentAmortizedBurden = 0;
    let currentMonthIncome = 0; // dynamic income from Income transactions THIS month
    const currentCategorySpending: Record<string, number> = {};
    $cats.forEach(c => (currentCategorySpending[c] = 0));

    const upcomingLiabilities: { month: string, amount: number }[] = [];
    const upcomingBurdens: Record<string, number> = {};
    for (let i = 1; i <= 3; i++) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextYM = getYM(formatDate(nextMonth));
      upcomingBurdens[nextYM] = 0;
    }

    $txs.forEach(tx => {
      // Dynamic income: count Income transactions this month
      if (tx.isIncome || tx.category === INCOME_CATEGORY) {
        if (getYM(tx.date) === currentYM) currentMonthIncome += tx.amount;
        return; // Income doesn't count as a burden
      }
      if (tx.category === AUTO_PAY_CATEGORY) return;

      const txDate = new Date(tx.date);
      const startYear = txDate.getFullYear();
      const startMonth = txDate.getMonth();
      const numMonths = tx.durationMonths || 1;
      const monthlyBurden = tx.amount / numMonths;

      for (let i = 0; i < numMonths; i++) {
        const targetDate = new Date(startYear, startMonth + i, 1);
        const targetYM = getYM(formatDate(targetDate));

        if (targetYM === currentYM) {
          currentAmortizedBurden += monthlyBurden;
          const cat = $cats.includes(tx.category) ? tx.category : 'Misc';
          currentCategorySpending[cat] = (currentCategorySpending[cat] || 0) + monthlyBurden;
        } else if (activeMonths.has(targetYM)) {
          pastAmortized[targetYM] += monthlyBurden;
        }

        if (upcomingBurdens[targetYM] !== undefined) {
          upcomingBurdens[targetYM] += monthlyBurden;
        }
      }
    });

    const totalCurrentAutoPays = $autoPays.reduce((s, ap) => s + ap.amount, 0);

    Object.keys(upcomingBurdens).sort().forEach(ym => {
      upcomingLiabilities.push({ month: ym, amount: upcomingBurdens[ym] + totalCurrentAutoPays });
    });

    const pastAutoPayBurden = totalCurrentAutoPays * activeMonths.size;
    const pastVariableBurden = Object.values(pastAmortized).reduce((a, b) => a + b, 0);

    const totalHistoricalIncome = $budgetState.monthlyIncome * activeMonths.size;
    const dynamicRollover =
      $budgetState.rolloverAmount + totalHistoricalIncome - pastVariableBurden - pastAutoPayBurden;

    // Safe = static income + dynamic (logged) income + rollover - autopays - variable burden
    const effectiveIncome = $budgetState.monthlyIncome + currentMonthIncome;
    const safeToSpend = effectiveIncome + dynamicRollover - totalCurrentAutoPays - currentAmortizedBurden;

    return {
      safeToSpend,
      dynamicRollover,
      currentAmortizedBurden,
      currentCategorySpending,
      totalAutoPays: totalCurrentAutoPays,
      currentMonthIncome,
      upcomingLiabilities,
    };
  }
);


// ─── Auto-Billing ────────────────────────────────────────────────────────────

export const runAutoBilling = () => {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const currentYM = getYM(formatDate(now));

  const aps = get(autoPays);
  const txs = get(transactions);
  const toAdd: Transaction[] = [];

  aps.forEach(ap => {
    const apTxs = txs.filter(tx => tx.category === AUTO_PAY_CATEGORY && tx.amount === ap.amount);
    apTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastBilledDate = apTxs.length > 0 ? new Date(apTxs[0].date) : null;

    let processDate = lastBilledDate
      ? new Date(lastBilledDate.getFullYear(), lastBilledDate.getMonth() + 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    while (true) {
      const py = processDate.getFullYear();
      const pm = processDate.getMonth();
      const ny = now.getFullYear();
      const nm = now.getMonth();

      if (py > ny || (py === ny && pm > nm)) {
        break; // past current month
      }

      const lastDay = new Date(py, pm + 1, 0).getDate();
      const effectiveDay = Math.min(ap.billingDay, lastDay);

      const isCurrentMonth = py === ny && pm === nm;
      if (!isCurrentMonth || now.getDate() >= effectiveDay) {
        const billDate = new Date(py, pm, effectiveDay);
        toAdd.push({
          id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          amount: ap.amount,
          category: AUTO_PAY_CATEGORY,
          date: formatDate(billDate),
          time: formatTime(billDate),
          durationMonths: 1,
        });
      }

      processDate.setMonth(processDate.getMonth() + 1);
    }
  });

  if (toAdd.length > 0) {
    transactions.update(existing => {
      const merged = [...toAdd, ...existing];
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return merged;
    });
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const financeApi = {
  addTransaction: (
    amount: number,
    category: string,
    dateStr: string,
    timeStr: string,
    durationMonths: number = 1
  ) => {
    const isIncome = category === INCOME_CATEGORY;
    transactions.update(txs => {
      const newTx: Transaction = { id: Date.now().toString(), amount, category, date: dateStr, time: timeStr, durationMonths, isIncome };
      const updated = [newTx, ...txs];
      updated.sort((a, b) => {
        const da = new Date(`${a.date} ${a.time || '12:00 AM'}`).getTime();
        const db = new Date(`${b.date} ${b.time || '12:00 AM'}`).getTime();
        return db - da;
      });
      return updated;
    });
  },

  removeTransaction: (id: string) => {
    transactions.update(txs => txs.filter(t => t.id !== id));
  },

  addAutoPay: (name: string, amount: number, billingDay: number) => {
    autoPays.update(aps => [...aps, { id: Date.now().toString(), name, amount, billingDay }]);
    runAutoBilling();
  },

  removeAutoPay: (id: string) => {
    autoPays.update(aps => aps.filter(ap => ap.id !== id));
  },

  updateBudget: (monthlyIncome: number, baseBudget: number, rolloverAmount: number) => {
    budgetState.set({ monthlyIncome, baseBudget, rolloverAmount });
  },

  addCategory: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = get(categories);
    if (current.includes(trimmed)) return false;
    categories.update(cats => [...cats, trimmed]);
    return true;
  },

  removeCategory: (name: string, fallbackCategory?: string) => {
    if (fallbackCategory) {
      transactions.update(txs => txs.map(t => t.category === name ? { ...t, category: fallbackCategory } : t));
    }
    categories.update(cats => cats.filter(c => c !== name));
  },

  exportData: () => {
    const data = {
      transactions: get(transactions),
      autoPays: get(autoPays),
      budgetState: get(budgetState),
      categories: get(categories),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zff-v5-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData: (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) transactions.set(data.transactions);
      if (data.autoPays) autoPays.set(data.autoPays);
      if (data.budgetState) budgetState.set(data.budgetState);
      if (data.categories) categories.set(data.categories);
      return true;
    } catch {
      return false;
    }
  },

  factoryReset: () => {
    localStorage.removeItem(STORAGE_KEYS.transactions);
    localStorage.removeItem(STORAGE_KEYS.autoPays);
    localStorage.removeItem(STORAGE_KEYS.budget);
    localStorage.removeItem(STORAGE_KEYS.categories);
    transactions.set([]);
    autoPays.set([]);
    budgetState.set({ monthlyIncome: 0, baseBudget: 0, rolloverAmount: 0 });
    categories.set(['Diet', 'Snacks/Chai', 'Gym & Supplements', 'Travel', 'Outside Food', 'Shopping', 'Misc']);
  },
};

// Auto-bill on boot
if (typeof window !== 'undefined') {
  setTimeout(runAutoBilling, 500);
}
