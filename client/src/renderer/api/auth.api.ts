// ─── client/src/renderer/api/auth.api.ts ──────────────────
import { apiClient } from './client';

export interface AuthResponse {
    user: { id: string; email: string; username: string };
    accessToken: string;
    refreshToken: string;
}

export const authAPI = {
    register: (data: { email: string; username: string; password: string }) =>
        apiClient<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
        apiClient<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};