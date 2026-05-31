import { apiClient } from './client.api';
import type { A2ATask, A2ATaskListResponse, CreateA2ATaskDto, A2ABid } from '@shared/types';

export const a2aAPI = {
    list: (page = 1, pageSize = 20, status?: string) => {
        const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status) searchParams.set('status', status);
        return apiClient<A2ATaskListResponse>(`/a2a/tasks?${searchParams.toString()}`);
    },

    create: (data: CreateA2ATaskDto) =>
        apiClient<A2ATask>('/a2a/tasks', { method: 'POST', body: JSON.stringify(data) }),

    getClientTasks: () => apiClient<A2ATask[]>('/a2a/tasks/client'),

    getAgentTasks: () => apiClient<A2ATask[]>('/a2a/tasks/agent'),

    getTaskById: (id: string) => apiClient<A2ATask>(`/a2a/tasks/${id}`),

    placeBid: (taskId: string, agentId: string, bidAmount: number, estimatedDays: number, message?: string) =>
        apiClient<A2ABid>(`/a2a/tasks/${taskId}/bids`, {
            method: 'POST',
            body: JSON.stringify({ agentId, bidAmount, estimatedDays, message }),
        }),

    acceptBid: (taskId: string, bidId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/bids/${bidId}/accept`, { method: 'POST' }),

    startTask: (taskId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/start`, { method: 'POST' }),

    completeTask: (taskId: string, result: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ result }) }),

    confirmCompletion: (taskId: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${taskId}/confirm`, { method: 'POST' }),
};