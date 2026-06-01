import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  Transaction,
  TransactionCreate,
  AutoPayCreate,
  BudgetState,
  DashboardOut,
} from './api';
import {
  localDb,
  newOfflineId,
  isOfflineId,
  type QueuedMutation,
} from './localDb';
import { isOnline } from './network';
import { queryKeys } from './queryKeys';
import { formatDate } from './utils';

function isCurrentMonth(dateStr: string): boolean {
  return dateStr.slice(0, 7) === formatDate(new Date()).slice(0, 7);
}

function applyTxBudgetDelta(
  summary: DashboardOut,
  tx: TransactionCreate,
  sign: 1 | -1,
): DashboardOut {
  const amt = Number(tx.amount);
  const impact = tx.is_income ? amt : -amt;
  const next: DashboardOut = {
    ...summary,
    safe_to_spend: Number(summary.safe_to_spend) + impact * sign,
    current_category_spending: { ...summary.current_category_spending },
  };
  if (tx.is_income && isCurrentMonth(tx.date)) {
    next.current_month_income = Number(summary.current_month_income) + amt * sign;
  }
  if (!tx.is_income && isCurrentMonth(tx.date)) {
    next.current_category_spending[tx.category] =
      (next.current_category_spending[tx.category] ?? 0) + amt * sign;
  }
  return next;
}

async function bumpBudgetSummary(delta: TransactionCreate, sign: 1 | -1): Promise<void> {
  const summary = await localDb.getBudgetSummary();
  if (!summary) return;
  await localDb.setBudgetSummary(applyTxBudgetDelta(summary, delta, sign));
}

async function replaceTransactionId(tempId: string, realId: string): Promise<void> {
  const txs = (await localDb.getTransactions()) ?? [];
  await localDb.setTransactions(txs.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
}

// ─── Offline mutation handlers ────────────────────────────────────────────────

export async function offlineAddTransaction(data: TransactionCreate): Promise<Transaction> {
  const tx: Transaction = { ...data, id: newOfflineId() };
  const txs = (await localDb.getTransactions()) ?? [];
  txs.unshift(tx);
  await localDb.setTransactions(txs);
  await localDb.enqueue({
    queueId: crypto.randomUUID(),
    kind: 'ADD_TRANSACTION',
    payload: { data, tempId: tx.id },
    createdAt: Date.now(),
  });
  notifyQueueChanged();
  await bumpBudgetSummary(data, 1);
  return tx;
}

export async function offlineDeleteTransaction(id: string): Promise<void> {
  const txs = (await localDb.getTransactions()) ?? [];
  const deleted = txs.find((t) => t.id === id);
  if (!deleted) return;

  await localDb.setTransactions(txs.filter((t) => t.id !== id));

  if (isOfflineId(id)) {
    const queue = await localDb.getQueue();
    const addEntry = queue.find(
      (q) => q.kind === 'ADD_TRANSACTION' && q.payload.tempId === id,
    );
    if (addEntry) {
      await localDb.removeFromQueue(addEntry.queueId);
      notifyQueueChanged();
    }
  } else {
    await localDb.enqueue({
      queueId: crypto.randomUUID(),
      kind: 'DELETE_TRANSACTION',
      payload: { id },
      createdAt: Date.now(),
    });
    notifyQueueChanged();
  }

  await bumpBudgetSummary(deleted, -1);
}

export async function offlineUpdateTransaction(
  id: string,
  data: TransactionCreate,
): Promise<Transaction> {
  const txs = (await localDb.getTransactions()) ?? [];
  const prev = txs.find((t) => t.id === id);
  const updated: Transaction = { ...data, id };
  await localDb.setTransactions(txs.map((t) => (t.id === id ? updated : t)));

  if (isOfflineId(id)) {
    const queue = await localDb.getQueue();
    const addEntry = queue.find(
      (q) => q.kind === 'ADD_TRANSACTION' && q.payload.tempId === id,
    );
    if (addEntry) {
      addEntry.payload.data = data;
      await localDb.setQueue(queue);
    }
  } else {
    await localDb.enqueue({
      queueId: crypto.randomUUID(),
      kind: 'UPDATE_TRANSACTION',
      payload: { id, data },
      createdAt: Date.now(),
    });
    notifyQueueChanged();
  }

  if (prev) await bumpBudgetSummary(prev, -1);
  await bumpBudgetSummary(data, 1);
  return updated;
}

export async function offlineAddCategory(name: string): Promise<string> {
  const cats = (await localDb.getCategories()) ?? [];
  if (!cats.includes(name)) {
    await localDb.setCategories([...cats, name]);
  }
  await localDb.enqueue({
    queueId: crypto.randomUUID(),
    kind: 'ADD_CATEGORY',
    payload: { name },
    createdAt: Date.now(),
  });
  notifyQueueChanged();
  return name;
}

export async function offlineDeleteCategory(name: string, reassignTo?: string): Promise<void> {
  const cats = (await localDb.getCategories()) ?? [];
  await localDb.setCategories(cats.filter((c) => c !== name));

  const txs = (await localDb.getTransactions()) ?? [];
  if (reassignTo) {
    await localDb.setTransactions(
      txs.map((t) => (t.category === name ? { ...t, category: reassignTo } : t)),
    );
  }

  await localDb.enqueue({
    queueId: crypto.randomUUID(),
    kind: 'DELETE_CATEGORY',
    payload: { name, reassignTo },
    createdAt: Date.now(),
  });
  notifyQueueChanged();
}

export async function offlineUpdateBudget(data: BudgetState): Promise<BudgetState> {
  await localDb.setBudgetConfig(data);
  await localDb.enqueue({
    queueId: crypto.randomUUID(),
    kind: 'UPDATE_BUDGET',
    payload: { data },
    createdAt: Date.now(),
  });
  notifyQueueChanged();
  return data;
}

export async function offlineAddAutoPay(data: AutoPayCreate) {
  const id = newOfflineId();
  const ap = { ...data, id };
  const list = (await localDb.getAutoPays()) ?? [];
  await localDb.setAutoPays([...list, ap]);
  await localDb.enqueue({
    queueId: crypto.randomUUID(),
    kind: 'ADD_AUTO_PAY',
    payload: { data, tempId: id },
    createdAt: Date.now(),
  });
  notifyQueueChanged();
  return ap;
}

export async function offlineDeleteAutoPay(id: string): Promise<void> {
  const list = (await localDb.getAutoPays()) ?? [];
  await localDb.setAutoPays(list.filter((a) => a.id !== id));

  if (isOfflineId(id)) {
    const queue = await localDb.getQueue();
    const entry = queue.find(
      (q) => q.kind === 'ADD_AUTO_PAY' && q.payload.tempId === id,
    );
    if (entry) await localDb.removeFromQueue(entry.queueId);
  } else {
    await localDb.enqueue({
      queueId: crypto.randomUUID(),
      kind: 'DELETE_AUTO_PAY',
      payload: { id },
      createdAt: Date.now(),
    });
    notifyQueueChanged();
  }
}

function notifyQueueChanged(): void {
  window.dispatchEvent(new Event('offline:queue-changed'));
}

export async function cacheFromServer(): Promise<void> {
  if (!isOnline()) return;
  try {
    const [transactions, categories, autoPays, budgetConfig, budgetSummary] =
      await Promise.all([
        api.getTransactions(),
        api.getCategories(),
        api.getAutoPays(),
        api.getBudgetConfig(),
        api.getBudgetSummary(),
      ]);
    await Promise.all([
      localDb.setTransactions(transactions),
      localDb.setCategories(categories),
      localDb.setAutoPays(autoPays),
      localDb.setBudgetConfig(budgetConfig),
      localDb.setBudgetSummary(budgetSummary),
    ]);
  } catch {
    /* keep existing cache */
  }
}

export async function hydrateQueryCache(queryClient: QueryClient): Promise<void> {
  const [transactions, categories, autoPays, budgetConfig, budgetSummary] =
    await Promise.all([
      localDb.getTransactions(),
      localDb.getCategories(),
      localDb.getAutoPays(),
      localDb.getBudgetConfig(),
      localDb.getBudgetSummary(),
    ]);

  if (transactions) queryClient.setQueryData(queryKeys.transactions, transactions);
  if (categories) queryClient.setQueryData(queryKeys.categories, categories);
  if (autoPays) queryClient.setQueryData(queryKeys.autoPays, autoPays);
  if (budgetConfig) queryClient.setQueryData(queryKeys.budgetConfig, budgetConfig);
  if (budgetSummary) queryClient.setQueryData(queryKeys.budgetSummary, budgetSummary);
}

// ─── Sync queue processor ───────────────────────────────────────────────────

async function processMutation(item: QueuedMutation): Promise<void> {
  switch (item.kind) {
    case 'ADD_TRANSACTION': {
      const { data, tempId } = item.payload as { data: TransactionCreate; tempId: string };
      const created = await api.addTransaction(data);
      await replaceTransactionId(tempId as string, created.id);
      break;
    }
    case 'DELETE_TRANSACTION': {
      const { id } = item.payload as { id: string };
      await api.deleteTransaction(id);
      break;
    }
    case 'UPDATE_TRANSACTION': {
      const { id, data } = item.payload as { id: string; data: TransactionCreate };
      await api.updateTransaction(id, data);
      break;
    }
    case 'ADD_CATEGORY': {
      const { name } = item.payload as { name: string };
      await api.addCategory(name);
      break;
    }
    case 'DELETE_CATEGORY': {
      const { name, reassignTo } = item.payload as { name: string; reassignTo?: string };
      await api.deleteCategory(name, reassignTo);
      break;
    }
    case 'UPDATE_BUDGET': {
      const { data } = item.payload as { data: BudgetState };
      await api.updateBudgetConfig(data);
      break;
    }
    case 'ADD_AUTO_PAY': {
      const { data, tempId } = item.payload as { data: AutoPayCreate; tempId: string };
      const created = await api.addAutoPay(data);
      const list = (await localDb.getAutoPays()) ?? [];
      await localDb.setAutoPays(list.map((a) => (a.id === tempId ? created : a)));
      break;
    }
    case 'DELETE_AUTO_PAY': {
      const { id } = item.payload as { id: string };
      await api.deleteAutoPay(id);
      break;
    }
  }
}

export async function syncPendingMutations(
  queryClient: QueryClient,
): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const queue = await localDb.getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      await processMutation(item);
      synced++;
    } catch {
      failed++;
      remaining.push(item);
      if (!isOnline()) break;
    }
  }

  await localDb.setQueue(remaining);
  notifyQueueChanged();
  await cacheFromServer();
  await hydrateQueryCache(queryClient);
  await queryClient.invalidateQueries();

  return { synced, failed };
}

export class OfflineNoCacheError extends Error {
  constructor() {
    super('No cached data — connect to the internet once to download your data.');
    this.name = 'OfflineNoCacheError';
  }
}

/** Fetch with offline fallback to IndexedDB cache. */
export async function fetchWithCache<T>(
  fetcher: () => Promise<T>,
  getter: () => Promise<T | null>,
  setter: (data: T) => Promise<void>,
): Promise<T> {
  if (!isOnline()) {
    const cached = await getter();
    if (cached != null) return cached;
    throw new OfflineNoCacheError();
  }
  try {
    const data = await fetcher();
    await setter(data);
    return data;
  } catch (err) {
    const cached = await getter();
    if (cached != null) return cached;
    throw err;
  }
}

/** Run mutation online or queue offline. */
export async function mutateWithOffline<T>(
  onlineFn: () => Promise<T>,
  offlineFn: () => Promise<T>,
): Promise<T> {
  if (!isOnline()) return offlineFn();
  try {
    return await onlineFn();
  } catch (err) {
    if (!isOnline()) return offlineFn();
    throw err;
  }
}
