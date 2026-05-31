// client/src/renderer/components/Agent/BudgetCircuitBreaker.ts
// 预算熔断器状态机（CLOSED / OPEN / HALF_OPEN）
// 极简，无 UI 依赖，可独立测试

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface BreakerConfig {
    /** 预算上限（美元） */
    budgetLimit: number;
    /** 触发熔断的阈值比例（默认 1.0 = 100%） */
    tripRatio: number;
    /** 熔断后自动恢复为 HALF_OPEN 的冷却时间（ms） */
    recoveryTimeoutMs: number;
    /** HALF_OPEN 下允许的最大测试任务数 */
    halfOpenMaxTests: number;
}

export interface BreakerStatus {
    state: BreakerState;
    totalCost: number;
    usageRatio: number;
    remainingBudget: number;
    lastTrippedAt: number | null;
    halfOpenTestsRemaining: number;
    nextAutoRecoveryAt: number | null;
}

const DEFAULTS: BreakerConfig = {
    budgetLimit: 0.05,
    tripRatio: 1.0,
    recoveryTimeoutMs: 60_000, // 1 分钟冷却
    halfOpenMaxTests: 1,
};

export class BudgetCircuitBreaker {
    private config: BreakerConfig;
    private state: BreakerState = 'CLOSED';
    private totalCost = 0;
    private lastTrippedAt: number | null = null;
    private halfOpenTestsUsed = 0;

    constructor(config?: Partial<BreakerConfig>) {
        this.config = { ...DEFAULTS, ...config };
    }

    getStatus(): BreakerStatus {
        const dt = Date.now();
        let effectiveState: BreakerState = this.state;

        // 自动恢复检查
        if (this.state === 'OPEN' && this.lastTrippedAt !== null) {
            if (dt - this.lastTrippedAt >= this.config.recoveryTimeoutMs) {
                effectiveState = 'HALF_OPEN';
            }
        }

        return {
            state: effectiveState,
            totalCost: this.totalCost,
            usageRatio: this.totalCost / this.config.budgetLimit,
            remainingBudget: Math.max(0, this.config.budgetLimit - this.totalCost),
            lastTrippedAt: this.lastTrippedAt,
            halfOpenTestsRemaining: Math.max(0, this.config.halfOpenMaxTests - this.halfOpenTestsUsed),
            nextAutoRecoveryAt: this.state === 'OPEN' && this.lastTrippedAt !== null
                ? this.lastTrippedAt + this.config.recoveryTimeoutMs
                : null,
        };
    }

    /**
     * 记录一次成本消耗，返回是否允许继续执行
     * - CLOSED: 累计成本，若超阈值则熔断
     * - OPEN: 拒绝执行（除非冷却期到自动恢复）
     * - HALF_OPEN: 允许少量测试任务
     */
    recordUsage(cost: number): { allowed: boolean; tripped: boolean; status: BreakerStatus } {
        const dt = Date.now();
        let tripped = false;

        // OPEN 状态下的自动恢复检查
        if (this.state === 'OPEN' && this.lastTrippedAt !== null) {
            if (dt - this.lastTrippedAt >= this.config.recoveryTimeoutMs) {
                this.state = 'HALF_OPEN';
                this.halfOpenTestsUsed = 0;
            }
        }

        if (this.state === 'OPEN') {
            return { allowed: false, tripped: false, ...this.getStatusProxy() };
        }

        if (this.state === 'HALF_OPEN') {
            if (this.halfOpenTestsUsed >= this.config.halfOpenMaxTests) {
                return { allowed: false, tripped: false, ...this.getStatusProxy() };
            }
            this.halfOpenTestsUsed++;
        }

        // 记录成本
        this.totalCost += cost;

        // 检查阈值
        if (this.totalCost >= this.config.budgetLimit * this.config.tripRatio) {
            this.state = 'OPEN';
            this.lastTrippedAt = dt;
            tripped = true;
        }

        return { allowed: true, tripped, ...this.getStatusProxy() };
    }

    /** 手动重置熔断器 */
    reset() {
        this.state = 'CLOSED';
        this.totalCost = 0;
        this.lastTrippedAt = null;
        this.halfOpenTestsUsed = 0;
    }

    /** 更新预算上限 */
    setBudgetLimit(limit: number) {
        this.config.budgetLimit = limit;
        // 如果已经超过新预算，触发熔断
        if (this.totalCost >= limit && this.state === 'CLOSED') {
            this.state = 'OPEN';
            this.lastTrippedAt = Date.now();
        }
    }

    private getStatusProxy(): { status: BreakerStatus } {
        return { status: this.getStatus() };
    }
}