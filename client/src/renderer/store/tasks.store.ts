// client/src/renderer/store/tasks.store.ts
import { create } from 'zustand';
import { a2aAPI } from '../api/a2a.api';
import type { A2ATask } from '@shared/types';

interface TasksState {
    tasks: A2ATask[];
    loading: boolean;
    total: number;
    page: number;
    filter: { status?: string; search?: string };
    setFilter: (filter: Partial<TasksState['filter']>) => void;
    fetchTasks: () => Promise<void>;
    createTask: (data: any) => Promise<void>;
    placeBid: (taskId: string, agentId: string, bidAmount: number, estimatedDays: number, message?: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
    tasks: [],
    loading: false,
    total: 0,
    page: 1,
    filter: {},

    setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter }, page: 1 })),

    fetchTasks: async () => {
        set({ loading: true });
        try {
            const { filter, page } = get();
            const res = await a2aAPI.list(page, 20, filter.status);
            set({ tasks: res.tasks, total: res.total });
        } catch (e) {
            console.error('获取任务列表失败', e);
            set({ tasks: [], total: 0 });
        } finally {
            set({ loading: false });
        }
    },

    createTask: async (data) => {
        await a2aAPI.create(data);
        await get().fetchTasks();
    },

    placeBid: async (taskId, agentId, bidAmount, estimatedDays, message) => {
        await a2aAPI.placeBid(taskId, agentId, bidAmount, estimatedDays, message);
        await get().fetchTasks();
    },
}));