// client/src/renderer/api/auth.api.ts (已存在，确认返回类型)
import { apiClient, apiPublic } from './client.api';
import type {
    AuthResponse,
    PhoneLoginResponse,
    RegisterDto,
    LoginDto,
    SendSmsDto,
    PhoneLoginDto,
    RegisterFinishDto,
    SelectIdentityDto, User,
} from '@shared/types';

export const authAPI = {
    login: (data: LoginDto) =>
        apiPublic<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: RegisterDto) =>
        apiPublic<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    sendSms: (data: SendSmsDto) =>
        apiPublic<{ ok: boolean }>('/auth/sms/send', { method: 'POST', body: JSON.stringify(data) }),

    phoneLogin: (data: PhoneLoginDto) =>
        apiPublic<PhoneLoginResponse>('/auth/phone/login', { method: 'POST', body: JSON.stringify(data) }),

    registerFinish: (data: RegisterFinishDto) =>
        apiPublic<AuthResponse>('/auth/register/finish', { method: 'POST', body: JSON.stringify(data) }),

    selectIdentity: (data: SelectIdentityDto) =>
        apiClient<{ identityType: string; onboardingStep: string; message: string }>('/auth/identity/select', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    skipOnboarding: () =>
        apiClient<{ onboardingStep: string; message: string }>('/auth/onboarding/skip', { method: 'POST' }),

    logout: () =>
        apiClient<{ success: boolean }>('/auth/logout', { method: 'POST' }),

    refresh: (refreshToken: string) =>
        apiPublic<{ accessToken: string; refreshToken?: string }>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        }),

    me: () => apiClient<User>('/auth/me'),
};