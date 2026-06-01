import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Transaction, TransactionCreate, DashboardOut, AutoPay, AutoPayCreate } from './api';
import { queryKeys } from './queryKeys';
import { localDb } from './localDb';
import { isOnline } from './network';
import {
  fetchWithCache,
  mutateWithOffline,
  offlineAddTransaction,
  offlineDeleteTransaction,
  offlineUpdateTransaction,
  offlineAddCategory,
  offlineDeleteCategory,
  offlineUpdateBudget,
  offlineAddAutoPay,
  offlineDeleteAutoPay,
  cacheFromServer,
} from './offlineSync';

// ─── Queries ────────────────────────────────────────────────────────────────

export { queryKeys };

export const useTransactions = () => {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: () =>
      fetchWithCache(
        api.getTransactions,
        localDb.getTransactions,
        localDb.setTransactions,
      ),
    networkMode: 'offlineFirst',
  });
};

export const useBudgetSummary = () => {
  return useQuery({
    queryKey: queryKeys.budgetSummary,
    queryFn: () =>
      fetchWithCache(
        api.getBudgetSummary,
        localDb.getBudgetSummary,
        localDb.setBudgetSummary,
      ),
    networkMode: 'offlineFirst',
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () =>
      fetchWithCache(api.getCategories, localDb.getCategories, localDb.setCategories),
    networkMode: 'offlineFirst',
  });
};

export const useAutoPays = () => {
  return useQuery({
    queryKey: queryKeys.autoPays,
    queryFn: () =>
      fetchWithCache(api.getAutoPays, localDb.getAutoPays, localDb.setAutoPays),
    networkMode: 'offlineFirst',
  });
};

export const useBudgetConfig = () => {
  return useQuery({
    queryKey: queryKeys.budgetConfig,
    queryFn: () =>
      fetchWithCache(
        api.getBudgetConfig,
        localDb.getBudgetConfig,
        localDb.setBudgetConfig,
      ),
    networkMode: 'offlineFirst',
  });
};

function invalidateIfOnline(
  queryClient: ReturnType<typeof useQueryClient>,
  keys: (typeof queryKeys)[keyof typeof queryKeys][],
) {
  if (!isOnline()) return;
  keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  cacheFromServer();
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newTx: TransactionCreate) =>
      mutateWithOffline(() => api.addTransaction(newTx), () => offlineAddTransaction(newTx)),
    onMutate: async (newTx: TransactionCreate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetSummary });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      const previousSummary = queryClient.getQueryData<DashboardOut>(queryKeys.budgetSummary);

      const optimisticTx: Transaction = {
        ...newTx,
        id: `temp-${Date.now()}`,
      };

      if (previousTransactions) {
        queryClient.setQueryData<Transaction[]>(queryKeys.transactions, [
          optimisticTx,
          ...previousTransactions,
        ]);
      }

      if (previousSummary) {
        const impact = newTx.is_income ? Number(newTx.amount) : -Number(newTx.amount);
        queryClient.setQueryData<DashboardOut>(queryKeys.budgetSummary, {
          ...previousSummary,
          safe_to_spend: Number(previousSummary.safe_to_spend) + impact,
        });
      }

      return { previousTransactions, previousSummary };
    },
    onError: (_err, _newTx, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions, context.previousTransactions);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.budgetSummary, context.previousSummary);
      }
    },
    onSettled: async (_data, _err, _vars, context) => {
      if (!isOnline()) {
        const txs = await localDb.getTransactions();
        const summary = await localDb.getBudgetSummary();
        if (txs) queryClient.setQueryData(queryKeys.transactions, txs);
        if (summary) queryClient.setQueryData(queryKeys.budgetSummary, summary);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.transactions, queryKeys.budgetSummary]);
      if (_err && context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions, context.previousTransactions);
      }
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      mutateWithOffline(() => api.deleteTransaction(id), () => offlineDeleteTransaction(id)),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetSummary });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      const previousSummary = queryClient.getQueryData<DashboardOut>(queryKeys.budgetSummary);
      const deletedTx = previousTransactions?.find((t) => t.id === id);

      if (previousTransactions) {
        queryClient.setQueryData<Transaction[]>(
          queryKeys.transactions,
          previousTransactions.filter((tx) => tx.id !== id),
        );
      }

      if (previousSummary && deletedTx) {
        const impact = deletedTx.is_income ? -Number(deletedTx.amount) : Number(deletedTx.amount);
        queryClient.setQueryData<DashboardOut>(queryKeys.budgetSummary, {
          ...previousSummary,
          safe_to_spend: Number(previousSummary.safe_to_spend) + impact,
        });
      }

      return { previousTransactions, previousSummary };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions, context.previousTransactions);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.budgetSummary, context.previousSummary);
      }
    },
    onSettled: async () => {
      if (!isOnline()) {
        const txs = await localDb.getTransactions();
        const summary = await localDb.getBudgetSummary();
        if (txs) queryClient.setQueryData(queryKeys.transactions, txs);
        if (summary) queryClient.setQueryData(queryKeys.budgetSummary, summary);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.transactions, queryKeys.budgetSummary]);
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionCreate }) =>
      mutateWithOffline(
        () => api.updateTransaction(id, data),
        () => offlineUpdateTransaction(id, data),
      ),
    onSettled: async () => {
      if (!isOnline()) {
        const txs = await localDb.getTransactions();
        const summary = await localDb.getBudgetSummary();
        if (txs) queryClient.setQueryData(queryKeys.transactions, txs);
        if (summary) queryClient.setQueryData(queryKeys.budgetSummary, summary);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.transactions, queryKeys.budgetSummary]);
    },
  });
};

export const useUpdateBudgetConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateBudgetConfig>[0]) =>
      mutateWithOffline(() => api.updateBudgetConfig(data), () => offlineUpdateBudget(data)),
    onSettled: async () => {
      if (!isOnline()) {
        const cfg = await localDb.getBudgetConfig();
        if (cfg) queryClient.setQueryData(queryKeys.budgetConfig, cfg);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.budgetConfig, queryKeys.budgetSummary]);
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      mutateWithOffline(() => api.addCategory(name), () => offlineAddCategory(name)),
    onSettled: async () => {
      if (!isOnline()) {
        const cats = await localDb.getCategories();
        if (cats) queryClient.setQueryData(queryKeys.categories, cats);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.categories]);
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, reassignTo }: { name: string; reassignTo?: string }) =>
      mutateWithOffline(
        () => api.deleteCategory(name, reassignTo),
        () => offlineDeleteCategory(name, reassignTo),
      ),
    onSettled: async () => {
      if (!isOnline()) {
        const [cats, txs] = await Promise.all([
          localDb.getCategories(),
          localDb.getTransactions(),
        ]);
        if (cats) queryClient.setQueryData(queryKeys.categories, cats);
        if (txs) queryClient.setQueryData(queryKeys.transactions, txs);
        return;
      }
      invalidateIfOnline(queryClient, [
        queryKeys.categories,
        queryKeys.transactions,
        queryKeys.budgetSummary,
      ]);
    },
  });
};

export const invalidateAllData = (queryClient: ReturnType<typeof useQueryClient>) => {
  Object.values(queryKeys).forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
};

export const useAddAutoPay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newAutoPay: AutoPayCreate) =>
      mutateWithOffline(() => api.addAutoPay(newAutoPay), () => offlineAddAutoPay(newAutoPay)),
    onMutate: async (newAutoPay: AutoPayCreate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.autoPays });
      const previousAutoPays = queryClient.getQueryData<AutoPay[]>(queryKeys.autoPays);

      const optimisticAutoPay: AutoPay = {
        ...newAutoPay,
        id: `temp-${Date.now()}`,
      };

      if (previousAutoPays) {
        queryClient.setQueryData<AutoPay[]>(queryKeys.autoPays, [
          ...previousAutoPays,
          optimisticAutoPay,
        ]);
      }
      return { previousAutoPays };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAutoPays) {
        queryClient.setQueryData(queryKeys.autoPays, context.previousAutoPays);
      }
    },
    onSettled: async () => {
      if (!isOnline()) {
        const aps = await localDb.getAutoPays();
        if (aps) queryClient.setQueryData(queryKeys.autoPays, aps);
        return;
      }
      invalidateIfOnline(queryClient, [
        queryKeys.autoPays,
        queryKeys.transactions,
        queryKeys.budgetSummary,
      ]);
    },
  });
};

export const useDeleteAutoPay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      mutateWithOffline(() => api.deleteAutoPay(id), () => offlineDeleteAutoPay(id)),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.autoPays });
      const previousAutoPays = queryClient.getQueryData<AutoPay[]>(queryKeys.autoPays);

      if (previousAutoPays) {
        queryClient.setQueryData<AutoPay[]>(
          queryKeys.autoPays,
          previousAutoPays.filter((ap) => ap.id !== id),
        );
      }
      return { previousAutoPays };
    },
    onError: (_err, _id, context) => {
      if (context?.previousAutoPays) {
        queryClient.setQueryData(queryKeys.autoPays, context.previousAutoPays);
      }
    },
    onSettled: async () => {
      if (!isOnline()) {
        const aps = await localDb.getAutoPays();
        if (aps) queryClient.setQueryData(queryKeys.autoPays, aps);
        return;
      }
      invalidateIfOnline(queryClient, [queryKeys.autoPays, queryKeys.budgetSummary]);
    },
  });
};
