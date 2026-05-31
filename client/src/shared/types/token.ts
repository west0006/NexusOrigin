// client/src/shared/types/token.ts
export interface TokenData {
    id: string;
    timestamp: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    skillId?: string;
}

export interface TokenUsage {
    id: string;
    userId: string;
    model: string;
    provider: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    createdAt: string;
}

export interface DailyUsage {
    date: string;
    tokens: number;
    cost: number;
    count: number;
}

export interface TokenUsageResponse {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    daily: DailyUsage[];
    details: TokenUsage[];
}

export interface BudgetConfig {
    monthlyBudget: number;
    alertThreshold: number;
}

export interface BudgetInfo {
    budget: number;
    used: number;
    remaining: number;
    usageRate: number;
}