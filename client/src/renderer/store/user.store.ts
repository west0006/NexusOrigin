// client/src/renderer/store/user.store.ts
import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
}

interface UserState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    /** 页面初始化时从 localStorage 恢复登录状态 */
    initAuth: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    token: localStorage.getItem('accessToken') || null,

    setAuth: (user, token) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token });
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        set({ user: null, token: null });
    },

    initAuth: () => {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({ token, user });
            } catch {
                // 数据损坏，清空
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        }
    },
}));