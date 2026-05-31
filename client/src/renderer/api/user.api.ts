import { apiClient } from './client.api';
import type {
    UserProfile,
    TokenUsageResponse,
    UpdateProfileDto,
    ChangePasswordDto,
    RechargeDto,
    CreditsResponse,
} from '@shared/types';

export const userAPI = {
    getProfile: () =>
        apiClient<UserProfile>('/user/profile'),

    updateProfile: (data: UpdateProfileDto) =>
        apiClient<UserProfile>('/user/profile', { method: 'PATCH', body: JSON.stringify(data) }),

    changePassword: (data: ChangePasswordDto) =>
        apiClient<{ success: boolean }>('/user/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getCredits: () =>
        apiClient<CreditsResponse>('/user/credits'),

    recharge: (data: RechargeDto) =>
        apiClient<CreditsResponse>('/user/recharge', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getTokenUsage: (days = 7) =>
        apiClient<TokenUsageResponse>(`/user/token-usage?days=${days}`),
};