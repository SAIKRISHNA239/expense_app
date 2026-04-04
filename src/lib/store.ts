import { writable, derived } from 'svelte/store';

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
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
  baseBudget: number; 
  rolloverAmount: number; 
};

export const CATEGORIES = [
  "Diet",
  "Snacks/Chai",
  "Gym & Supplements",
  "Travel",
  "Outside Food",
  "Shopping",
  "Misc"
];

const STORAGE_KEYS = {
  transactions: 'zff_tx_v3', // Keep same to migrate
  autoPays: 'zff_autopay_v3',
  budget: 'zff_budget_state_v3'
};

// Utils
export const formatTime = (d: Date) => {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

export const formatDate = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const loadStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    const data = JSON.parse(val);

    // Migration logic for Transactions V3 -> V4
    if (key === STORAGE_KEYS.transactions && Array.isArray(data)) {
      return data.map((tx: any) => {
        // If it still has the old ISO string single date format
        if (tx.date.includes('T') && !tx.time) {
          const d = new Date(tx.date);
          return {
            ...tx,
            date: formatDate(d),
            time: formatTime(d)
          };
        }
        return tx;
      }) as unknown as T;
    }
    return data;
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

// Sub-Derivations
const getYM = (dateStr: string) => dateStr.substring(0, 7); // Extract YYYY-MM

export const thisMonthData = derived(
  [transactions, autoPays, budgetState],
  ([$txs, $autoPays, $budgetState]) => {
    const now = new Date();
    const currentYM = getYM(formatDate(now));

    let earliestDate = now;
    $txs.forEach(tx => {
      // Just parse the YYYY-MM-DD
      const d = new Date(tx.date || Date.now()); 
      if (d < earliestDate) earliestDate = d;
    });

    const activeMonths = new Set<string>();
    let d = new Date(earliestDate);
    d.setDate(1); 
    while (getYM(formatDate(d)) !== currentYM) {
      activeMonths.add(getYM(formatDate(d)));
      d.setMonth(d.getMonth() + 1);
    }
    
    const pastAmortizedByMonth: Record<string, number> = {};
    activeMonths.forEach(m => pastAmortizedByMonth[m] = 0);

    let currentAmortizedBurden = 0;
    const currentCategorySpending: Record<string, number> = {};
    CATEGORIES.forEach(c => currentCategorySpending[c] = 0);

    $txs.forEach(tx => {
      if (tx.category === 'Auto-Pay') return; 
      
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
          if (CATEGORIES.includes(tx.category)) {
            currentCategorySpending[tx.category] += monthlyBurden;
          } else {
             currentCategorySpending['Misc'] += monthlyBurden;
          }
        } else if (activeMonths.has(targetYM)) {
          pastAmortizedByMonth[targetYM] += monthlyBurden;
        }
      }
    });

    const totalCurrentAutoPays = $autoPays.reduce((sum, ap) => sum + ap.amount, 0);
    const pastAutoPayBurden = totalCurrentAutoPays * activeMonths.size;
    const pastVariableBurden = Object.values(pastAmortizedByMonth).reduce((a, b) => a + b, 0);

    const totalHistoricalIncomeAssumed = $budgetState.monthlyIncome * activeMonths.size;
    const dynamicRollover = $budgetState.rolloverAmount + totalHistoricalIncomeAssumed - pastVariableBurden - pastAutoPayBurden;

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

export const weeklyHeatMapData = derived(transactions, $txs => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Reorder to Mon-Sun
  const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const now = new Date();
  
  // Get Monday of current week
  const dayOfWeek = now.getDay(); 
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0,0,0,0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);

  const weekTotals: Record<string, number> = {};
  displayDays.forEach(d => weekTotals[d] = 0);

  $txs.forEach(tx => {
    // Only current week
    const dateObj = new Date(tx.date);
    if (dateObj >= monday && dateObj <= sunday && tx.category !== 'Auto-Pay') {
      const dayName = days[dateObj.getDay()];
      weekTotals[dayName] = (weekTotals[dayName] || 0) + tx.amount; // Use raw absolute hit for heatmap spikes
    }
  });

  const maxSpend = Math.max(...Object.values(weekTotals), 1); 

  return displayDays.map(day => {
    const rawAmt = weekTotals[day];
    return {
      day,
      rawAmt,
      percent: Math.min((rawAmt / maxSpend) * 100, 100),
      isMax: rawAmt === maxSpend && maxSpend > 1
    };
  });
});

export const runAutoBilling = () => {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const currentYM = getYM(formatDate(now));

  autoPays.update(aps => {
    transactions.update(txs => {
      let added = false;
      aps.forEach(ap => {
        const currentDay = now.getDate();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const effectiveDay = Math.min(ap.billingDay, lastDayOfMonth);

        if (currentDay >= effectiveDay) {
          const alreadyBilled = txs.some(tx => {
            return tx.category === 'Auto-Pay' && tx.amount === ap.amount && getYM(tx.date) === currentYM;
          });

          if (!alreadyBilled) {
            txs.push({
              id: `ap-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
              amount: ap.amount,
              category: 'Auto-Pay',
              date: formatDate(now),
              time: formatTime(now),
              durationMonths: 1
            });
            added = true;
          }
        }
      });

      if (added) {
        txs.sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
        return [...txs];
      }
      return txs;
    });
    return aps;
  });
};

export const financeApi = {
  addTransaction: (amount: number, category: string, dateStr: string, timeStr: string, durationMonths: number = 1) => {
    transactions.update(txs => {
      const newTx: Transaction = {
        id: Date.now().toString(),
        amount,
        category,
        date: dateStr,
        time: timeStr,
        durationMonths
      };
      const updated = [newTx, ...txs];
      // Keep sorted just in case retro-active records are added
      updated.sort((a, b) => {
        const d1 = new Date(`${a.date} ` + (a.time || '12:00 AM')).getTime();
        const d2 = new Date(`${b.date} ` + (b.time || '12:00 AM')).getTime();
        return d2 - d1;
      });
      return updated;
    });
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
    link.download = `zff-v4-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

if (typeof window !== 'undefined') {
  setTimeout(runAutoBilling, 500);
}
