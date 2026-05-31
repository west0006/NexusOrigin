// client/src/renderer/hooks/useTokenMonitor.ts
import { useEffect } from 'react';
import { useTokenStore } from '../store/token';

export function useTokenMonitor(days: number = 7) {
    const { usage, budget, loading, fetchUsage, fetchBudget } = useTokenStore();

    useEffect(() => {
        fetchUsage(days);
        fetchBudget();
        // 可选轮询
        const interval = setInterval(() => {
            fetchUsage(days);
        }, 30000);
        return () => clearInterval(interval);
    }, [days, fetchUsage, fetchBudget]);

    const totalCost = usage?.totalCost ?? 0;
    const totalTokens = usage?.totalTokens ?? 0;
    const budgetUsage = budget ? (budget.used / budget.budget) * 100 : 0;

    return {
        usage,
        totalCost,
        totalTokens,
        budget,
        budgetUsage,
        loading,
        refresh: () => fetchUsage(days),
    };
}