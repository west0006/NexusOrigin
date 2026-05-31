import { apiClient } from './client.api';
import type { Skill, SkillListResponse, CreateSkillDto } from '@shared/types';

export const skillAPI = {
    list: (page = 1, pageSize = 20, search?: string) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (search) params.set('search', search);
        return apiClient<SkillListResponse>(`/skills?${params.toString()}`);
    },

    create: (data: CreateSkillDto) =>
        apiClient<Skill>('/skills', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};