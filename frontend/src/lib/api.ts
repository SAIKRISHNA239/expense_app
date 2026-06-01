import axios from 'axios';
import { getStoredToken, setStoredToken } from './storage';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function initAuth(): Promise<void> {
  const token = await getStoredToken();
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

export const setAuthToken = async (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
  await setStoredToken(token);
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await setAuthToken(null);
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  time: string;
  duration_months: number;
  is_income: boolean;
}

export type TransactionCreate = Omit<Transaction, 'id'>;

export interface AutoPay {
  id: string;
  name: string;
  amount: number;
  billing_day: number;
}

export type AutoPayCreate = Omit<AutoPay, 'id'>;

export interface UpcomingLiability {
  month: string;
  amount: number;
}

export interface DashboardOut {
  safe_to_spend: number;
  dynamic_rollover: number;
  current_amortized_burden: number;
  current_category_spending: Record<string, number>;
  total_auto_pays: number;
  current_month_income: number;
  upcoming_liabilities: UpcomingLiability[];
}

export interface BudgetState {
  monthly_income: number;
  base_budget: number;
  rollover_amount: number;
}

export interface User {
  id: string;
  username: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const api = {
  register: async (username: string, password: string): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', { username, password });
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthToken> => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await apiClient.post<AuthToken>('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/auth/me');
  },

  getBudgetSummary: async (): Promise<DashboardOut> => {
    const response = await apiClient.get<DashboardOut>('/budget/summary');
    return response.data;
  },

  getBudgetConfig: async (): Promise<BudgetState> => {
    const response = await apiClient.get<BudgetState>('/budget');
    return response.data;
  },

  updateBudgetConfig: async (data: BudgetState): Promise<BudgetState> => {
    const response = await apiClient.put<BudgetState>('/budget', data);
    return response.data;
  },

  getTransactions: async (): Promise<Transaction[]> => {
    const response = await apiClient.get<Transaction[]>('/transactions');
    return response.data;
  },

  addTransaction: async (data: TransactionCreate): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>('/transactions', data);
    return response.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },

  updateTransaction: async (id: string, data: TransactionCreate): Promise<Transaction> => {
    const response = await apiClient.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  getAutoPays: async (): Promise<AutoPay[]> => {
    const response = await apiClient.get<AutoPay[]>('/auto-pays');
    return response.data;
  },

  addAutoPay: async (data: AutoPayCreate): Promise<AutoPay> => {
    const response = await apiClient.post<AutoPay>('/auto-pays', data);
    return response.data;
  },

  deleteAutoPay: async (id: string): Promise<void> => {
    await apiClient.delete(`/auto-pays/${id}`);
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/categories');
    return response.data;
  },

  addCategory: async (name: string): Promise<string> => {
    const response = await apiClient.post<{ name: string }>('/categories', { name });
    return response.data.name;
  },

  deleteCategory: async (name: string, reassignTo?: string): Promise<void> => {
    await apiClient.delete(`/categories/${encodeURIComponent(name)}`, {
      params: reassignTo ? { reassign_to: reassignTo } : undefined,
    });
  },

  exportData: async (): Promise<object> => {
    const response = await apiClient.get('/data/export');
    return response.data;
  },

  importData: async (payload: object): Promise<object> => {
    const response = await apiClient.post('/data/import', payload);
    return response.data;
  },
};
