// ─── client/src/renderer/store/token.ts ───────────────────
import { create } from 'zustand';
import type { TokenData, BudgetConfig } from '../../shared/types';

interface TokenState {
    usages: TokenData[];
    budget: BudgetConfig | null;
    fetchUsage: (period: 'day' | 'week' | 'month') => Promise<void>;
    subscribe: () => () => void;
    setBudget: (config: BudgetConfig) => Promise<void>;
}

export const useTokenStore = create<TokenState>((set) => ({
    usages: [],
    budget: null,

    fetchUsage: async (period) => {
        if (window.electronAPI) {
            const data = await window.electronAPI.token.getUsage(period);
            set({ usages: Array.isArray(data) ? data : [] });
        }
    },

    subscribe: () => {
        if (!window.electronAPI) return () => {};
        const unsubscribe = window.electronAPI.token.onUpdate((data: TokenData) => {
            set((state) => ({ usages: [...state.usages.slice(-99), data] }));
        });
        return unsubscribe;
    },

    setBudget: async (config) => {
        if (window.electronAPI) {
            await window.electronAPI.token.setBudget(config);
            set({ budget: config });
        }
    },
}));