// client/src/renderer/store/skill.store.ts
import { create } from 'zustand';
import { skillAPI } from '../api/skill.api';
import type { Skill } from '@shared/types';

interface SkillState {
    skills: Skill[];
    installed: Skill[];
    loading: boolean;
    error: string | null;
    fetchSkills: (page?: number, pageSize?: number, search?: string) => Promise<void>;
    fetchInstalled: () => Promise<void>;
    clearError: () => void;
}

export const useSkillStore = create<SkillState>((set) => ({
    skills: [],
    installed: [],
    loading: false,
    error: null,

    fetchSkills: async (page = 1, pageSize = 20, search?: string) => {
        set({ loading: true, error: null });
        try {
            const data = await skillAPI.list(page, pageSize, search);
            set({ skills: data.items, loading: false });
        } catch (err: any) {
            set({ error: err.message || '获取技能列表失败', loading: false });
        }
    },

    fetchInstalled: async () => {
        set({ loading: true, error: null });
        try {
            if (window.electronAPI) {
                const installed = await window.electronAPI.skillStore.getInstalled() as Skill[];
                set({ installed, loading: false });
            } else {
                set({ installed: [], loading: false });
            }
        } catch (err: any) {
            set({ error: err.message || '获取已安装技能失败', loading: false });
        }
    },

    clearError: () => set({ error: null }),
}));