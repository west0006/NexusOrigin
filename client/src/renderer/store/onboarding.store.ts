// client/src/renderer/store/onboarding.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IdentityType = 'user' | 'developer' | null;

export interface OnboardingStep {
    id: number;
    title: string;
    description: string;
}

// 普通用户引导步骤
export const USER_STEPS: OnboardingStep[] = [
    { id: 0, title: '欢迎来到枢元', description: '了解一下平台能为你做什么' },
    { id: 1, title: '一键部署', description: '选择一个框架并完成首次部署' },
    { id: 2, title: '成本监控', description: '查看 API 调用成本，掌握预算' },
    { id: 3, title: '探索社区', description: '看看其他用户都在做什么' },
    { id: 4, title: '完成', description: '所有引导已完成，开始探索吧' },
];

// 开发者引导步骤
export const DEVELOPER_STEPS: OnboardingStep[] = [
    { id: 0, title: '欢迎来到枢元', description: '为开发者打造的高效工作台' },
    { id: 1, title: '环境配置', description: '连接你的 API Key 和开发环境' },
    { id: 2, title: '创建第一个 Agent', description: '注册并配置你的第一个 Agent' },
    { id: 3, title: '发布到能力市场', description: '将你的 Agent 发布供他人使用' },
    { id: 4, title: '完成', description: '所有引导已完成，开始开发吧' },
];

interface OnboardingState {
    identity: IdentityType;
    currentStep: number;
    completed: boolean;
    skipped: boolean;
    dismissedAt: number | null; // 首页浮层关闭时间戳

    selectIdentity: (type: 'user' | 'developer') => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    completeOnboarding: () => void;
    skipOnboarding: () => void;
    dismissOverlay: () => void;
    reset: () => void;

    getSteps: () => OnboardingStep[];
    isLastStep: () => boolean;
    progress: () => number;
}

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            identity: null,
            currentStep: 0,
            completed: false,
            skipped: false,
            dismissedAt: null,

            selectIdentity: (type) => {
                set({ identity: type, currentStep: 0, completed: false, skipped: false });
            },

            nextStep: () => {
                const { currentStep, identity } = get();
                const steps = identity === 'developer' ? DEVELOPER_STEPS : USER_STEPS;
                if (currentStep < steps.length - 1) {
                    set({ currentStep: currentStep + 1 });
                } else {
                    set({ completed: true, currentStep: steps.length - 1 });
                }
            },

            prevStep: () => {
                const { currentStep } = get();
                if (currentStep > 0) {
                    set({ currentStep: currentStep - 1 });
                }
            },

            goToStep: (step) => {
                const { identity } = get();
                const steps = identity === 'developer' ? DEVELOPER_STEPS : USER_STEPS;
                set({ currentStep: Math.max(0, Math.min(step, steps.length - 1)) });
            },

            completeOnboarding: () => {
                set({ completed: true, skipped: false });
            },

            skipOnboarding: () => {
                set({ completed: true, skipped: true });
            },

            dismissOverlay: () => {
                set({ dismissedAt: Date.now() });
            },

            reset: () => {
                set({ identity: null, currentStep: 0, completed: false, skipped: false, dismissedAt: null });
            },

            getSteps: () => {
                const { identity } = get();
                return identity === 'developer' ? DEVELOPER_STEPS : USER_STEPS;
            },

            isLastStep: () => {
                const { currentStep, identity } = get();
                const steps = identity === 'developer' ? DEVELOPER_STEPS : USER_STEPS;
                return currentStep >= steps.length - 1;
            },

            progress: () => {
                const { currentStep, identity } = get();
                const steps = identity === 'developer' ? DEVELOPER_STEPS : USER_STEPS;
                if (steps.length === 0) return 100;
                return Math.round((currentStep / (steps.length - 1)) * 100);
            },
        }),
        {
            name: 'nexus-onboarding-storage',
            partialize: (state) => ({
                identity: state.identity,
                currentStep: state.currentStep,
                completed: state.completed,
                skipped: state.skipped,
                dismissedAt: state.dismissedAt,
            }),
        },
    ),
);