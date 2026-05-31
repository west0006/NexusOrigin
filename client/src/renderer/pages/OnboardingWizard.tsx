// client/src/renderer/pages/OnboardingWizard.tsx
import React, { useState, useEffect } from 'react';
import { useOnboardingStore, IdentityType, USER_STEPS, DEVELOPER_STEPS } from '../store/onboarding.store';
import { useUserLevelStore, PRESET_BADGES } from '../store/userLevel.store';
import { useAppStore } from '../store/app';
import { showToast } from '../components/Toast';
import {Icon} from "@renderer/components/icons";

// ── 颜色常量 ──
const C = {
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    primaryDark: '#4A3DB6',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E17055',
    info: '#74B9FF',
    text: '#1A202C',
    textSecondary: '#718096',
    textLight: '#A0AEC0',
    bg: '#F8F9FA',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
};

// ── 图标子组件 ──
const UserIcon: React.FC = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const DeveloperIcon: React.FC = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="12" y1="2" x2="12" y2="22" stroke={C.textLight} strokeWidth="1" opacity={0.3} />
    </svg>
);

const CheckCircle: React.FC<{ filled?: boolean }> = ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? C.success : 'none'} stroke={filled ? '#fff' : C.textLight} strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        {filled && <polyline points="9 12 11 14 15 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
);

const SkipIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ── 身份选择页面 ──
const IdentitySelection: React.FC = () => {
    const selectIdentity = useOnboardingStore((s) => s.selectIdentity);
    const skipOnboarding = useOnboardingStore((s) => s.skipOnboarding);

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
            {/* 标题区域 */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.primary, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                    NexusOrigin
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, marginBottom: 12, lineHeight: 1.3 }}>
                    欢迎来到枢元
                </h1>
                <p style={{ fontSize: 15, color: C.textSecondary, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                    框架无关的 AI Agent 生命周期管理操作系统
                </p>
                <p style={{ fontSize: 14, color: C.textLight, marginTop: 8 }}>
                    请选择你的身份，我们将为你定制专属引导体验
                </p>
            </div>

            {/* 双卡片选择 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* 普通用户卡片 */}
                <button
                    onClick={() => selectIdentity('user')}
                    style={{
                        padding: 32, borderRadius: 16, border: `2px solid ${C.border}`,
                        background: C.cardBg, cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 16,
                        outline: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <UserIcon />
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>普通用户</div>
                        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                            我想使用 AI 完成日常工作、学习和生活任务，无需编写代码
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.primaryLight}20`, color: C.primary, fontSize: 12, fontWeight: 500 }}>
                            🤖 使用 Agent
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.success}20`, color: C.success, fontSize: 12, fontWeight: 500 }}>
                            📊 监控成本
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.info}20`, color: C.info, fontSize: 12, fontWeight: 500 }}>
                            💬 参与社区
                        </span>
                    </div>
                </button>

                {/* 开发者卡片 */}
                <button
                    onClick={() => selectIdentity('developer')}
                    style={{
                        padding: 32, borderRadius: 16, border: `2px solid ${C.border}`,
                        background: C.cardBg, cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 16,
                        outline: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    <DeveloperIcon />
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 4 }}>开发者</div>
                        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                            我想开发和部署自己的 AI Agent 和 MCP 工具
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.primaryLight}20`, color: C.primary, fontSize: 12, fontWeight: 500 }}>
                            🔧 开发 Agent
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.warning}30`, color: '#B7950B', fontSize: 12, fontWeight: 500 }}>
                            🏪 能力市场
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: `${C.success}20`, color: C.success, fontSize: 12, fontWeight: 500 }}>
                            🔗 跨框架协作
                        </span>
                    </div>
                </button>
            </div>

            {/* 跳过按钮 */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                    onClick={skipOnboarding}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: C.textLight, display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 8,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = `${C.border}60`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.textLight; e.currentTarget.style.background = 'none'; }}
                >
                    <SkipIcon /> 跳过所有引导，直接进入首页
                </button>
            </div>
        </div>
    );
};

// ── 步骤内容渲染 ──
const StepContent: React.FC<{
    stepId: number;
    identity: IdentityType;
    onAction?: () => void;
}> = ({ stepId, identity, onAction }) => {
    const setRoute = useAppStore((s) => s.setRoute);

    // 根据身份和步骤渲染不同内容
    if (identity === 'user') {
        switch (stepId) {
            case 0:
                return (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 24 }}>🌊</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>枢元是什么？</h2>
                        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                            枢元是一个让 AI Agent 帮你做事的平台。<br />
                            你可以一键部署框架、监控成本、在社区交流，<br />
                            所有的 Agent 能力都在市场中等你使用。
                        </p>
                        <p style={{ fontSize: 13, color: C.textLight, marginTop: 16 }}>
                            接下来的几步将带你快速上手
                        </p>
                    </div>
                );
            case 1:
                return (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 24 }}>🚀</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>一键部署</h2>
                        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                            选择一个 AI Agent 框架，点击即可自动部署。<br />
                            无需配置环境，无需编写代码。<br />
                            部署完成后即可使用 Agent 帮你工作。
                        </p>
                        <button
                            className="button button-primary"
                            style={{ marginTop: 24 }}
                            onClick={() => { setRoute('deployment'); onAction?.(); }}
                        >
                            立即部署
                        </button>
                    </div>
                );
            case 2:
                return (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 24 }}>📊</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>成本监控</h2>
                        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                            实时追踪你的 AI 调用成本。<br />
                            每个 Agent、每次请求、每日趋势一目了然。<br />
                            再也不会有意外的 API 费用账单。
                        </p>
                        <button
                            className="button button-primary"
                            style={{ marginTop: 24 }}
                            onClick={() => { setRoute('costCenter'); onAction?.(); }}
                        >
                            查看成本面板
                        </button>
                    </div>
                );
            case 3:
                return (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 24 }}>💬</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>探索社区</h2>
                        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                            社区里有很多和你一样的用户。<br />
                            分享使用经验、提问求助、发现有趣的 Agent。<br />
                            你也可以在这里参与话题讨论。
                        </p>
                        <button
                            className="button button-primary"
                            style={{ marginTop: 24 }}
                            onClick={() => { setRoute('community'); onAction?.(); }}
                        >
                            前往社区
                        </button>
                    </div>
                );
            case 4:
                return (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>准备就绪！</h2>
                        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                            你已经了解了枢元的核心功能。<br />
                            现在可以自由探索了，需要帮助时随时回来。
                        </p>
                    </div>
                );
            default:
                return null;
        }
    }

    // 开发者引导步骤
    switch (stepId) {
        case 0:
            return (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>⚡</div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>枢元开发者平台</h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                        枢元为开发者提供了一整套工具链：<br />
                        框架适配层、MCP 开发模板、A2A 协议 SDK。<br />
                        一次开发，跨框架运行。
                    </p>
                </div>
            );
        case 1:
            return (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>🔑</div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>环境配置</h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                        在模型网关中添加你的 API Key，<br />
                        连接 OpenAI、DeepSeek、硅基流动等服务商。<br />
                        这是开发和运行 Agent 的基础。
                    </p>
                    <button
                        className="button button-primary"
                        style={{ marginTop: 24 }}
                        onClick={() => { setRoute('modelProviders'); onAction?.(); }}
                    >
                        配置 API Key
                    </button>
                </div>
            );
        case 2:
            return (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>🤖</div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>创建第一个 Agent</h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                        注册你的 Agent 并配置能力描述。<br />
                        你可以为 Agent 指定 API 端点、Capabilities、版本信息。<br />
                        之后它就可以接收和执行任务。
                    </p>
                    <button
                        className="button button-primary"
                        style={{ marginTop: 24 }}
                        onClick={() => { setRoute('agents'); onAction?.(); }}
                    >
                        管理 Agent
                    </button>
                </div>
            );
        case 3:
            return (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>🏪</div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>发布到能力市场</h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                        将你的 Agent 能力发布到市场，<br />
                        让其他用户也可以使用和雇佣。<br />
                        你可以设定价格，获得收益。
                    </p>
                    <button
                        className="button button-primary"
                        style={{ marginTop: 24 }}
                        onClick={() => { setRoute('skills'); onAction?.(); }}
                    >
                        前往能力市场
                    </button>
                </div>
            );
        case 4:
            return (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 12 }}>开发环境就绪！</h2>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                        你的开发环境已配置完成。<br />
                        现在可以开始开发 Agent，发布到市场中。<br />
                        欢迎加入枢元开发者社区。
                    </p>
                </div>
            );
        default:
            return null;
    }
};

// ── 引导步骤容器 ──
const StepContainer: React.FC = () => {
    const identity = useOnboardingStore((s) => s.identity);
    const currentStep = useOnboardingStore((s) => s.currentStep);
    const nextStep = useOnboardingStore((s) => s.nextStep);
    const prevStep = useOnboardingStore((s) => s.prevStep);
    const skipOnboarding = useOnboardingStore((s) => s.skipOnboarding);
    const isLastStep = useOnboardingStore((s) => s.isLastStep());
    const progress = useOnboardingStore((s) => s.progress());
    const getSteps = useOnboardingStore((s) => s.getSteps);
    const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
    const setRoute = useAppStore((s) => s.setRoute);
    const unlockBadge = useUserLevelStore((s) => s.unlockBadge);

    const steps = getSteps();

    const handleNext = () => {
        if (isLastStep) {
            // 完成引导解锁徽章
            const badge = PRESET_BADGES.find((b) => b.id === 'badge-onboarding-done');
            if (badge) unlockBadge(badge);
            completeOnboarding();
            setRoute('dashboard');
            showToast('🎉 引导完成！获得「毕业了」徽章', 'success');
        } else {
            nextStep();
        }
    };

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px' }}>
            {/* 顶部跳过按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button
                    onClick={skipOnboarding}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: C.textLight, display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = `${C.border}60`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.textLight; e.currentTarget.style.background = 'none'; }}
                >
                    <SkipIcon /> 跳过所有引导，直接进入首页
                </button>
            </div>

            {/* 进度条 */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.textSecondary }}>
                        步骤 {currentStep + 1} / {steps.length}
                    </span>
                    <span style={{ fontSize: 12, color: C.textLight }}>{progress}%</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%', background: C.primary, borderRadius: 2,
                            width: `${progress}%`, transition: 'width 0.3s ease',
                        }}
                    />
                </div>
                {/* 步骤标签 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    {steps.map((s, idx) => (
                        <span
                            key={s.id}
                            style={{
                                fontSize: 11, color: idx <= currentStep ? C.primary : C.textLight,
                                fontWeight: idx === currentStep ? 600 : 400,
                                transition: 'color 0.2s', flex: 1, textAlign: 'center',
                            }}
                        >
                            {idx <= currentStep ? (
                                <Icon name="circle" size={8} color={C.primary} />
                            ) : (
                                <Icon name="circle" size={8} color={C.border} />
                            )} {s.title}
                        </span>
                    ))}
                </div>
            </div>

            {/* 步骤内容卡片 */}
            <div className="card" style={{ padding: 32, borderRadius: 16, background: C.cardBg }}>
                <StepContent stepId={currentStep} identity={identity} onAction={handleNext} />
            </div>

            {/* 底部导航 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, alignItems: 'center' }}>
                <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    style={{
                        padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.cardBg, cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                        fontSize: 14, color: currentStep === 0 ? C.textLight : C.textSecondary,
                        opacity: currentStep === 0 ? 0.5 : 1,
                    }}
                >
                    ← 上一步
                </button>

                <button
                    className="button button-primary"
                    onClick={handleNext}
                    style={{
                        padding: '10px 28px', borderRadius: 8, border: 'none',
                        background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {isLastStep ? '🎉 进入首页' : '下一步 →'}
                </button>
            </div>
        </div>
    );
};

// ── 主组件 ──
export const OnboardingWizard: React.FC = () => {
    const identity = useOnboardingStore((s) => s.identity);
    const completed = useOnboardingStore((s) => s.completed);

    // 如果已跳过或已完成，直接跳转到首页
    const setRoute = useAppStore((s) => s.setRoute);
    useEffect(() => {
        if (completed) {
            setRoute('dashboard');
        }
    }, [completed, setRoute]);

    // 未选择身份 -> 显示身份选择
    if (!identity) {
        return <IdentitySelection />;
    }

    // 已选择身份 -> 显示引导步骤
    return <StepContainer />;
};