import { apiClient } from './client.api';
import type { Capability, CapabilityListResponse, CreateCapabilityDto, InstallGuide } from '@shared/types';

export const capabilityAPI = {
    list: (params?: { page?: number; pageSize?: number; search?: string; sort?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
        if (params?.search) searchParams.set('search', params.search);
        if (params?.sort) searchParams.set('sort', params.sort);
        const query = searchParams.toString();
        return apiClient<CapabilityListResponse>(`/capabilities${query ? `?${query}` : ''}`);
    },

    getById: (id: string) => apiClient<Capability>(`/capabilities/${id}`),

    create: (data: CreateCapabilityDto) =>
        apiClient<Capability>('/capabilities', { method: 'POST', body: JSON.stringify(data) }),

    purchase: (id: string) =>
        apiClient<{ success: boolean }>(`/capabilities/${id}/purchase`, { method: 'POST' }),

    getInstallGuide: (id: string) =>
        apiClient<InstallGuide>(`/capabilities/${id}/install-guide`),

    getEarnings: (params?: { startDate?: string; endDate?: string; groupBy?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.startDate) searchParams.set('startDate', params.startDate);
        if (params?.endDate) searchParams.set('endDate', params.endDate);
        if (params?.groupBy) searchParams.set('groupBy', params.groupBy);
        const query = searchParams.toString();
        return apiClient<any>(`/capabilities/developer/earnings${query ? `?${query}` : ''}`);
    },
};