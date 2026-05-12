import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DeploymentWizard } from './pages/Deployment';
import { SkillStore } from './pages/SkillStore';
import { Community } from './pages/Community';
import { AuthPage } from './pages/Auth';
import { useAppStore, Route } from './store/app';
import { useUserStore } from './store/user.store';

const PAGE_MAP: Record<Exclude<Route, 'auth'>, React.FC> = {
    dashboard: Dashboard,
    deployment: DeploymentWizard,
    skills: SkillStore,
    community: Community,
};

const PROTECTED: Route[] = ['skills', 'community'];

export const App: React.FC = () => {
    const currentRoute = useAppStore(s => s.currentRoute);
    const setRoute = useAppStore(s => s.setRoute);
    const user = useUserStore(s => s.user);
    const initAuth = useUserStore(s => s.initAuth);
    const [redirectAfterLogin, setRedirectAfterLogin] = useState<Route | null>(null);

    // 页面初始化恢复登录状态
    useEffect(() => {
        initAuth();
    }, []);

    // 路由守卫 + 登录跳转
    useEffect(() => {
        if (!user) {
            // 未登录，如果要访问受保护页面，保存目标并跳转登录
            if (PROTECTED.includes(currentRoute)) {
                setRedirectAfterLogin(currentRoute);
                setRoute('auth');
            }
        } else {
            // 已登录
            if (currentRoute === 'auth') {
                // 登录成功后，跳转到之前想去的页面或默认仪表盘
                const target = redirectAfterLogin || 'dashboard';
                setRoute(target);
                setRedirectAfterLogin(null);
            }
        }
    }, [user, currentRoute]);

    const Page = currentRoute === 'auth' ? AuthPage : PAGE_MAP[currentRoute] || Dashboard;

    return (
        <Layout>
            <Page />
        </Layout>
    );
};