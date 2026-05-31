import { apiClient } from './client.api';
import type {
    Task,
    TaskListResponse,
    CreateTaskDto,
    A2ATask,
    A2ATaskListResponse,
    CreateA2ATaskDto,
} from '@shared/types';

export const tasksApi = {
    list: (params?: { page?: number; pageSize?: number; status?: string; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.pageSize) query.set('pageSize', String(params.pageSize));
        if (params?.status) query.set('status', params.status);
        if (params?.search) query.set('search', params.search);
        return apiClient<TaskListResponse>(`/tasks?${query.toString()}`);
    },

    getById: (id: string) =>
        apiClient<Task>(`/tasks/${id}`),

    create: (data: CreateTaskDto) =>
        apiClient<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),

    claim: (id: string) =>
        apiClient<Task>(`/tasks/${id}/claim`, { method: 'POST' }),
};

export const a2aTasksApi = {
    list: (page = 1, pageSize = 20, status?: string) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status) params.set('status', status);
        return apiClient<A2ATaskListResponse>(`/a2a/tasks?${params.toString()}`);
    },

    create: (data: CreateA2ATaskDto) =>
        apiClient<A2ATask>('/a2a/tasks', { method: 'POST', body: JSON.stringify(data) }),

    getClientTasks: () =>
        apiClient<A2ATask[]>('/a2a/tasks/client'),

    getAgentTasks: () =>
        apiClient<A2ATask[]>('/a2a/tasks/agent'),

    getById: (id: string) =>
        apiClient<A2ATask>(`/a2a/tasks/${id}`),
};