import React, { useEffect } from 'react';
import { useAppStore, Route } from '../../store/app';
import { useUserStore } from '../../store/user.store';
import { StatusBar } from '../StatusBar';

const NAV_ITEMS: { route: Route; label: string; icon: string }[] = [
    { route: 'dashboard', label: '仪表盘', icon: '📊' },
    { route: 'deployment', label: '部署', icon: '🚀' },
    { route: 'modelProviders', label: '模型网关', icon: '⚙️' },
    { route: 'agents', label: 'Agent管理', icon: '🤖' },
    { route: 'tasks', label: '任务市场', icon: '🛠️' },
    { route: 'skills', label: '能力市场', icon: '🛒' },
    { route: 'community', label: '社区', icon: '💬' },
    { route: 'costCenter', label: '成本中心', icon: '💰' },
    { route: 'settings', label: '个人中心', icon: '👤' },

];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const currentRoute = useAppStore((s) => s.currentRoute);
    const setRoute = useAppStore((s) => s.setRoute);
    const user = useUserStore((s) => s.user);
    const logout = useUserStore((s) => s.logout);

    // 路由切换时回到顶部
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentRoute]);

    // 全局 ESC 键关闭聚焦面板（由各个 FocusPanel 自行监听原生 Escape，这里仅做补充）
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // 向所有聚焦面板发送关闭事件（备用）
                window.dispatchEvent(new CustomEvent('close-focus-panels'));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* 左侧边栏 */}
            <aside
                style={{
                    width: 'var(--sidebar-width)',
                    backgroundColor: 'var(--color-canvas)',
                    borderRight: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                }}
            >
                <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                        枢元
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginTop: 4 }}>
                        AI Agent 协作平台
                    </p>
                </div>
                <nav style={{ flex: 1, padding: '8px' }}>
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.route}
                            onClick={() => setRoute(item.route)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: currentRoute === item.route ? 'var(--color-primary-light)' : 'transparent',
                                color: currentRoute === item.route ? 'var(--color-primary)' : 'var(--color-ink)',
                                fontWeight: currentRoute === item.route ? 600 : 400,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: 'var(--text-body-sm)',
                                transition: 'background 80ms ease-out',
                                marginBottom: 2,
                            }}
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* 用户状态区 */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
                    {user ? (
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{user.username}</div>
                            <button
                                className="button"
                                style={{ fontSize: 12, marginTop: 8 }}
                                onClick={() => {
                                    logout();
                                    setRoute('dashboard');
                                }}
                            >
                                退出登录
                            </button>
                        </div>
                    ) : (
                        <button
                            className="button button-primary"
                            style={{ width: '100%' }}
                            onClick={() => setRoute('auth')}
                        >
                            登录 / 注册
                        </button>
                    )}
                </div>
            </aside>

            {/* 右侧内容区 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header
                    style={{
                        height: 'var(--topnav-height)',
                        backgroundColor: 'var(--color-canvas)',
                        borderBottom: '1px solid var(--color-border)',
                        padding: '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}
                >
                    <div style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                        {NAV_ITEMS.find((i) => i.route === currentRoute)?.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button className="button">反馈</button>
                        {user && (
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-primary-light)',
                                    color: 'var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                }}
                                title={user.username}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </header>

                <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {children}
                </main>
                <StatusBar />
            </div>
        </div>
    );
};