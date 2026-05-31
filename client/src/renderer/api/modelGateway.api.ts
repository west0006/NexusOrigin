import { apiClient } from './client.api';
import type { UserProvider } from '@shared/types';

export const modelGatewayAPI = {
    getProviders: () => apiClient<UserProvider[]>('/model-gateway/providers'),

    addProvider: (data: { providerName: string; apiKey: string; baseUrl?: string; isDefault?: boolean }) =>
        apiClient<UserProvider>('/model-gateway/providers', { method: 'POST', body: JSON.stringify(data) }),

    setDefault: (providerId: string) =>
        apiClient<UserProvider>(`/model-gateway/providers/${providerId}/default`, { method: 'POST' }),

    deleteProvider: (providerId: string) =>
        apiClient<{ success: boolean }>(`/model-gateway/providers/${providerId}`, { method: 'DELETE' }),

    testProvider: (providerId: string) =>
        apiClient<{ success: boolean; latency: number; models?: any[] }>(`/model-gateway/providers/${providerId}/test`, { method: 'POST' }),

    getModels: (providerId: string) =>
        apiClient<{ models: any[] }>(`/model-gateway/providers/${providerId}/models`),

    testConnection: (baseURL: string, apiKey: string) =>
        apiClient<{ success: boolean; latency: number; message?: string }>('/model-gateway/test-connection', {
            method: 'POST',
            body: JSON.stringify({ baseURL, apiKey }),
        }),
};