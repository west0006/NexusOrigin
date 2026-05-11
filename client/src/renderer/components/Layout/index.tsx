// ─── client/src/renderer/components/Layout/index.tsx ──────
import React from 'react';
import { useAppStore } from '../../store/app';

interface Props {
    children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ children }) => {
    const currentRoute = useAppStore((s) => s.currentRoute);
    const setRoute = useAppStore((s) => s.setRoute);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside style={{ width: 200, backgroundColor: '#1f2937', color: '#fff', padding: 16 }}>
                <h2 style={{ fontSize: 18, marginBottom: 24 }}>虾塘智联</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        { route: 'dashboard', label: '📊 仪表盘' },
                        { route: 'deployment', label: '🚀 部署' },
                        { route: 'skills', label: '🛒 技能商店' },
                        { route: 'community', label: '💬 社区' },
                    ].map(({ route, label }) => (
                        <button
                            key={route}
                            onClick={() => setRoute(route as any)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 4,
                                border: 'none',
                                background: currentRoute === route ? '#374151' : 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main style={{ flex: 1, padding: 24, backgroundColor: '#f9fafb' }}>{children}</main>
        </div>
    );
};