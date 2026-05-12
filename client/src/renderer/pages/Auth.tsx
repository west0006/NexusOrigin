// ── client/src/renderer/pages/Auth.tsx
import React, { useState } from 'react';
import { authAPI } from '../api/auth.api';
import { useUserStore } from '../store/user.store';
import { useAppStore } from '../store/app';

export const AuthPage: React.FC = () => {
    const [tab, setTab] = useState<'login' | 'register'>('login');
    const [form, setForm] = useState({ email: '', username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const setAuth = useUserStore(s => s.setAuth);
    const setRoute = useAppStore(s => s.setRoute);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            if (tab === 'register') {
                const res = await authAPI.register(form);
                setAuth(res.user, res.accessToken);
                // 不在手动跳转，由 App.tsx 的 useEffect 自动处理
            } else {
                const res = await authAPI.login({ email: form.email, password: form.password });
                setAuth(res.user, res.accessToken);
            }
        } catch (e: any) {
            setError(e.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '60px auto' }}>
            <div style={{ display: 'flex', marginBottom: 24 }}>
                <button
                    onClick={() => setTab('login')}
                    style={{
                        flex: 1,
                        padding: 12,
                        border: 'none',
                        background: tab === 'login' ? 'var(--color-canvas)' : 'var(--color-surface-1)',
                        fontWeight: tab === 'login' ? 600 : 400,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                        cursor: 'pointer',
                    }}
                >
                    登录
                </button>
                <button
                    onClick={() => setTab('register')}
                    style={{
                        flex: 1,
                        padding: 12,
                        border: 'none',
                        background: tab === 'register' ? 'var(--color-canvas)' : 'var(--color-surface-1)',
                        fontWeight: tab === 'register' ? 600 : 400,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                        cursor: 'pointer',
                    }}
                >
                    注册
                </button>
            </div>

            <div className="card" style={{ padding: 24 }}>
                {tab === 'register' && (
                    <input
                        className="input"
                        style={{ width: '100%', marginBottom: 12 }}
                        placeholder="用户名"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                    />
                )}
                <input
                    className="input"
                    style={{ width: '100%', marginBottom: 12 }}
                    placeholder="邮箱"
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                />
                <input
                    className="input"
                    style={{ width: '100%', marginBottom: 16 }}
                    placeholder="密码"
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                />

                {error && (
                    <div style={{ color: 'var(--color-error)', fontSize: 14, marginBottom: 12 }}>
                        {error}
                    </div>
                )}

                <button
                    className="button button-primary"
                    style={{ width: '100%' }}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? '提交中...' : tab === 'login' ? '登录' : '注册'}
                </button>
            </div>
        </div>
    );
};