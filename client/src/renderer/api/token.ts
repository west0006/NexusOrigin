// ── client/src/renderer/api/token.ts (对接本地 Token 服务)
import { apiClient } from './client';

export interface TokenUsage {
    id: string;
    userId: string;
    modelName: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    skillId?: string;
    createdAt: string;
}

export interface BudgetInfo {
    budget: number;
    used: number;
    remaining: number;
    usageRate: number;
}

const TOKEN_BASE = 'http://localhost:8081/api/v1/token';

export const tokenAPI = {
    record: (data: { userId: string; modelName: string; inputTokens: number; outputTokens: number; skillId?: string }) =>
        fetch(`${TOKEN_BASE}/record`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
            .then(r => r.json()),
    getUsage: (userId: string) =>
        fetch(`${TOKEN_BASE}/usage/${userId}`).then(r => r.json()),
    getUsageByPeriod: (userId: string, period: 'day' | 'week' | 'month') =>
        fetch(`${TOKEN_BASE}/usage/${userId}/period?period=${period}`).then(r => r.json()),
    setBudget: (userId: string, monthlyBudget: number) =>
        fetch(`${TOKEN_BASE}/budget`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, monthlyBudget }) })
            .then(r => r.json()),
    getBudget: (userId: string) =>
        fetch(`${TOKEN_BASE}/budget/${userId}`).then(r => r.json()),
};