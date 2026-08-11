// client/src/renderer/components/AchievementToast/index.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useUserLevelStore, Badge } from '../../store/userLevel.store';

const C = {
    primary: '#6C5CE7',
    success: '#00B894',
    warning: '#FDCB6E',
    text: '#1A202C',
    textSecondary: '#718096',
    cardBg: '#FFFFFF',
};

interface ToastItem {
    id: number;
    type: 'badge' | 'quest' | 'levelup';
    title: string;
    description: string;
    icon: string;
}

let globalAchievement: (toast: Omit<ToastItem, 'id'>) => void;

export const showAchievement = (toast: Omit<ToastItem, 'id'>) => {
    if (globalAchievement) globalAchievement(toast);
};

export const AchievementToastContainer: React.FC = () => {
    const [queue, setQueue] = useState<ToastItem[]>([]);
    const [current, setCurrent] = useState<ToastItem | null>(null);
    const counterRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    globalAchievement = useCallback((toast) => {
        const id = ++counterRef.current;
        setQueue((prev) => [...prev, { ...toast, id }]);
    }, []);

    // 逐个播放队列
    useEffect(() => {
        if (current || queue.length === 0) return;
        const next = queue[0];
        setCurrent(next);
        setQueue((prev) => prev.slice(1));

        timerRef.current = setTimeout(() => {
            setCurrent(null);
        }, 4000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [current, queue]);

    // 监听徽章解锁和等级提升
    const prevBadgesRef = useRef<Badge[]>([]);
    const prevLevelRef = useRef(1);

    useEffect(() => {
        const unsub = useUserLevelStore.subscribe((state, prevState) => {
            // 检测新徽章
            if (state.badges.length > prevState.badges.length) {
                const newBadge = state.badges.find(
                    (b) => !prevState.badges.some((pb) => pb.id === b.id),
                );
                if (newBadge) {
                    showAchievement({
                        type: 'badge',
                        title: `🏆 解锁徽章：${newBadge.name}`,
                        description: newBadge.description,
                        icon: newBadge.icon,
                    });
                }
            }
            // 检测等级提升
            if (state.level > prevState.level) {
                showAchievement({
                    type: 'levelup',
                    title: `🎉 升级！Lv.${state.level} ${state.title}`,
                    description: `恭喜升到 ${state.level} 级！继续加油`,
                    icon: '⭐',
                });
            }
        });
        return unsub;
    }, []);

    if (!current) return null;

    const bgColor = current.type === 'badge'
        ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)'
        : current.type === 'levelup'
            ? 'linear-gradient(135deg, #00B894, #55EFC4)'
            : 'linear-gradient(135deg, #FDCB6E, #F39C12)';

    return (
        <div
            style={{
                position: 'fixed', bottom: 32, right: 32, zIndex: 10000,
                animation: 'slideInUp 0.3s ease, fadeOut 0.3s 3.7s ease',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                cursor: 'pointer',
            }}
            onClick={() => setCurrent(null)}
        >
            <div style={{
                background: bgColor, padding: '16px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                minWidth: 320, maxWidth: 420,
            }}>
                <div style={{
                    fontSize: 36, lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}>
                    {current.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 14, fontWeight: 700, color: '#fff',
                        marginBottom: 4, textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}>
                        {current.title}
                    </div>
                    <div style={{
                        fontSize: 12, color: 'rgba(255,255,255,0.85)',
                        lineHeight: 1.4,
                    }}>
                        {current.description}
                    </div>
                </div>
            </div>
        </div>
    );
};