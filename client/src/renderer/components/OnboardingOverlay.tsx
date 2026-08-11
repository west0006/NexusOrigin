// client/src/renderer/components/OnboardingOverlay/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOnboardingStore } from '../../store/onboarding.store';
import { useAppStore } from '../../store/app';
import { useUserLevelStore, PRESET_BADGES } from '../../store/userLevel.store';
import { showToast } from '../Toast';

const C = {
    primary: '#6C5CE7',
    primaryLight: '#A29BFE',
    success: '#00B894',
    text: '#1A202C',
    textSecondary: '#718096',
    textLight: '#A0AEC0',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
};

const CloseIcon: React.FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

interface TipItem {
    id: string;
    icon: string;
    title: string;
    description: string;
    route?: string;
    action?: () => void;
}

// 普通用户的首页引导提示
const USER_TIPS: TipItem[] = [
    { id: 'tip-deploy', icon: '🚀', title: '一键部署框架', description: '选择一个框架，点击即部署，无需任何配置', route: 'deployment' },
    { id: 'tip-cost', icon: '📊', title: '监控成本', description: '实时追踪 AI 调用费用，掌握预算', route: 'costCenter' },
    { id: 'tip-community', icon: '💬', title: '探索社区', description: '看看其他用户都在做什么', route: 'community' },
    { id: 'tip-market', icon: '🏪', title: '能力市场', description: '发现好用的 Agent 能力', route: 'skills' },
];

// 开发者的首页引导提示
const DEVELOPER_TIPS: TipItem[] = [
    { id: 'tip-apikey', icon: '🔑', title: '配置 API Key', description: '连接你的模型供应商，开始开发', route: 'modelProviders' },
    { id: 'tip-agent', icon: '🤖', title: '创建 Agent', description: '注册并配置你的第一个 Agent', route: 'agents' },
    { id: 'tip-publish', icon: '🏪', title: '发布到市场', description: '将 Agent 能力上架供他人使用', route: 'skills' },
    { id: 'tip-deploy', icon: '🚀', title: '部署框架', description: '在本地或云端部署 Agent 框架', route: 'deployment' },
];

export const OnboardingOverlay: React.FC = () => {
    const identity = useOnboardingStore((s) => s.identity);
    const completed = useOnboardingStore((s) => s.completed);
    const skipped = useOnboardingStore((s) => s.skipped);
    const dismissedAt = useOnboardingStore((s) => s.dismissedAt);
    const dismissOverlay = useOnboardingStore((s) => s.dismissOverlay);
    const skipOnboarding = useOnboardingStore((s) => s.skipOnboarding);
    const setRoute = useAppStore((s) => s.setRoute);
    const unlockBadge = useUserLevelStore((s) => s.unlockBadge);

    const [visible, setVisible] = useState(false);
    const [currentTip, setCurrentTip] = useState(0);
    const [closing, setClosing] = useState(false);

    const tips = identity === 'developer' ? DEVELOPER_TIPS : USER_TIPS;

    // 显示条件：引导已完成/已跳过，且浮层未被关闭过
    useEffect(() => {
        if (completed && !dismissedAt) {
            // 延迟 1 秒后显示
            const timer = setTimeout(() => setVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [completed, dismissedAt]);

    const handleClose = useCallback(() => {
        setClosing(true);
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
            dismissOverlay();
        }, 200);
    }, [dismissOverlay]);

    const handleSkipAll = useCallback(() => {
        skipOnboarding();
        setClosing(true);
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
        }, 200);
        showToast('已跳过所有引导');
    }, [skipOnboarding]);

    const handleTipAction = useCallback((tip: TipItem) => {
        if (tip.route) {
            setRoute(tip.route as any);
        }
        tip.action?.();
        handleClose();
    }, [setRoute, handleClose]);

    const handlePrev = useCallback(() => {
        setCurrentTip((prev) => (prev > 0 ? prev - 1 : tips.length - 1));
    }, [tips.length]);

    const handleNext = useCallback(() => {
        if (currentTip < tips.length - 1) {
            setCurrentTip((prev) => prev + 1);
        } else {
            handleClose();
        }
    }, [currentTip, tips.length, handleClose]);

    if (!visible) return null;

    const tip = tips[currentTip];

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: closing ? 'fadeOut 0.2s' : 'fadeIn 0.3s',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                style={{
                    position: 'relative',
                    width: 400, maxWidth: '90vw',
                    background: C.cardBg, borderRadius: 20,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    padding: 32,
                    animation: closing ? 'slideOut 0.2s' : 'slideIn 0.3s',
                }}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: C.textLight, padding: 4, borderRadius: 4,
                        display: 'flex',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = `${C.border}60`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.textLight; e.currentTarget.style.background = 'none'; }}
                >
                    <CloseIcon />
                </button>

                {/* 内容 */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>{tip.icon}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>{tip.title}</h3>
                    <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>
                        {tip.description}
                    </p>
                </div>

                {/* 操作按钮 */}
                <button
                    className="button button-primary"
                    onClick={() => handleTipAction(tip)}
                    style={{
                        width: '100%', padding: '12px', borderRadius: 10,
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        marginBottom: 12,
                    }}
                >
                    {tip.route ? '去看看 →' : '知道了'}
                </button>

                {/* 分页指示器 + 跳过 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {tips.map((_, idx) => (
                            <div
                                key={idx}
                                style={{
                                    width: idx === currentTip ? 20 : 8, height: 8,
                                    borderRadius: 4,
                                    background: idx === currentTip ? C.primary : C.border,
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setCurrentTip(idx)}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={handlePrev}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 13, color: C.textLight, padding: '4px 8px', borderRadius: 4,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.textSecondary; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.textLight; }}
                        >
                            ← 上一条
                        </button>
                        {currentTip < tips.length - 1 ? (
                            <button
                                onClick={handleNext}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 13, color: C.primary, fontWeight: 600,
                                    padding: '4px 8px', borderRadius: 4,
                                }}
                            >
                                下一条 →
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 13, color: C.success, fontWeight: 600,
                                    padding: '4px 8px', borderRadius: 4,
                                }}
                            >
                                开始使用 ✓
                            </button>
                        )}
                    </div>
                </div>

                {/* 底部跳过所有 */}
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button
                        onClick={handleSkipAll}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, color: C.textLight, padding: '6px 12px', borderRadius: 6,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = C.textSecondary; e.currentTarget.style.background = `${C.border}60`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = C.textLight; e.currentTarget.style.background = 'none'; }}
                    >
                        跳过所有引导提示
                    </button>
                </div>
            </div>
        </div>
    );
};