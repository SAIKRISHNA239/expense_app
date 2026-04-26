import { writable, derived, get } from 'svelte/store';
import Dexie, { type Table } from 'dexie';

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
  id?: string; // used internally by DB
  monthlyIncome: number;
  baseBudget: number;
  rolloverAmount: number;
};

// ─── DB Setup ────────────────────────────────────────────────────────────────

export class ExpenseAppDB extends Dexie {
  transactions!: Table<Transaction, string>;
  autoPays!: Table<AutoPay, string>;
  categories!: Table<{ name: string }, string>;
  budgetState!: Table<BudgetState, string>;
  
  constructor() {
    super('ExpenseAppDB');
    this.version(1).stores({
      transactions: 'id, date, category',
      autoPays: 'id',
      categories: 'name',
      budgetState: 'id'
    });
  }
}

export const db = new ExpenseAppDB();

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

// ─── Stores ──────────────────────────────────────────────────────────────────

// We start with raw empty bounds so the app mounts fast without blocking.
// Once Dexie hydrates, they populate.
export const transactions = writable<Transaction[]>([]);
export const autoPays = writable<AutoPay[]>([]);
export const budgetState = writable<BudgetState>({ monthlyIncome: 0, baseBudget: 0, rolloverAmount: 0 });
export const categories = writable<string[]>(DEFAULT_CATEGORIES);

// ─── Dexie Migration & Hydration ─────────────────────────────────────────────

export const initDbAndMigrate = async () => {
  if (typeof window === 'undefined') return;

  // Migration from localStorage
  const oldTxData = localStorage.getItem(STORAGE_KEYS.transactions);
  
  if (oldTxData) {
    try {
      console.log('Migrating legacy localStorage to Dexie...');
      
      const parsedTxs = JSON.parse(oldTxData) || [];
      const parsedAP = JSON.parse(localStorage.getItem(STORAGE_KEYS.autoPays) || '[]');
      const parsedBudget = JSON.parse(localStorage.getItem(STORAGE_KEYS.budget) || '{}');
      const parsedCat = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || 'null');
      
      // V3->V4 format check handled inside migration
      const finalTxs = parsedTxs.map((tx: any) => {
        if (typeof tx.date === 'string' && tx.date.includes('T') && !tx.time) {
          const d = new Date(tx.date);
          return { ...tx, date: formatDate(d), time: formatTime(d) };
        }
        return tx;
      });

      // Insert all elements into Dexie safely
      if (finalTxs.length) await db.transactions.bulkPut(finalTxs);
      if (parsedAP.length) await db.autoPays.bulkPut(parsedAP);
      
      const catsToInsert = parsedCat || DEFAULT_CATEGORIES;
      await db.categories.bulkPut(catsToInsert.map((c: string) => ({ name: c })));
      
      // We'll store budgetState with a hardcoded id "singleton"
      await db.budgetState.put({ ...parsedBudget, id: 'singleton' });

      // Clean up localStorage to prevent re-migration
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      console.log('Migration complete. Purged legacy localStorage.');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }

  // Hydrate exact state from Dexie to Svelte stores
  const dbTxs = await db.transactions.orderBy('date').reverse().toArray();
  // secondary sort by time in memory
  dbTxs.sort((a, b) => {
      const da = new Date(`${a.date} ${a.time || '12:00 AM'}`).getTime();
      const db = new Date(`${b.date} ${b.time || '12:00 AM'}`).getTime();
      return db - da;
  });
  transactions.set(dbTxs);

  const dbAPs = await db.autoPays.toArray();
  autoPays.set(dbAPs);

  const dbCats = await db.categories.toArray();
  if (dbCats.length > 0) {
    categories.set(dbCats.map(c => c.name));
  } else {
    // initialize default
    await db.categories.bulkPut(DEFAULT_CATEGORIES.map(name => ({name})));
  }

  const dbBudget = await db.budgetState.get('singleton');
  if (dbBudget) {
    budgetState.set({ monthlyIncome: dbBudget.monthlyIncome || 0, baseBudget: dbBudget.baseBudget || 0, rolloverAmount: dbBudget.rolloverAmount || 0 });
  }

  runAutoBilling(); // Check for fresh autopays once state is alive!
};

// Start hydration cycle on boot
if (typeof window !== 'undefined') {
  initDbAndMigrate();
}


// ─── Derived: Monthly Dashboard ───────────────────────────────────────────────

export const thisMonthData = derived(
  [transactions, autoPays, budgetState, categories],
  ([$txs, $autoPays, $budgetState, $cats]) => {
    const now = new Date();
    const currentYM = getYM(formatDate(now));

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
    let currentMonthIncome = 0;
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
      if (tx.isIncome || tx.category === INCOME_CATEGORY) {
        if (getYM(tx.date) === currentYM) currentMonthIncome += tx.amount;
        return; 
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

export const runAutoBilling = async () => {
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
    await db.transactions.bulkPut(toAdd);
    transactions.update(existing => {
      const merged = [...toAdd, ...existing];
      merged.sort((a, b) => {
        const da = new Date(`${a.date} ${a.time || '12:00 AM'}`).getTime();
        const db = new Date(`${b.date} ${b.time || '12:00 AM'}`).getTime();
        return db - da;
      });
      return merged;
    });
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const financeApi = {
  addTransaction: async (
    amount: number,
    category: string,
    dateStr: string,
    timeStr: string,
    durationMonths: number = 1
  ) => {
    const isIncome = category === INCOME_CATEGORY;
    const newTx: Transaction = { id: Date.now().toString(), amount, category, date: dateStr, time: timeStr, durationMonths, isIncome };
    
    await db.transactions.put(newTx);
    
    transactions.update(txs => {
      const updated = [newTx, ...txs];
      updated.sort((a, b) => {
        const da = new Date(`${a.date} ${a.time || '12:00 AM'}`).getTime();
        const db = new Date(`${b.date} ${b.time || '12:00 AM'}`).getTime();
        return db - da;
      });
      return updated;
    });
  },

  removeTransaction: async (id: string) => {
    await db.transactions.delete(id);
    transactions.update(txs => txs.filter(t => t.id !== id));
  },

  addAutoPay: async (name: string, amount: number, billingDay: number) => {
    const ap: AutoPay = { id: Date.now().toString(), name, amount, billingDay };
    await db.autoPays.put(ap);
    autoPays.update(aps => [...aps, ap]);
    runAutoBilling();
  },

  removeAutoPay: async (id: string) => {
    await db.autoPays.delete(id);
    autoPays.update(aps => aps.filter(ap => ap.id !== id));
  },

  updateBudget: async (monthlyIncome: number, baseBudget: number, rolloverAmount: number) => {
    const data = { id: 'singleton', monthlyIncome, baseBudget, rolloverAmount };
    await db.budgetState.put(data);
    budgetState.set({ monthlyIncome, baseBudget, rolloverAmount });
  },

  addCategory: async (name: string) => {
    const cats = get(categories);
    if (!name.trim() || cats.includes(name.trim())) return false;
    
    await db.categories.put({ name: name.trim() });
    categories.update(c => [...c, name.trim()]);
    return true;
  },

  removeCategory: async (name: string, fallbackCategory?: string) => {
    const defaultFallback = fallbackCategory || 'Misc';
    
    await db.categories.delete(name);
    categories.update(c => c.filter(cat => cat !== name));

    const txsToUpdate = get(transactions).filter(tx => tx.category === name);
    if (txsToUpdate.length > 0) {
      const updatedTxs = txsToUpdate.map(tx => ({ ...tx, category: defaultFallback }));
      await db.transactions.bulkPut(updatedTxs);
      
      transactions.update(txs => {
        return txs.map(tx => tx.category === name ? { ...tx, category: defaultFallback } : tx);
      });
    }
  },

  factoryReset: async () => {
    await db.delete();
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  },

  exportData: () => {
    const data = {
      transactions: get(transactions),
      autoPays: get(autoPays),
      budget: get(budgetState),
      categories: get(categories),
      version: 4
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `zff_backup_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  importData: async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.autoPays) await db.autoPays.bulkPut(data.autoPays);
      if (data.categories) await db.categories.bulkPut(data.categories.map((name: string) => ({ name })));
      if (data.budget) await db.budgetState.put({ ...data.budget, id: 'singleton' });
      
      await initDbAndMigrate();
      return true;
    } catch {
      return false;
    }
  }
};
