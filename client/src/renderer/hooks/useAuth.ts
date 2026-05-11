// ─── client/src/renderer/hooks/useAuth.ts ──────────────────
import { useState } from 'react';
import { authAPI, AuthResponse } from '../api/auth.api';

export function useAuth() {
    const [user, setUser] = useState<AuthResponse['user'] | null>(null);
    const [loading, setLoading] = useState(false);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const data = await authAPI.login({ email, password });
            localStorage.setItem('accessToken', data.accessToken);
            setUser(data.user);
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, username: string, password: string) => {
        setLoading(true);
        try {
            const data = await authAPI.register({ email, username, password });
            localStorage.setItem('accessToken', data.accessToken);
            setUser(data.user);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        setUser(null);
    };

    return { user, loading, login, register, logout };
}