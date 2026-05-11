// ─── client/src/renderer/api/skill.api.ts ─────────────────
import { apiClient } from './client';
import type { SkillItem } from '../../shared/types';

export const skillAPI = {
    list: (page = 1, pageSize = 20) =>
        apiClient<{ items: SkillItem[]; total: number }>(`/skills?page=${page}&pageSize=${pageSize}`),
    install: (skillId: string) =>
        apiClient<SkillItem>(`/skills/${skillId}/install`, { method: 'POST' }),
};