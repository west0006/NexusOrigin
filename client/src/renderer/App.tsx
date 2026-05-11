// ─── client/src/renderer/App.tsx ──────────────────────────
import React from 'react';
import { Dashboard } from './pages/Dashboard';
import { DeploymentWizard } from './pages/Deployment';
import { SkillStore } from './pages/SkillStore';
import { Community } from './pages/Community';
import { useAppStore } from './store/app';

type Route = 'dashboard' | 'deployment' | 'skills' | 'community';

const NAV_ITEMS: { route: Route; label: string }[] = [
    { route: 'dashboard', label: '仪表盘' },
    { route: 'deployment', label: '部署' },
    { route: 'skills', label: '技能商店' },
    { route: 'community', label: '社区' },
];

const PAGE_MAP: Record<Route, React.FC> = {
    dashboard: Dashboard,
    deployment: DeploymentWizard,
    skills: SkillStore,
    community: Community,
};

export const App: React.FC = () => {
    const currentRoute = useAppStore((s) => s.currentRoute);
    const setRoute = useAppStore((s) => s.setRoute);

    const PageComponent = PAGE_MAP[currentRoute] ?? Dashboard;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <nav style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', display: 'flex', gap: 24 }}>
                    {NAV_ITEMS.map(({ route, label }) => (
                        <button
                            key={route}
                            onClick={() => setRoute(route)}
                            style={{
                                padding: '12px 16px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                color: currentRoute === route ? '#2563eb' : '#6b7280',
                                fontWeight: currentRoute === route ? 600 : 400,
                                borderBottom: currentRoute === route ? '2px solid #2563eb' : '2px solid transparent',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </nav>
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
                <PageComponent />
            </main>
        </div>
    );
};