import { apiClient } from './client.api';
import type {TokenUsageResponse, BudgetInfo, BudgetConfig} from '@shared/types';

export const tokenAPI = {
    getUsage: (days = 7) =>
        apiClient<TokenUsageResponse>(`/user/token-usage?days=${days}`),

    getBudget: () =>
        apiClient<BudgetInfo>('/billing/balance'),

    setBudget: (monthlyBudget: number, alertThreshold?: number, actionOnExceed?: string) =>
        apiClient<BudgetConfig>('/billing/budget', { method: 'POST', body: JSON.stringify({ monthlyBudget, alertThreshold, actionOnExceed }) }),
};