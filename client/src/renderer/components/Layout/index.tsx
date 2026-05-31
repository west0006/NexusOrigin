// client/src/renderer/components/Layout/index.tsx
// 极简扁平风格，统一使用 C token

import React, { useEffect } from 'react';
import { useAppStore, Route } from '../../store/app';
import { useUserStore } from '../../store/user.store';
import { StatusBar } from '../StatusBar';
import { C } from '../../styles/theme';

/* ─── 线框风格 SVG 图标 ─── */
const icons: Record<string, React.ReactNode> = {
    dashboard: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    deployment: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
    ),
    environment: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
        </svg>
    ),
    agents: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 00-16 0" /><path d="M16 6a4 4 0 110-4" /><path d="M8 6a4 4 0 110-4" />
        </svg>
    ),
    collaborationLab: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    ),
    taskMarketplace: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" />
        </svg>
    ),
    skills: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /><path d="M22 7v5" />
        </svg>
    ),
    community: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    ),
    modelProviders: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5" /><path d="M12 11v1" /><path d="M18 8a6 6 0 01-12 0" />
            <path d="M4.4 17.5A8 8 0 0120 14" /><rect x="2" y="17" width="20" height="5" rx="1.5" />
        </svg>
    ),
    costCenter: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
    ),
    assistant: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <circle cx="12" cy="10" r="3" /><path d="M9 17h6" />
        </svg>
    ),
    settings: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
    ),
};

// === NAV_ITEMS 配置 ===
const NAV_ITEMS: { route: Route; label: string; id: string }[] = [
    // 工作台
    { route: 'dashboard',         label: '仪表盘',   id: 'dashboard' },
    { route: 'agents',            label: '智能体',   id: 'agents' },
    // 协作
    { route: 'collaborationLab',  label: '协作实验室', id: 'collaborationLab' },
    { route: 'taskMarketplace',   label: '任务大厅',  id: 'taskMarketplace' },
    // 生态
    { route: 'skills',            label: '能力市场',  id: 'skills' },
    { route: 'community',         label: '社区',     id: 'community' },
    // 配置
    { route: 'environment',       label: '环境与网关', id: 'environment' },
    { route: 'modelProviders',    label: '模型提供商', id: 'modelProviders' },
    // 个人
    { route: 'assistant',         label: '平台助理',  id: 'assistant' },
    { route: 'costCenter',        label: '成本中心',  id: 'costCenter' },
    { route: 'settings',          label: '个人中心',  id: 'settings' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const currentRoute = useAppStore((s) => s.currentRoute);
    const setRoute = useAppStore((s) => s.setRoute);
    const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useAppStore((s) => s.toggleSidebar);
    const user = useUserStore((s) => s.user);
    const logout = useUserStore((s) => s.logout);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentRoute]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                window.dispatchEvent(new CustomEvent('close-focus-panels'));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg, color: C.text }}>

            {/* ─── 左侧边栏 ─── */}
            <aside
                style={{
                    width: sidebarCollapsed ? 56 : 220,
                    backgroundColor: C.bg,
                    borderRight: `1px solid ${C.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    transition: 'width 200ms ease-out',
                    overflow: 'hidden',
                }}
            >
                {/* 折叠/展开按钮 */}
                <button
                    onClick={toggleSidebar}
                    title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 40,
                        margin: '8px 8px 4px',
                        borderRadius: C.radiusMd,
                        border: 'none',
                        background: 'transparent',
                        color: C.textSecondary,
                        cursor: 'pointer',
                        transition: 'background 80ms',
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {sidebarCollapsed ? (
                            <polyline points="9 18 15 12 9 6" />
                        ) : (
                            <polyline points="15 18 9 12 15 6" />
                        )}
                    </svg>
                </button>

                {/* 导航项 */}
                <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {NAV_ITEMS.map((item) => {
                        const active = currentRoute === item.route;
                        return (
                            <button
                                key={item.route}
                                onClick={() => setRoute(item.route)}
                                title={sidebarCollapsed ? item.label : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                                    gap: sidebarCollapsed ? 0 : 10,
                                    width: '100%',
                                    height: 38,
                                    padding: sidebarCollapsed ? 0 : '0 12px',
                                    borderRadius: C.radiusMd,
                                    border: 'none',
                                    background: active ? C.primaryLight : 'transparent',
                                    color: active ? C.primary : C.textSecondary,
                                    cursor: 'pointer',
                                    fontWeight: active ? 600 : 400,
                                    fontSize: C.textCaption,
                                    transition: 'background 80ms, color 80ms',
                                }}
                            >
                                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                    {icons[item.id]}
                                </span>
                                {!sidebarCollapsed && (
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* 用户状态区 */}
                <div style={{
                    padding: sidebarCollapsed ? '8px' : '16px',
                    borderTop: `1px solid ${C.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: sidebarCollapsed ? 'center' : 'stretch',
                    gap: 8,
                }}>
                    {user ? (
                        <>
                            <div
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    backgroundColor: C.primaryLight,
                                    color: C.primary,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                }}
                                title={user.username}
                            >
                                {(user.username || '?').charAt(0).toUpperCase()}
                            </div>
                            {!sidebarCollapsed && (
                                <>
                                    <div style={{ fontSize: C.textBody, fontWeight: 600, textAlign: 'center' }}>
                                        {user.username}
                                    </div>
                                    <button
                                        className="button"
                                        style={{ fontSize: C.textCaption, width: '100%' }}
                                        onClick={() => { logout(); setRoute('dashboard'); }}
                                    >
                                        退出登录
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <button
                            className="button button-primary"
                            style={{
                                width: '100%', fontSize: sidebarCollapsed ? C.textCaption : undefined,
                                padding: sidebarCollapsed ? '4px' : undefined,
                            }}
                            onClick={() => setRoute('auth')}
                        >
                            {sidebarCollapsed ? '登录' : '登录 / 注册'}
                        </button>
                    )}
                </div>
            </aside>

            {/* ─── 右侧内容区 ─── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header
                    style={{
                        height: 56,
                        backgroundColor: C.bg,
                        borderBottom: `1px solid ${C.border}`,
                        padding: '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* NexusOrigin 线框 Logo */}
                        <svg width="40" height="40" viewBox="25 0 155 120" fill="none" style={{ flexShrink: 0 }}>
                            <polygon points="80,15 127,40 127,90 80,115 33,90 33,40"
                                     stroke={C.primary} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                            <polygon points="80,40 112,56 112,88 80,104 48,88 48,56"
                                     stroke={C.primary} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
                            <line x1="60" y1="72" x2="100" y2="72" stroke={C.primary} strokeWidth="2" strokeLinecap="round" />
                            <polyline points="66,64 60,72 66,80" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="94,64 100,72 94,80" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>NEXUS</span>
                        <span style={{ fontSize: 11, fontWeight: 400, color: C.textSecondary, letterSpacing: 2 }}>ORIGIN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button className="button">反馈</button>
                        {user && (
                            <div
                                style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    backgroundColor: C.primaryLight,
                                    color: C.primary,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontWeight: 600,
                                }}
                                title={user.username}
                            >
                                {(user.username || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </header>

                <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {children}
                </main>
                <StatusBar />
            </div>

            <style>{`
@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-10px); opacity: 0; } }
`}</style>
        </div>
    );
};