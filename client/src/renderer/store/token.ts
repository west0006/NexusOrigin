// client/src/renderer/store/token.store.ts
import { create } from 'zustand';
import { tokenAPI } from '../api/token.api';
import { billingAPI } from '../api/billing.api';
import type { TokenUsageResponse, BudgetInfo } from '@shared/types';

interface TokenState {
    usage: TokenUsageResponse | null;
    budget: BudgetInfo | null;
    loading: boolean;
    fetchUsage: (days?: number) => Promise<void>;
    fetchBudget: () => Promise<void>;
    setBudget: (monthlyBudget: number, alertThreshold?: number) => Promise<void>;
}

export const useTokenStore = create<TokenState>((set) => ({
    usage: null,
    budget: null,
    loading: false,

    fetchUsage: async (days = 7) => {
        set({ loading: true });
        try {
            const data = await tokenAPI.getUsage(days);
            set({ usage: data });
        } catch (e) {
            console.error('获取用量失败', e);
        } finally {
            set({ loading: false });
        }
    },

    fetchBudget: async () => {
        try {
            const balance = await billingAPI.getBalance();
            // 暂时模拟预算结构，后端可后续提供专门预算接口
            set({ budget: { budget: 100, used: balance.totalSpent, remaining: balance.credits, usageRate: (balance.totalSpent / 100) * 100 } });
        } catch (e) {
            console.error('获取预算失败', e);
        }
    },

    setBudget: async (monthlyBudget, alertThreshold = 80) => {
        await billingAPI.setBudget(monthlyBudget, alertThreshold);
        await set({ budget: { budget: monthlyBudget, used: 0, remaining: monthlyBudget, usageRate: 0 } });
    },
}));