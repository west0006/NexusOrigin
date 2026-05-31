// client/src/renderer/api/orchestrator.api.ts
// 中枢调度器前端 API

import { apiClient } from './client.api';
import type { Agent } from '@shared/types';

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

export const orchestratorApi = {
    /** 创建任务并启动执行 */
    createTask: (params: { input: string; budget?: number; pipeline?: { capabilityId: string; prompt: string }[] }) =>
        apiClient<OrchestrationTask>('/orchestrator/tasks', {
            method: 'POST',
            body: JSON.stringify(params),
        }),

    /** 获取任务详情 */
    getTask: (taskId: string) =>
        apiClient<OrchestrationTask | null>(`/orchestrator/tasks/${taskId}`),

    /** 取消任务 */
    cancelTask: (taskId: string) =>
        apiClient<{ success: boolean }>(`/orchestrator/tasks/${taskId}/cancel`, {
            method: 'POST',
        }),

    /** 获取所有 Agent */
    getAgents: () =>
        apiClient<Agent[]>('/orchestrator/agents'),

    /** 注册 Agent */
    registerAgent: (agent: { name: string; description: string; endpoint: string; capabilities?: string[] }) =>
        apiClient<{ success: boolean }>('/orchestrator/agents', {
            method: 'POST',
            body: JSON.stringify(agent),
        }),
};