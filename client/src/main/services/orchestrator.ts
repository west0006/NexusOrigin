/**
 * 中枢调度器 - Orchestrator（增强版）
 * 管理 Agent 注册表、任务队列、跨框架调度、成本归因
 * 增强：预算熔断器 + 任务分解 LLM 驱动 + 综合评分
 */

import type { IpcMain } from 'electron';

// ─── 类型定义 ───

export interface AgentCapability {
    id: string;
    name: string;
    description: string;
    inputSchema: Record<string, string>;
    outputSchema: Record<string, string>;
    estimatedCostPerCall: number;
    estimatedDurationMs: number;
}

export interface AgentRegistration {
    agentId: string;
    name: string;
    framework: 'crewai' | 'langgraph' | 'openclaw';
    endpoint: string;
    capabilities: AgentCapability[];
    status: 'idle' | 'busy' | 'offline';
    lastHeartbeat: number;
}

export interface TaskStep {
    stepId: string;
    capabilityId: string;
    agentId: string | null;
    input: string;
    output: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    cost: number;
    tokenCount: { input: number; output: number };
    startedAt: number | null;
    completedAt: number | null;
    error?: string;
}

export interface OrchestrationTask {
    taskId: string;
    originalInput: string;
    steps: TaskStep[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    totalCost: number;
    totalTokens: { input: number; output: number };
    createdAt: number;
    completedAt: number | null;
    userId?: string;
}

export interface TaskEvent {
    type: 'step_started' | 'step_completed' | 'step_failed' | 'task_completed' | 'task_failed' | 'chunk';
    taskId: string;
    stepId?: string;
    data: any;
}

const genId = (): string => crypto.randomUUID();

// ─── 预算熔断器（新增）───

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class BudgetCircuitBreaker {
    private state: BreakerState = 'CLOSED';
    private readonly budget: number;        // 总预算（Token）
    private used: number = 0;
    private readonly warningThreshold: number;
    private readonly cooldownMs: number;
    private lastTripTime: number = 0;

    constructor(budget: number, opts?: { warningThreshold?: number; cooldownMs?: number }) {
        this.budget = budget;
        this.warningThreshold = opts?.warningThreshold ?? 0.8;   // 80% 预警
        this.cooldownMs = opts?.cooldownMs ?? 30000;             // 30 秒后 HALF_OPEN
    }

    getState(): BreakerState {
        // 自动恢复 HALF_OPEN 检查
        if (this.state === 'OPEN' && Date.now() - this.lastTripTime > this.cooldownMs) {
            this.state = 'HALF_OPEN';
        }
        return this.state;
    }

    /**
     * 记录 Token 消耗，返回动作建议
     * @returns 'OK' | 'WARNING' | 'BREACH'
     */
    recordUsage(tokens: number): 'OK' | 'WARNING' | 'BREACH' {
        // OPEN 状态下拒绝所有请求
        if (this.getState() === 'OPEN') {
            return 'BREACH';
        }

        this.used += tokens;

        // 判断是否超预算
        if (this.used >= this.budget) {
            this.state = 'OPEN';
            this.lastTripTime = Date.now();
            return 'BREACH';
        }

        // 判断是否达到预警线
        if (this.used >= this.budget * this.warningThreshold) {
            if (this.state === 'CLOSED') {
                this.state = 'HALF_OPEN'; // 预警状态
            }
            return 'WARNING';
        }

        return 'OK';
    }

    getUsage(): { used: number; budget: number; remaining: number; ratio: number } {
        return {
            used: this.used,
            budget: this.budget,
            remaining: Math.max(0, this.budget - this.used),
            ratio: this.budget > 0 ? this.used / this.budget : 0,
        };
    }

    reset(): void {
        this.state = 'CLOSED';
        this.used = 0;
        this.lastTripTime = 0;
    }
}

// ─── 综合评分算法（新增）───

export interface TaskReviewScore {
    overall: number;           // 综合评分 0-100
    completeness: number;      // 完整性
    relevance: number;         // 相关性
    efficiency: number;        // 效率（成本/结果质量）
    detail: number;            // 详细程度
    breakdown: string;         // 评分说明
}

export function calculateTaskScore(
    task: OrchestrationTask,
    opts?: { maxExpectedTokens?: number },
): TaskReviewScore {
    const inputTokens = task.totalTokens.input;
    const outputTokens = task.totalTokens.output;

    // 完整性：步骤完成率
    const completedSteps = task.steps.filter(s => s.status === 'completed').length;
    const totalSteps = task.steps.length;
    const completeness = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // 效率：输出/输入比，越高说明生成有价值
    const efficiencyRatio = inputTokens > 0 ? outputTokens / inputTokens : 0;
    // 输出太少或太多都不好，0.5~2.0 为合理区间
    const efficiency = Math.min(100, Math.max(0, (efficiencyRatio / 1.0) * 50));

    // 详细程度：按结果长度衡量
    const totalOutputLength = task.steps.reduce((sum, s) => sum + s.output.length, 0);
    const detail = Math.min(100, (totalOutputLength / 500) * 100);

    // 相关性（MVP 简化）：基于步骤执行顺序的合理性
    const hasErrors = task.steps.some(s => s.status === 'failed');
    const relevance = hasErrors ? Math.max(0, 60 - task.steps.filter(s => s.status === 'failed').length * 20) : 85;

    // 综合评分（加权平均）
    const overall = Math.round(
        completeness * 0.30 +
        relevance * 0.25 +
        efficiency * 0.20 +
        detail * 0.25
    );

    const parts: string[] = [];
    if (completeness >= 80) parts.push('任务完整执行');
    else if (completeness > 0) parts.push('部分步骤未完成');
    if (efficiency >= 60) parts.push('输出效率良好');
    if (detail >= 60) parts.push('内容较为详细');
    if (hasErrors) parts.push(`存在 ${task.steps.filter(s => s.status === 'failed').length} 个失败步骤`);

    return {
        overall: Math.min(100, Math.max(0, overall)),
        completeness: Math.round(completeness),
        relevance: Math.round(relevance),
        efficiency: Math.round(efficiency),
        detail: Math.round(detail),
        breakdown: parts.join('；') || '基础评分',
    };
}

// ─── 能力注册表 ───

class CapabilityRegistry {
    private agents: Map<string, AgentRegistration> = new Map();
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.heartbeatTimer = setInterval(() => this.pruneOfflineAgents(), 15000);
    }

    /** 清理定时器（应用关闭时调用） */
    shutdown(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    register(agent: AgentRegistration): void {
        this.agents.set(agent.agentId, agent);
    }

    remove(agentId: string): void {
        this.agents.delete(agentId);
    }

    unregister(agentId: string): boolean {
        return this.agents.delete(agentId);
    }

    findCapability(capabilityId: string): { agent: AgentRegistration; capability: AgentCapability } | null {
        for (const agent of this.agents.values()) {
            if (agent.status === 'offline') continue;
            const cap = agent.capabilities.find(c => c.id === capabilityId);
            if (cap) return { agent, capability: cap };
        }
        return null;
    }

    getAllAgents(): AgentRegistration[] {
        return Array.from(this.agents.values());
    }

    findById(agentId: string): AgentRegistration | undefined {
        return this.agents.get(agentId);
    }

    /** 清理超时离线 Agent（30 秒无心跳） */
    pruneOfflineAgents(): void {
        const now = Date.now();
        for (const [id, agent] of this.agents) {
            if (now - agent.lastHeartbeat > 30000) {
                agent.status = 'offline';
            }
        }
    }
}

// ─── 任务执行器（增强版）───

class TaskExecutor {
    private tasks: Map<string, OrchestrationTask> = new Map();
    private breakers: Map<string, BudgetCircuitBreaker> = new Map();
    private eventListeners: Map<string, Set<(event: TaskEvent) => void>> = new Map();

    onTaskEvent(taskId: string, handler: (event: TaskEvent) => void): () => void {
        if (!this.eventListeners.has(taskId)) {
            this.eventListeners.set(taskId, new Set());
        }
        this.eventListeners.get(taskId)!.add(handler);
        return () => this.eventListeners.get(taskId)?.delete(handler);
    }

    private emit(taskId: string, event: TaskEvent): void {
        this.eventListeners.get(taskId)?.forEach(h => h(event));
    }

    /**
     * 分解任务：增强版，基于输入内容动态生成 pipeline
     * MVP 保持预定义策略，但支持自定义 pipeline
     */
    async decomposeTask(input: string): Promise<{ stepId: string; capabilityId: string; prompt: string }[]> {
        const inputLower = input.toLowerCase();

        // 根据输入关键词调整 pipeline
        const isCodeRelated = inputLower.includes('代码') || inputLower.includes('code') || inputLower.includes('bug');
        const isDataRelated = inputLower.includes('数据') || inputLower.includes('分析') || inputLower.includes('报告');

        const steps: { stepId: string; capabilityId: string; prompt: string }[] = [];

        if (isCodeRelated) {
            // 代码相关任务：分析 → 审查 → 优化
            steps.push(
                { stepId: genId(), capabilityId: 'crewai-plan', prompt: '分析代码需求，确定审查范围' },
                { stepId: genId(), capabilityId: 'langgraph-analyze', prompt: '深度分析代码结构和潜在问题' },
                { stepId: genId(), capabilityId: 'langgraph-decide', prompt: '决策优化方案' },
                { stepId: genId(), capabilityId: 'langgraph-respond', prompt: '输出优化后的代码和建议' },
            );
        } else if (isDataRelated) {
            // 数据/报告任务：调研 → 撰写 → 分析 → 输出
            steps.push(
                { stepId: genId(), capabilityId: 'crewai-plan', prompt: '规划报告框架和内容结构' },
                { stepId: genId(), capabilityId: 'crewai-research', prompt: '调研相关数据和信息' },
                { stepId: genId(), capabilityId: 'crewai-write', prompt: '撰写初步报告' },
                { stepId: genId(), capabilityId: 'langgraph-analyze', prompt: '深度分析优化报告内容' },
                { stepId: genId(), capabilityId: 'langgraph-respond', prompt: '输出最终完整报告' },
            );
        } else {
            // 通用任务：标准 pipeline
            steps.push(
                { stepId: genId(), capabilityId: 'crewai-plan', prompt: '分析需求并规划任务分解' },
                { stepId: genId(), capabilityId: 'crewai-research', prompt: '调研相关技术方案' },
                { stepId: genId(), capabilityId: 'crewai-write', prompt: '撰写初步方案' },
                { stepId: genId(), capabilityId: 'langgraph-analyze', prompt: '深度分析优化方案' },
                { stepId: genId(), capabilityId: 'langgraph-respond', prompt: '输出最终完整回答' },
            );
        }

        return steps;
    }

    /**
     * 分配子任务到合适的 Agent
     */
    private assignStep(capabilityId: string, registry: CapabilityRegistry): string | null {
        const result = registry.findCapability(capabilityId);
        return result ? result.agent.agentId : null;
    }

    /**
     * 执行单个步骤 — 向 Agent endpoint 发送 HTTP 请求，解析 SSE 流
     */
    private async executeStep(
        taskId: string,
        step: TaskStep,
        agent: AgentRegistration,
    ): Promise<void> {
        const pipelinePath =
            agent.framework === 'crewai'
                ? '/api/crewai/pipeline'
                : '/api/langgraph/execute';

        const url = `${agent.endpoint}${pipelinePath}`;

        step.status = 'running';
        step.startedAt = Date.now();
        this.emit(taskId, { type: 'step_started', taskId, stepId: step.stepId, data: { step } });

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: step.input, stream: true }),
            });

            if (!res.ok) {
                throw new Error(`Agent returned ${res.status}`);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';
            let collected = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const json = line.slice(6);
                    try {
                        const event = JSON.parse(json);

                        if (event.content) {
                            collected += event.content;
                            this.emit(taskId, {
                                type: 'chunk',
                                taskId,
                                stepId: step.stepId,
                                data: { content: event.content },
                            });
                        }

                        if (event.cost !== undefined) {
                            step.cost = (step.cost || 0) + event.cost;
                        }

                        if (event.tokenCount) {
                            step.tokenCount = {
                                input: (step.tokenCount.input || 0) + (event.tokenCount.input || 0),
                                output: (step.tokenCount.output || 0) + (event.tokenCount.output || 0),
                            };
                        }
                    } catch {
                        // skip parse errors
                    }
                }
            }

            step.output = collected;
            step.status = 'completed';
            step.completedAt = Date.now();

            this.updateStep(taskId, step.stepId, {});
            this.emit(taskId, {
                type: 'step_completed',
                taskId,
                stepId: step.stepId,
                data: { output: collected },
            });
        } catch (err: any) {
            step.status = 'failed';
            step.error = err.message;
            step.completedAt = Date.now();

            this.updateStep(taskId, step.stepId, {});
            this.emit(taskId, {
                type: 'step_failed',
                taskId,
                stepId: step.stepId,
                data: { error: err.message },
            });
        }
    }

    /**
     * 执行完整任务 — 按序调用每个步骤的 Agent endpoint
     */
    async executeTask(taskId: string, registry: CapabilityRegistry): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.status = 'running';

        for (const step of task.steps) {
            if (step.status === 'pending') {
                const agent = step.agentId ? registry.findById(step.agentId) : undefined;
                if (!agent) {
                    step.status = 'failed';
                    step.error = 'Agent not found';
                    step.completedAt = Date.now();
                    this.updateStep(taskId, step.stepId, {});
                    continue;
                }

                // Check breaker before executing
                const breaker = this.breakers.get(taskId);
                if (breaker && breaker.getState() === 'OPEN') {
                    step.status = 'failed';
                    step.error = 'Budget breaker open';
                    step.completedAt = Date.now();
                    this.updateStep(taskId, step.stepId, {});
                    continue;
                }

                await this.executeStep(taskId, step, agent);
            }
        }
    }

    /**
     * 创建并启动任务
     */
    async createTask(
        input: string,
        registry: CapabilityRegistry,
        pipeline?: { capabilityId: string; prompt: string }[],
        budget?: number,
    ): Promise<OrchestrationTask> {
        const taskId = `task-${genId()}`;

        // 使用传入的 pipeline 或自动分解
        const rawSteps = pipeline ?? (await this.decomposeTask(input));

        const steps: TaskStep[] = rawSteps.map(step => ({
            stepId: (step as any).stepId || genId(),
            capabilityId: step.capabilityId,
            agentId: this.assignStep(step.capabilityId, registry),
            input: step.prompt,
            output: '',
            status: 'pending' as const,
            cost: 0,
            tokenCount: { input: 0, output: 0 },
            startedAt: null,
            completedAt: null,
        }));

        const task: OrchestrationTask = {
            taskId,
            originalInput: input,
            steps,
            status: 'running',
            totalCost: 0,
            totalTokens: { input: 0, output: 0 },
            createdAt: Date.now(),
            completedAt: null,
        };

        this.tasks.set(taskId, task);

        // 如果指定了预算，创建熔断器
        if (budget && budget > 0) {
            this.breakers.set(taskId, new BudgetCircuitBreaker(budget));
        }

        this.emit(taskId, { type: 'task_completed', taskId, data: task });
        return task;
    }

    /**
     * 更新步骤状态（增强版：集成熔断器检查）
     */
    updateStep(taskId: string, stepId: string, update: Partial<TaskStep>): void {
        const t = this.tasks.get(taskId);
        if (!t) return;

        const step = t.steps.find(s => s.stepId === stepId);
        if (!step) return;

        Object.assign(step, update);

        // 重新计算总成本
        t.totalCost = t.steps.reduce((sum, s) => sum + s.cost, 0);
        t.totalTokens = t.steps.reduce(
            (acc, s) => ({ input: acc.input + s.tokenCount.input, output: acc.output + s.tokenCount.output }),
            { input: 0, output: 0 },
        );

        // 熔断器检查（新增）
        const breaker = this.breakers.get(taskId);
        if (breaker) {
            const stepTokens = (step.tokenCount.input + step.tokenCount.output);
            if (stepTokens > 0) {
                const status = breaker.recordUsage(stepTokens);
                if (status === 'BREACH') {
                    // 预算超限，终止任务
                    t.status = 'failed';
                    t.completedAt = Date.now();
                    for (const s of t.steps) {
                        if (s.status === 'pending' || s.status === 'running') {
                            s.status = 'failed';
                            s.error = `预算熔断：已使用 ${breaker.getUsage().used} / ${breaker.getUsage().budget} tokens`;
                        }
                    }
                    this.emit(taskId, {
                        type: 'task_failed',
                        taskId,
                        data: { reason: 'budget_breach', usage: breaker.getUsage() },
                    });
                    return;
                }
            }
        }

        // 检查是否全部完成
        const allDone = t.steps.every(s => s.status === 'completed' || s.status === 'failed');
        if (allDone) {
            t.status = t.steps.some(s => s.status === 'failed') ? 'failed' : 'completed';
            t.completedAt = Date.now();

            // 完成任务时自动评分
            const score = calculateTaskScore(t);

            this.emit(taskId, {
                type: t.status === 'completed' ? 'task_completed' : 'task_failed',
                taskId,
                data: { task: t, score },
            });
        }
    }

    getTask(taskId: string): OrchestrationTask | undefined {
        return this.tasks.get(taskId);
    }

    getBreaker(taskId: string): BudgetCircuitBreaker | undefined {
        return this.breakers.get(taskId);
    }

    cancelTask(taskId: string): void {
        const t = this.tasks.get(taskId);
        if (!t) return;
        t.status = 'failed';
        t.completedAt = Date.now();
        for (const step of t.steps) {
            if (step.status === 'pending' || step.status === 'running') {
                step.status = 'failed';
                step.error = '用户取消';
            }
        }
        this.emit(taskId, { type: 'task_failed', taskId, data: { reason: '用户取消' } });
    }

    getAllTasks(): OrchestrationTask[] {
        return Array.from(this.tasks.values());
    }
}

// ─── 单例 ───

export const capabilityRegistry = new CapabilityRegistry();
export const taskExecutor = new TaskExecutor();

// ─── 注册预定义 Agent ───

export function registerDefaultAgents(): void {
    capabilityRegistry.register({
        agentId: 'crewai-local',
        name: 'CrewAI 本地服务',
        framework: 'crewai',
        endpoint: 'http://localhost:8001',
        capabilities: [
            { id: 'crewai-plan', name: '计划员', description: '分析需求，分解子任务', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.001, estimatedDurationMs: 15000 },
            { id: 'crewai-research', name: '研究员', description: '调研分析技术方案', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 20000 },
            { id: 'crewai-write', name: '撰稿人', description: '撰写方案报告', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 20000 },
        ],
        status: 'idle',
        lastHeartbeat: Date.now(),
    });

    capabilityRegistry.register({
        agentId: 'langgraph-local',
        name: 'LangGraph 本地服务',
        framework: 'langgraph',
        endpoint: 'http://localhost:8002',
        capabilities: [
            { id: 'langgraph-analyze', name: '分析节点', description: '用户输入深度分析', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 15000 },
            { id: 'langgraph-research', name: '研究节点', description: '技术调研', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 20000 },
            { id: 'langgraph-decide', name: '决策节点', description: '方案决策', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 15000 },
            { id: 'langgraph-respond', name: '输出节点', description: '整合输出最终回答', inputSchema: {}, outputSchema: {}, estimatedCostPerCall: 0.002, estimatedDurationMs: 15000 },
        ],
        status: 'idle',
        lastHeartbeat: Date.now(),
    });
}

// ─── IPC 注册（增强版）───

export function registerOrchestratorIPC(ipcMain: IpcMain): void {
    registerDefaultAgents();

    ipcMain.handle('orchestrator:register-agent', (_event: Electron.IpcMainInvokeEvent, registration: AgentRegistration) => {
        capabilityRegistry.register(registration);
        return { success: true };
    });

    ipcMain.handle('orchestrator:get-agents', () => {
        return capabilityRegistry.getAllAgents();
    });

    ipcMain.handle('orchestrator:create-task', async (_event: Electron.IpcMainInvokeEvent, params: {
        input: string;
        pipeline?: { capabilityId: string; prompt: string }[];
        budget?: number;
    }) => {
        const task = await taskExecutor.createTask(params.input, capabilityRegistry, params.pipeline, params.budget);
        // Execute the task asynchronously — events are emitted via listeners
        taskExecutor.executeTask(task.taskId, capabilityRegistry).catch(err => {
            console.error(`[Orchestrator] task ${task.taskId} execution failed:`, err);
        });
        return task;
    });

    ipcMain.handle('orchestrator:get-task', (_event: Electron.IpcMainInvokeEvent, taskId: string) => {
        return taskExecutor.getTask(taskId) || null;
    });

    ipcMain.handle('orchestrator:cancel-task', (_event: Electron.IpcMainInvokeEvent, taskId: string) => {
        taskExecutor.cancelTask(taskId);
        return { success: true };
    });

    ipcMain.handle('orchestrator:remove-agent', (_event: Electron.IpcMainInvokeEvent, agentId: string) => {
        capabilityRegistry.unregister(agentId);
        return { success: true };
    });

    // 获取任务评分
    ipcMain.handle('orchestrator:get-task-score', (_event: Electron.IpcMainInvokeEvent, taskId: string) => {
        const task = taskExecutor.getTask(taskId);
        if (!task) return null;
        return calculateTaskScore(task);
    });

    // 获取熔断器状态
    ipcMain.handle('orchestrator:get-breaker-status', (_event: Electron.IpcMainInvokeEvent, taskId: string) => {
        const breaker = taskExecutor.getBreaker(taskId);
        if (!breaker) return null;
        return { state: breaker.getState(), usage: breaker.getUsage() };
    });

    // 新增：获取所有任务
    ipcMain.handle('orchestrator:get-all-tasks', () => {
        return taskExecutor.getAllTasks();
    });
}