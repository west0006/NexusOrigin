// client/src/renderer/api/agent.api.ts
import { apiClient } from './client.api';
import type {
    Agent,
    RegisterAgentDto,
    AgentConversation,
    ChatMessage,
    A2ATask,
    CreateA2ATaskDto,
    A2ABid,
    AgentUsageStats,
    AgentTask,
} from '@shared/types';

export const agentAPI = {
    // ─── Agent 管理 ───
    list: (page = 1, pageSize = 20) =>
        apiClient<{ items: Agent[]; total: number; page: number; pageSize: number }>(
            `/agents?page=${page}&pageSize=${pageSize}`
        ),

    getById: (id: string) =>
        apiClient<Agent>(`/agents/${id}`),

    register: (data: RegisterAgentDto) =>
        apiClient<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),

    deregister: (agentId: string) =>
        apiClient<{ success: boolean }>(`/agents/${agentId}`, { method: 'DELETE' }),

    getMyAgents: () =>
        apiClient<Agent[]>('/agents/my-agents'),

    getServices: () =>
        apiClient<any[]>('/agents/services'),

    // ─── 单智能体对话 ───
    getConversations: (agentId: string) =>
        apiClient<AgentConversation[]>(`/agents/${agentId}/conversations`),

    getConversation: (conversationId: string) =>
        apiClient<AgentConversation>(`/agents/conversations/${conversationId}`),

    sendMessage: (conversationId: string, content: string) =>
        apiClient<ChatMessage>(`/agents/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        }),

    createConversation: (agentId: string, title: string) =>
        apiClient<AgentConversation>(`/agents/${agentId}/conversations`, {
            method: 'POST',
            body: JSON.stringify({ title }),
        }),

    // ─── Agent 任务 ───
    getTasks: (agentId: string) =>
        apiClient<AgentTask[]>(`/agents/${agentId}/tasks`),

    getMyTasks: () =>
        apiClient<AgentTask[]>('/agents/my-tasks'),

    createTask: (agentId: string, title: string, description: string) =>
        apiClient<AgentTask>(`/agents/${agentId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({ title, description }),
        }),

    getTokenStats: (agentId: string) =>
        apiClient<AgentUsageStats>(`/agents/${agentId}/usage`),

    // ─── A2A 跨智能体协作 ───
    listA2ATasks: (page = 1, pageSize = 20, status?: string) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status) params.set('status', status);
        return apiClient<{ tasks: A2ATask[]; total: number; page: number; pageSize: number }>(
            `/a2a/tasks?${params.toString()}`
        );
    },

    createA2ATask: (data: CreateA2ATaskDto) =>
        apiClient<A2ATask>('/a2a/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getA2ATaskById: (id: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${id}`),

    getMyA2ATasks: () =>
        apiClient<A2ATask[]>('/a2a/tasks/client'),

    getAgentA2ATasks: () =>
        apiClient<A2ATask[]>('/a2a/tasks/agent'),

    placeBid: (taskId: string, agentId: string, bidAmount: number, estimatedDays: number, message?: string) =>
        apiClient<A2ABid>(`/a2a/tasks/${taskId}/bids`, {
            method: 'POST',
            body: JSON.stringify({ agentId, bidAmount, estimatedDays, message }),
        }),

    getBids: (taskId: string) =>
        apiClient<A2ABid[]>(`/a2a/tasks/${taskId}/bids`),

    acceptBid: (taskId: string, bidId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/bids/${bidId}/accept`, { method: 'POST' }),

    startTask: (taskId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/start`, { method: 'POST' }),

    completeTask: (taskId: string, result: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ result }),
        }),

    confirmTask: (taskId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/confirm`, { method: 'POST' }),
};