// ─── client/src/renderer/store/skill.store.ts ─────────────
import { create } from 'zustand';
import type { SkillItem } from '../../shared/types';

interface SkillState {
    skills: SkillItem[];
    installed: SkillItem[];
    fetchSkills: (page?: number, pageSize?: number) => Promise<void>;
    fetchInstalled: () => Promise<void>;
}

export const useSkillStore = create<SkillState>((set) => ({
    skills: [],
    installed: [],
    fetchSkills: async (page = 1, pageSize = 20) => {
        if (window.electronAPI) {
            const data = await window.electronAPI.skillStore.list({ page, pageSize });
            set({ skills: (data as { items: SkillItem[] }).items });
        }
    },
    fetchInstalled: async () => {
        if (window.electronAPI) {
            const installed = await window.electronAPI.skillStore.getInstalled();
            set({ installed });
        }
    },
}));