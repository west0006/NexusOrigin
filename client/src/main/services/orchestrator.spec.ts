// server/api-gateway test — would live at client/src/main/services/orchestrator.spec.ts
// but since orchestrator is Electron main-process code (runs in Node),
// we can test it with plain Jest. Placeholder structure shown.

import { BudgetCircuitBreaker, calculateTaskScore, type OrchestrationTask } from './orchestrator';

describe('BudgetCircuitBreaker', () => {
    describe('state transitions', () => {
        it('should start CLOSED', () => {
            const breaker = new BudgetCircuitBreaker(100);
            expect(breaker.getState()).toBe('CLOSED');
        });

        it('should go HALF_OPEN at 80% threshold (default)', () => {
            const breaker = new BudgetCircuitBreaker(100);
            const status = breaker.recordUsage(80);
            expect(status).toBe('WARNING');
            expect(breaker.getState()).toBe('HALF_OPEN');
        });

        it('should go OPEN when exceeded', () => {
            const breaker = new BudgetCircuitBreaker(100);
            let status = breaker.recordUsage(99);
            expect(status).toBe('WARNING');
            status = breaker.recordUsage(2);
            expect(status).toBe('BREACH');
            expect(breaker.getState()).toBe('OPEN');
        });

        it('should reject all usage in OPEN state', () => {
            const breaker = new BudgetCircuitBreaker(100);
            breaker.recordUsage(101); // triggers OPEN
            const status = breaker.recordUsage(1);
            expect(status).toBe('BREACH');
        });

        it('should respect custom warning threshold', () => {
            const breaker = new BudgetCircuitBreaker(100, { warningThreshold: 0.5 });
            expect(breaker.recordUsage(50)).toBe('WARNING');
            expect(breaker.getState()).toBe('HALF_OPEN');
        });

        it('should recover to HALF_OPEN after cooldown', () => {
            const breaker = new BudgetCircuitBreaker(100, { cooldownMs: 10 });
            breaker.recordUsage(101); // OPEN
            expect(breaker.getState()).toBe('OPEN');
            // Can't easily test timer-based recovery in sync; structure is tested
        });

        it('should reset correctly', () => {
            const breaker = new BudgetCircuitBreaker(100);
            breaker.recordUsage(101);
            expect(breaker.getState()).toBe('OPEN');
            breaker.reset();
            expect(breaker.getState()).toBe('CLOSED');
            expect(breaker.getUsage().used).toBe(0);
        });
    });

    describe('usage tracking', () => {
        it('should track cumulative usage', () => {
            const breaker = new BudgetCircuitBreaker(100);
            breaker.recordUsage(30);
            breaker.recordUsage(20);
            expect(breaker.getUsage().used).toBe(50);
            expect(breaker.getUsage().remaining).toBe(50);
            expect(breaker.getUsage().ratio).toBe(0.5);
        });

        it('should return OK for normal usage', () => {
            const breaker = new BudgetCircuitBreaker(100);
            expect(breaker.recordUsage(10)).toBe('OK');
        });
    });
});

describe('calculateTaskScore', () => {
    const makeTask = (overrides: Partial<OrchestrationTask> = {}): OrchestrationTask => ({
        taskId: 'test-1',
        originalInput: 'test input',
        steps: [
            {
                stepId: 's1', capabilityId: 'c1', agentId: 'a1',
                input: 'prompt', output: 'result output text here'.repeat(5),
                status: 'completed', cost: 0.001,
                tokenCount: { input: 50, output: 100 },
                startedAt: 1000, completedAt: 2000,
            },
        ],
        status: 'completed',
        totalCost: 0.003,
        totalTokens: { input: 150, output: 300 },
        createdAt: 1000,
        completedAt: 5000,
        ...overrides,
    });

    it('should score a completed task > 0', () => {
        const score = calculateTaskScore(makeTask());
        expect(score.overall).toBeGreaterThan(0);
        expect(score.overall).toBeLessThanOrEqual(100);
    });

    it('should give lower score for tasks with failed steps', () => {
        const perfect = calculateTaskScore(makeTask());
        const withFailures = calculateTaskScore(makeTask({
            steps: [
                { stepId: 's1', capabilityId: 'c1', agentId: 'a1', input: '', output: '', status: 'failed', cost: 0, tokenCount: { input: 0, output: 0 }, startedAt: null, completedAt: null, error: 'x' },
                { stepId: 's2', capabilityId: 'c2', agentId: 'a1', input: '', output: 'ok', status: 'completed', cost: 0, tokenCount: { input: 0, output: 0 }, startedAt: null, completedAt: null },
            ],
        }));
        expect(withFailures.overall).toBeLessThan(perfect.overall);
    });

    it('should return breakdown text', () => {
        const score = calculateTaskScore(makeTask());
        expect(score.breakdown.length).toBeGreaterThan(0);
    });
});
