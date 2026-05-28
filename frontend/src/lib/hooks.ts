import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Transaction, TransactionCreate, DashboardOut, AutoPay, AutoPayCreate } from './api';

// ─── Query Keys ─────────────────────────────────────────────────────────────
export const queryKeys = {
  transactions: ['transactions'] as const,
  budgetSummary: ['budgetSummary'] as const,
  categories: ['categories'] as const,
  autoPays: ['autoPays'] as const,
  budgetConfig: ['budgetConfig'] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────

export const useTransactions = () => {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: api.getTransactions,
  });
};

export const useBudgetSummary = () => {
  return useQuery({
    queryKey: queryKeys.budgetSummary,
    queryFn: api.getBudgetSummary,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.getCategories,
  });
};

export const useAutoPays = () => {
  return useQuery({
    queryKey: queryKeys.autoPays,
    queryFn: api.getAutoPays,
  });
};

// ─── Optimistic Mutations ───────────────────────────────────────────────────

export const useAddTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.addTransaction,
    // When mutate is called:
    onMutate: async (newTx: TransactionCreate) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetSummary });

      // Snapshot the previous values
      const previousTransactions = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      const previousSummary = queryClient.getQueryData<DashboardOut>(queryKeys.budgetSummary);

      // Optimistically update the transactions list
      const optimisticTx: Transaction = {
        ...newTx,
        id: `temp-${Date.now()}`, // Temporary ID
      };

      if (previousTransactions) {
        queryClient.setQueryData<Transaction[]>(
          queryKeys.transactions,
          [optimisticTx, ...previousTransactions] // Assuming newest first
        );
      }

      // Optimistically update the dashboard summary if it exists
      if (previousSummary) {
        // Very basic optimistic math for safe_to_spend (just for instant feedback)
        // Note: Real amortization math is complex, so we just do a rough adjustment
        // that will be corrected once the real backend response arrives.
        const impact = newTx.is_income ? Number(newTx.amount) : -Number(newTx.amount);
        
        queryClient.setQueryData<DashboardOut>(queryKeys.budgetSummary, {
          ...previousSummary,
          safe_to_spend: Number(previousSummary.safe_to_spend) + impact,
          // We could optimistically update categories here too, but it's often overkill
        });
      }

      // Return context with snapshotted values to use on error
      return { previousTransactions, previousSummary };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTx, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions, context.previousTransactions);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.budgetSummary, context.previousSummary);
      }
      console.error('Failed to add transaction:', err);
    },
    // Always refetch after error or success to ensure we have the correct server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteTransaction,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions });
      await queryClient.cancelQueries({ queryKey: queryKeys.budgetSummary });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(queryKeys.transactions);
      const previousSummary = queryClient.getQueryData<DashboardOut>(queryKeys.budgetSummary);

      // We need to find the deleted tx to know its amount/type for optimistic summary update
      const deletedTx = previousTransactions?.find(t => t.id === id);

      if (previousTransactions) {
        queryClient.setQueryData<Transaction[]>(
          queryKeys.transactions,
          previousTransactions.filter((tx) => tx.id !== id)
        );
      }

      if (previousSummary && deletedTx) {
        // Reverse the impact
        const impact = deletedTx.is_income ? -Number(deletedTx.amount) : Number(deletedTx.amount);
        queryClient.setQueryData<DashboardOut>(queryKeys.budgetSummary, {
          ...previousSummary,
          safe_to_spend: Number(previousSummary.safe_to_spend) + impact,
        });
      }

      return { previousTransactions, previousSummary };
    },
    onError: (err, id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(queryKeys.transactions, context.previousTransactions);
      }
      if (context?.previousSummary) {
        queryClient.setQueryData(queryKeys.budgetSummary, context.previousSummary);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    },
  });
};

export const useAddAutoPay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.addAutoPay,
    onMutate: async (newAutoPay: AutoPayCreate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.autoPays });
      const previousAutoPays = queryClient.getQueryData<AutoPay[]>(queryKeys.autoPays);

      const optimisticAutoPay: AutoPay = {
        ...newAutoPay,
        id: `temp-${Date.now()}`,
      };

      if (previousAutoPays) {
        queryClient.setQueryData<AutoPay[]>(
          queryKeys.autoPays,
          [...previousAutoPays, optimisticAutoPay]
        );
      }
      return { previousAutoPays };
    },
    onError: (err, variables, context) => {
      if (context?.previousAutoPays) {
        queryClient.setQueryData(queryKeys.autoPays, context.previousAutoPays);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoPays });
      // Adding an auto-pay might trigger an immediate transaction insert
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    },
  });
};

export const useDeleteAutoPay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteAutoPay,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.autoPays });
      const previousAutoPays = queryClient.getQueryData<AutoPay[]>(queryKeys.autoPays);

      if (previousAutoPays) {
        queryClient.setQueryData<AutoPay[]>(
          queryKeys.autoPays,
          previousAutoPays.filter((ap) => ap.id !== id)
        );
      }
      return { previousAutoPays };
    },
    onError: (err, id, context) => {
      if (context?.previousAutoPays) {
        queryClient.setQueryData(queryKeys.autoPays, context.previousAutoPays);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoPays });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    },
  });
};
