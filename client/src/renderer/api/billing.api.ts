import { apiClient } from './client.api';
import type { BudgetInfo, BudgetConfig } from '@shared/types';

export const billingAPI = {
    getBalance: () => apiClient<{ credits: number; totalRecharged: number; totalSpent: number }>('/billing/balance'),

    getTransactions: (page = 1, pageSize = 20) =>
        apiClient<{ items: any[]; total: number }>(`/billing/transactions?page=${page}&pageSize=${pageSize}`),

    setBudget: (monthlyBudget: number, alertThreshold = 80) =>
        apiClient<BudgetConfig>('/billing/budget', { method: 'POST', body: JSON.stringify({ monthlyBudget, alertThreshold }) }),

    getBudget: () => apiClient<BudgetConfig>('/billing/budget'),
};