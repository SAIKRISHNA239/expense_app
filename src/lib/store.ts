import { writable, derived } from 'svelte/store';

export type TxType = 'income' | 'variable' | 'fixed' | 'one-time';

export type Transaction = {
  id: string;
  amount: number;
  type: TxType;
  category: string;
  date: string; // ISO
};

export type FixedCost = {
  id: string;
  name: string;
  amount: number;
  billingDay: number; // 1-31
  category: string;
};

export type CategoryBudget = {
  category: string;
  limit: number;
};

export const DEFAULT_VARIABLE_CATEGORIES = [
  "Diet (Chicken & Eggs)", 
  "Travel", 
  "Outside Food", 
  "Shopping", 
  "Misc"
];

export const DEFAULT_FIXED_CATEGORIES = [
  "PG/Rent", 
  "Gym", 
  "Subscriptions"
];

const STORAGE_KEYS = {
  transactions: 'zff_transactions',
  fixedCosts: 'zff_fixed_costs',
  budgets: 'zff_budgets',
  income: 'zff_income_v2'
};

const loadStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveStorage = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Main Stores
export const transactions = writable<Transaction[]>(loadStorage(STORAGE_KEYS.transactions, []));
export const fixedCosts = writable<FixedCost[]>(loadStorage(STORAGE_KEYS.fixedCosts, []));
export const budgets = writable<CategoryBudget[]>(loadStorage(STORAGE_KEYS.budgets, []));
export const monthlyIncome = writable<number>(loadStorage(STORAGE_KEYS.income, 0));

// Subscriptions to save on change
transactions.subscribe(val => saveStorage(STORAGE_KEYS.transactions, val));
fixedCosts.subscribe(val => saveStorage(STORAGE_KEYS.fixedCosts, val));
budgets.subscribe(val => saveStorage(STORAGE_KEYS.budgets, val));
monthlyIncome.subscribe(val => saveStorage(STORAGE_KEYS.income, val));

// Derived Stores
export const currentMonthTransactions = derived(transactions, $txs => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return $txs.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
});

export const spentVariableThisMonth = derived(currentMonthTransactions, $txs => {
  return $txs
    .filter(tx => tx.type === 'variable')
    .reduce((sum, tx) => sum + tx.amount, 0);
});

export const totalFixedCosts = derived(fixedCosts, $fc => {
  return $fc.reduce((sum, cost) => sum + cost.amount, 0);
});

export const safeToSpend = derived(
  [monthlyIncome, totalFixedCosts, spentVariableThisMonth],
  ([$inc, $fix, $var]) => $inc - $fix - $var
);

export const variableCategorySpending = derived(currentMonthTransactions, $txs => {
  const spending: Record<string, number> = {};
  $txs.filter(tx => tx.type === 'variable').forEach(tx => {
    spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
  });
  return spending;
});

// Auto-Billing Logic
export const runAutoBilling = () => {
  if (typeof window === 'undefined') return;
  
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let fcList: FixedCost[] = [];
  fixedCosts.subscribe(v => fcList = v)();

  let txList: Transaction[] = [];
  transactions.subscribe(v => txList = v)();

  let addedNew = false;
  
  fcList.forEach(cost => {
    // Has the billing day passed or is it today?
    // Also, handle cases where billingday is 31 but month has 30 days. Let's just say if currentDay >= cost.billingDay (or it's the last day of the month)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const effectiveBillingDay = Math.min(cost.billingDay, lastDayOfMonth);

    if (currentDay >= effectiveBillingDay) {
      // Check if already billed this month
      const alreadyBilled = txList.some(tx => {
        if (tx.type !== 'fixed' || tx.category !== cost.category) return false;
        const d = new Date(tx.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.amount === cost.amount;
      });

      if (!alreadyBilled) {
        txList.push({
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount: cost.amount,
          type: 'fixed',
          category: cost.category,
          date: new Date().toISOString()
        });
        addedNew = true;
      }
    }
  });

  if (addedNew) {
    // Sort descending by date
    txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    transactions.set(txList);
  }
};

// Store Actions API
export const financeApi = {
  addTransaction: (amount: number, type: TxType, category: string) => {
    transactions.update(txs => [
      {
        id: Date.now().toString(),
        amount,
        type,
        category,
        date: new Date().toISOString()
      },
      ...txs
    ]);
  },
  removeTransaction: (id: string) => {
    transactions.update(txs => txs.filter(t => t.id !== id));
  },
  addFixedCost: (name: string, amount: number, billingDay: number, category: string) => {
    fixedCosts.update(fc => [
      ...fc, 
      { id: Date.now().toString(), name, amount, billingDay, category }
    ]);
    runAutoBilling(); // Check immediately
  },
  removeFixedCost: (id: string) => {
    fixedCosts.update(fc => fc.filter(c => c.id !== id));
  },
  setBudget: (category: string, limit: number) => {
    budgets.update(bgts => {
      const idx = bgts.findIndex(b => b.category === category);
      if (idx !== -1) {
        bgts[idx].limit = limit;
        return [...bgts];
      }
      return [...bgts, { category, limit }];
    });
  },
  setIncome: (amount: number) => {
    monthlyIncome.set(amount);
  },
  exportData: () => {
    let t, f, b, i;
    transactions.subscribe(v => t = v)();
    fixedCosts.subscribe(v => f = v)();
    budgets.subscribe(v => b = v)();
    monthlyIncome.subscribe(v => i = v)();

    const data = { transactions: t, fixedCosts: f, budgets: b, income: i };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zff-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importData: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.transactions) transactions.set(data.transactions);
      if (data.fixedCosts) fixedCosts.set(data.fixedCosts);
      if (data.budgets) budgets.set(data.budgets);
      if (data.income !== undefined) monthlyIncome.set(data.income);
      return true;
    } catch {
      return false;
    }
  }
};

// Run autobilling once on startup if in browser
if (typeof window !== 'undefined') {
  setTimeout(runAutoBilling, 500);
}
