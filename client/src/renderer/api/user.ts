import { apiClient } from './client';

export interface UserProfile {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    bio?: string;
    credits: number;
    createdAt: string;
}

export const userAPI = {
    getProfile: () => apiClient<UserProfile>('/user/profile'),
    updateProfile: (data: { username?: string; bio?: string; avatar?: string }) =>
        apiClient<UserProfile>('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    changePassword: (data: { oldPassword: string; newPassword: string }) =>
        apiClient<{ success: boolean }>('/user/change-password', { method: 'POST', body: JSON.stringify(data) }),
    getBalance: () => apiClient<{ credits: number }>('/user/balance'),
    recharge: (data: { amount: number; method: string }) =>
        apiClient<{ credits: number }>('/user/recharge', { method: 'POST', body: JSON.stringify(data) }),
};