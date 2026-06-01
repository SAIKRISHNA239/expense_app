import type {
  Transaction,
  TransactionCreate,
  AutoPay,
  AutoPayCreate,
  BudgetState,
  DashboardOut,
} from './api';

const DB_NAME = 'spendly_offline';
const DB_VERSION = 1;
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'queue';

export type MutationKind =
  | 'ADD_TRANSACTION'
  | 'DELETE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'ADD_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'UPDATE_BUDGET'
  | 'ADD_AUTO_PAY'
  | 'DELETE_AUTO_PAY';

export interface QueuedMutation {
  queueId: string;
  kind: MutationKind;
  payload: Record<string, unknown>;
  createdAt: number;
}

type CacheKey =
  | 'transactions'
  | 'categories'
  | 'autoPays'
  | 'budgetConfig'
  | 'budgetSummary';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'queueId' });
      }
    };
  });
  return dbPromise;
}

async function cacheGet<T>(key: CacheKey): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readonly');
    const req = tx.objectStore(CACHE_STORE).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
  });
}

async function cacheSet(key: CacheKey, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    tx.objectStore(CACHE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const localDb = {
  getTransactions: () => cacheGet<Transaction[]>('transactions'),
  setTransactions: (v: Transaction[]) => cacheSet('transactions', v),

  getCategories: () => cacheGet<string[]>('categories'),
  setCategories: (v: string[]) => cacheSet('categories', v),

  getAutoPays: () => cacheGet<AutoPay[]>('autoPays'),
  setAutoPays: (v: AutoPay[]) => cacheSet('autoPays', v),

  getBudgetConfig: () => cacheGet<BudgetState>('budgetConfig'),
  setBudgetConfig: (v: BudgetState) => cacheSet('budgetConfig', v),

  getBudgetSummary: () => cacheGet<DashboardOut>('budgetSummary'),
  setBudgetSummary: (v: DashboardOut) => cacheSet('budgetSummary', v),

  async getQueue(): Promise<QueuedMutation[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const items = (req.result as QueuedMutation[]).sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
    });
  },

  async enqueue(item: QueuedMutation): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async removeFromQueue(queueId: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).delete(queueId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async setQueue(items: QueuedMutation[]): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(QUEUE_STORE);
      store.clear();
      for (const item of items) store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearQueue(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getQueueLength(): Promise<number> {
    const q = await localDb.getQueue();
    return q.length;
  },
};

export function isOfflineId(id: string): boolean {
  return id.startsWith('offline-') || id.startsWith('temp-');
}

export function newOfflineId(): string {
  return `offline-${crypto.randomUUID()}`;
}

export type { Transaction, TransactionCreate, AutoPay, AutoPayCreate, BudgetState, DashboardOut };
