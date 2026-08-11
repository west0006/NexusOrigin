// client/src/renderer/App.tsx
import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import Dashboard from '@renderer/pages/workspace/Dashboard';
import { DeploymentWizard } from '@renderer/pages/workspace/Deployment';
import CapabilityMarketplace from '@renderer/pages/ecosystem/CapabilityMarketplace';
import { Community } from '@renderer/pages/ecosystem/Community';
import { AuthPage } from '@renderer/pages/user/Auth';
import { OnboardingWizard } from '@renderer/pages/user/OnboardingWizard';
import { useAppStore, Route } from './store/app';
import { useUserStore } from './store/user.store';
import { useOnboardingStore } from './store/onboarding.store';
import { useUserLevelStore } from './store/userLevel.store';
import { Profile } from '@renderer/pages/user/Profile';
import { CommandPalette } from '@renderer/components/CommandPalette';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';
import { ToastContainer } from '@renderer/components/Toast';
import { ConfirmProvider } from '@renderer/contexts/ConfirmContext';
import { ModelProviders } from '@renderer/pages/config/ModelProviders';
import { GlobalCommandPalette } from '@renderer/components/GlobalCommandPalette';
import { OnboardingOverlay } from '@renderer/components/OnboardingOverlay';
import { AchievementToastContainer } from '@renderer/components/AchievementToast';
import Agents from '@renderer/pages/workspace/Agents';
import TaskMarketplace from '@renderer/pages/collab/TaskMarketplace';
import CollaborationLab from '@renderer/pages/collab/CollaborationLab';
import Assistant from '@renderer/pages/user/Assistant';
import Environment from '@renderer/pages/config/Environment';
import CostCenter from '@renderer/pages/config/CostCenter';
import AssistantPanel from '@renderer/components/Assistant/AssistantPanel';

const PAGE_MAP: Record<Exclude<Route, 'auth' | 'onboarding'>, React.FC> = {
    dashboard: Dashboard,
    deployment: DeploymentWizard,
    skills: CapabilityMarketplace,
    community: Community,
    settings: Profile,
    agents:  Agents,
    modelProviders: ModelProviders,
    costCenter: CostCenter,
    tasks: TaskMarketplace,
    taskMarketplace: TaskMarketplace,
    collaborationLab: CollaborationLab,
    environment: Environment,
    assistant: Assistant,
};

const PROTECTED: Route[] = ['skills', 'community', 'agents', 'settings', 'taskMarketplace', 'collaborationLab', 'environment', 'assistant'];

export const App: React.FC = () => {
    const currentRoute = useAppStore(s => s.currentRoute);
    const setRoute = useAppStore(s => s.setRoute);
    const user = useUserStore(s => s.user);
    const initAuth = useUserStore(s => s.initAuth);
    const [redirectAfterLogin, setRedirectAfterLogin] = useState<Route | null>(null);

    // 引导状态
    const onboardingCompleted = useOnboardingStore(s => s.completed);
    const onboardingIdentity = useOnboardingStore(s => s.identity);
    const selectIdentity = useOnboardingStore(s => s.selectIdentity);

    // 用户等级（用于每日签到检测）
    const checkLoginStreak = useUserLevelStore(s => s.checkLoginStreak);

    // 页面初始化恢复登录状态
    useEffect(() => {
        initAuth();
    }, []);

    // 登录后每日签到检测
    useEffect(() => {
        if (user) {
            checkLoginStreak();
        }
    }, [user]);

    // 路由守卫 + 登录/引导跳转
    useEffect(() => {
        if (!user) {
            if (PROTECTED.includes(currentRoute)) {
                setRedirectAfterLogin(currentRoute);
                setRoute('auth');
            }
        } else {
            if (currentRoute === 'auth') {
                // 已登录用户进入 auth 页：检查引导状态
                if (!onboardingCompleted) {
                    // 如果已选过身份但未完成引导，回到引导页
                    if (onboardingIdentity) {
                        setRoute('onboarding');
                    } else {
                        // 否则跳转仪表盘（之前身份选择在 auth 内处理）
                        const target = redirectAfterLogin || 'dashboard';
                        setRoute(target);
                        setRedirectAfterLogin(null);
                    }
                } else {
                    const target = redirectAfterLogin || 'dashboard';
                    setRoute(target);
                    setRedirectAfterLogin(null);
                }
            }
        }
    }, [user, currentRoute]);

    // 渲染页面
    let Page: React.FC;

    if (currentRoute === 'auth') {
        Page = AuthPage;
    } else if (currentRoute === 'onboarding') {
        Page = OnboardingWizard;
    } else {
        Page = PAGE_MAP[currentRoute] || Dashboard;
    }

    return (
        <ErrorBoundary>
            <ConfirmProvider>
                <Layout>
                    <Page />
                    <CommandPalette />
                    <GlobalCommandPalette />
                </Layout>
                <ToastContainer />
                <AssistantPanel />
                {/*<AssistantTrigger />*/}
                <AchievementToastContainer />
                <OnboardingOverlay />
            </ConfirmProvider>
        </ErrorBoundary>
    );
};