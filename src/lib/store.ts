import { writable, derived } from 'svelte/store';

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO string
  durationMonths: number;
};

export type AutoPay = {
  id: string;
  name: string;
  amount: number;
  billingDay: number; // 1-31
};

export type BudgetState = {
  monthlyIncome: number;
  baseBudget: number; // For future specific category limits/base allocations
  rolloverAmount: number; // Manual entry starting point
};

export const CATEGORIES = [
  "Diet (Chicken/Eggs/Paneer)",
  "Snacks/Chai",
  "Gym & Supplements",
  "Travel",
  "Outside Food",
  "Shopping",
  "Misc"
];

const STORAGE_KEYS = {
  transactions: 'zff_tx_v3',
  autoPays: 'zff_autopay_v3',
  budget: 'zff_budget_state_v3'
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
export const autoPays = writable<AutoPay[]>(loadStorage(STORAGE_KEYS.autoPays, []));
export const budgetState = writable<BudgetState>(loadStorage(STORAGE_KEYS.budget, {
  monthlyIncome: 0,
  baseBudget: 0,
  rolloverAmount: 0
}));

transactions.subscribe(v => saveStorage(STORAGE_KEYS.transactions, v));
autoPays.subscribe(v => saveStorage(STORAGE_KEYS.autoPays, v));
budgetState.subscribe(v => saveStorage(STORAGE_KEYS.budget, v));

// Helper to get Year-Month string
const getYM = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Derived Stores for Complex Math
export const thisMonthData = derived(
  [transactions, autoPays, budgetState],
  ([$txs, $autoPays, $budgetState]) => {
    const now = new Date();
    const currentYM = getYM(now);
    const currentDateMs = now.getTime();

    // 1. Calculate Active Month Sets to derive dynamic historical rollover
    // Find the earliest transaction to know how many months the app has been used
    let earliestDate = now;
    $txs.forEach(tx => {
      const d = new Date(tx.date);
      if (d < earliestDate) earliestDate = d;
    });

    const activeMonths = new Set<string>();
    let d = new Date(earliestDate);
    // Include all months from earliest tx up to last month
    d.setDate(1); // avoid end-of-month skipping bugs
    while (getYM(d) !== currentYM) {
      activeMonths.add(getYM(d));
      d.setMonth(d.getMonth() + 1);
    }
    
    // Arrays for amortized history
    const pastAmortizedByMonth: Record<string, number> = {};
    activeMonths.forEach(m => pastAmortizedByMonth[m] = 0);

    // Current Month calculations
    let currentAmortizedBurden = 0;
    const currentCategorySpending: Record<string, number> = {};
    CATEGORIES.forEach(c => currentCategorySpending[c] = 0);

    // Amortize over transactions
    $txs.forEach(tx => {
      if (tx.category === 'Auto-Pay') return; // Handled separately
      
      const txDate = new Date(tx.date);
      const startYear = txDate.getFullYear();
      const startMonth = txDate.getMonth();
      const numMonths = tx.durationMonths || 1;
      const monthlyBurden = tx.amount / numMonths;

      // Distribute burden across the months
      for (let i = 0; i < numMonths; i++) {
        const targetDate = new Date(startYear, startMonth + i, 1);
        const targetYM = getYM(targetDate);
        
        if (targetYM === currentYM) {
          currentAmortizedBurden += monthlyBurden;
          if (CATEGORIES.includes(tx.category)) {
            currentCategorySpending[tx.category] += monthlyBurden;
          } else {
             // Fallback
             currentCategorySpending['Misc'] += monthlyBurden;
          }
        } else if (activeMonths.has(targetYM)) {
          pastAmortizedByMonth[targetYM] += monthlyBurden;
        }
      }
    });

    // Calculate Past Auto-Pays
    // Auto pay occurs every month it was active. Simplified assuming constant auto-pays for history
    const totalCurrentAutoPays = $autoPays.reduce((sum, ap) => sum + ap.amount, 0);
    const pastAutoPayBurden = totalCurrentAutoPays * activeMonths.size;

    // Sum past variables
    const pastVariableBurden = Object.values(pastAmortizedByMonth).reduce((a, b) => a + b, 0);

    // Calculate Dynamic Historical Over/Under
    const totalHistoricalIncomeAssumed = $budgetState.monthlyIncome * activeMonths.size;
    const dynamicRollover = $budgetState.rolloverAmount + totalHistoricalIncomeAssumed - pastVariableBurden - pastAutoPayBurden;

    // Safe to Spend = Income + DynamicRollover - AutoPaysThisMonth - Current Amortized Burden
    const safeToSpend = $budgetState.monthlyIncome + dynamicRollover - totalCurrentAutoPays - currentAmortizedBurden;

    return {
      safeToSpend,
      dynamicRollover,
      currentAmortizedBurden,
      currentCategorySpending,
      totalAutoPays: totalCurrentAutoPays
    };
  }
);

// Auto-Billing Logic (for Dashboard UI if they want to see them as history, but since we treat Auto-Pays implicitly in Safe-To-Spend, we don't necessarily need to mint transactions for them unless we want them in recent logs. The prompt says: "check if today's date matches any Auto-Pay billingDay and auto-add it to Transactions if not already added this month.")
export const runAutoBilling = () => {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const currentYM = getYM(now);

  autoPays.update(aps => {
    transactions.update(txs => {
      let added = false;
      aps.forEach(ap => {
        // Did we pass the billing day?
        const currentDay = now.getDate();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const effectiveDay = Math.min(ap.billingDay, lastDayOfMonth);

        if (currentDay >= effectiveDay) {
          // Check if already auto-billed this month
          const alreadyBilled = txs.some(tx => {
            return tx.category === 'Auto-Pay' && tx.amount === ap.amount && getYM(new Date(tx.date)) === currentYM;
          });

          if (!alreadyBilled) {
            txs.push({
              id: `ap-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
              amount: ap.amount,
              category: 'Auto-Pay',
              date: new Date().toISOString(),
              durationMonths: 1
            });
            added = true;
          }
        }
      });

      if (added) {
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return [...txs];
      }
      return txs;
    });
    return aps;
  });
};

export const financeApi = {
  addTransaction: (amount: number, category: string, durationMonths: number = 1) => {
    transactions.update(txs => [
      {
        id: Date.now().toString(),
        amount,
        category,
        date: new Date().toISOString(),
        durationMonths
      },
      ...txs
    ]);
  },
  removeTransaction: (id: string) => {
    transactions.update(txs => txs.filter(t => t.id !== id));
  },
  addAutoPay: (name: string, amount: number, billingDay: number) => {
    autoPays.update(aps => [
      ...aps,
      { id: Date.now().toString(), name, amount, billingDay }
    ]);
    runAutoBilling();
  },
  removeAutoPay: (id: string) => {
    autoPays.update(aps => aps.filter(ap => ap.id !== id));
  },
  updateBudget: (monthlyIncome: number, baseBudget: number, rolloverAmount: number) => {
    budgetState.set({ monthlyIncome, baseBudget, rolloverAmount });
  },
  exportData: () => {
    let t, a, b;
    transactions.subscribe(v => t = v)();
    autoPays.subscribe(v => a = v)();
    budgetState.subscribe(v => b = v)();
    const data = { transactions: t, autoPays: a, budgetState: b };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zff-v3-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },
  importData: (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) transactions.set(data.transactions);
      if (data.autoPays) autoPays.set(data.autoPays);
      if (data.budgetState) budgetState.set(data.budgetState);
      return true;
    } catch {
      return false;
    }
  }
};

// Check autobilling on boot
if (typeof window !== 'undefined') {
  setTimeout(runAutoBilling, 500);
}
