// client/src/shared/types/billing.ts
export interface UserBalance {
    credits: number;
    totalRecharged: number;
    totalSpent: number;
}

export interface Transaction {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
}