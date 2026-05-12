// ── client/src/renderer/api/skill.ts
import { apiClient } from './client';

export interface Skill {
    id: string;
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
    downloads: number;
    rating: number;
    status: string;
    author: { id: string; username: string };
    manifest?: any;
}

export const skillAPI = {
    list: (page = 1, pageSize = 20) =>
        apiClient<{ items: Skill[]; total: number }>(`/skills?page=${page}&pageSize=${pageSize}`),
    install: (skillId: string) =>
        apiClient<Skill>(`/skills/${skillId}/install`, { method: 'POST' }),
};