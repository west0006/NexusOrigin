// client/src/renderer/store/capability.store.ts
import { create } from 'zustand';
import { capabilityAPI } from '../api/capability.api';
import type { Capability } from '@shared/types';

interface CapabilityState {
    items: Capability[];
    loading: boolean;
    total: number;
    page: number;
    fetchList: (page?: number, pageSize?: number, search?: string) => Promise<void>;
    install: (id: string) => Promise<void>;
}

export const useCapabilityStore = create<CapabilityState>((set, get) => ({
    items: [],
    loading: false,
    total: 0,
    page: 1,

    fetchList: async (page = 1, pageSize = 20, search = '') => {
        set({ loading: true });
        try {
            const res = await capabilityAPI.list({ page, pageSize, search });
            set({ items: res.items, total: res.total, page });
        } catch (e) {
            console.error('获取能力列表失败', e);
        } finally {
            set({ loading: false });
        }
    },

    install: async (id) => {
        // 调用安装接口（实际是购买或安装）
        await capabilityAPI.purchase(id);
        // 可选刷新列表或显示成功
    },
}));