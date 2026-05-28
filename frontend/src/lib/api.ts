import axios from 'axios';

// Base URL configuration (can be updated to use env vars later)
export const API_URL = 'http://localhost:8001/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup interceptor for JWT if authentication is needed on the frontend
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Initialize token from localStorage if available
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

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

// ─── API Functions ──────────────────────────────────────────────────────────

export const api = {
  // Budget & Dashboard
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

  // Transactions
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

  // Auto-Pays
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

  // Categories
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/categories');
    return response.data;
  },

  addCategory: async (name: string): Promise<string> => {
    // Backend creates and returns { name: string }
    const response = await apiClient.post<{ name: string }>('/categories', { name });
    return response.data.name;
  },

  deleteCategory: async (name: string, reassignTo?: string): Promise<void> => {
    await apiClient.delete(`/categories/${name}`, {
      params: reassignTo ? { reassign_to: reassignTo } : undefined,
    });
  },
};
