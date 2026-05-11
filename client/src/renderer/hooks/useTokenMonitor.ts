// ─── client/src/renderer/hooks/useTokenMonitor.ts ─────────
import { useEffect } from 'react';
import { useTokenStore } from '../store/token';

export function useTokenMonitor(period: 'day' | 'week' | 'month' = 'day') {
    const { usages, fetchUsage, subscribe, budget, setBudget } = useTokenStore();

    useEffect(() => {
        fetchUsage(period);
        const cleanup = subscribe();
        return cleanup;
    }, [period, fetchUsage, subscribe]);

    const totalTokens = usages.reduce((sum, u) => sum + u.inputTokens + u.outputTokens, 0);
    const totalCost = usages.reduce((sum, u) => sum + u.costUsd, 0);
    const budgetUsage = budget ? (totalCost / budget.monthlyBudget) * 100 : 0;

    return {
        usages,
        totalTokens,
        totalCost,
        budget,
        budgetUsage,
        setBudget,
        fetchUsage,
    };
}