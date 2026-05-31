// client/src/renderer/store/user.store.ts
import { create } from 'zustand';
import { authAPI } from '../api/auth.api';
import type { User } from '@shared/types';

interface UserState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    setAuth: (user: User, token: string, refreshToken: string) => void;
    logout: () => Promise<void>;
    initAuth: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    token: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,

    setAuth: (user, token, refreshToken) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, refreshToken });
    },

    logout: async () => {
        try {
            await authAPI.logout();
        } catch (e) {
            console.warn('Logout API failed', e);
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, token: null, refreshToken: null });
    },

    initAuth: () => {
        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');
        if (token && refreshToken && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({ token, refreshToken, user });
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            }
        }
    },
}));