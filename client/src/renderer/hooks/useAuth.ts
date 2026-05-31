// client/src/renderer/hooks/useAuth.ts
import { useState } from 'react';
import { authAPI } from '../api/auth.api';
import { useUserStore } from '../store/user.store';
import type { User } from '@shared/types';

export function useAuth() {
    const { setAuth, logout: storeLogout } = useUserStore();
    const [loading, setLoading] = useState(false);

    const phoneLogin = async (phone: string, code: string) => {
        setLoading(true);
        try {
            const res = await authAPI.phoneLogin({ phone, code });
            if (res.isNewUser) {
                return { isNewUser: true, registerToken: res.registerToken };
            } else {
                if (res.user && res.accessToken && res.refreshToken) {
                    setAuth(res.user, res.accessToken, res.refreshToken);
                }
                return { isNewUser: false };
            }
        } finally {
            setLoading(false);
        }
    };

    const registerFinish = async (token: string, username: string, avatar?: string) => {
        setLoading(true);
        try {
            const res = await authAPI.registerFinish({ token, username, avatar });
            setAuth(res.user, res.accessToken, res.refreshToken);
            return res;
        } finally {
            setLoading(false);
        }
    };

    const selectIdentity = async (identityType: 'USER' | 'DEVELOPER') => {
        setLoading(true);
        try {
            await authAPI.selectIdentity({ identityType });
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await storeLogout();
    };

    return { loading, phoneLogin, registerFinish, selectIdentity, logout };
}