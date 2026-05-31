// ── client/src/renderer/components/UserLevelBadge/index.tsx
import React from 'react';
import { useUserLevelStore } from '../../store/userLevel.store';

interface Props {
    userId?: string;
    size?: 'sm' | 'md' | 'lg';
    showExp?: boolean;
}

const SIZE_MAP = {
    sm: { badge: 20, fontSize: 10, barHeight: 3, barWidth: 60 },
    md: { badge: 28, fontSize: 12, barHeight: 4, barWidth: 80 },
    lg: { badge: 36, fontSize: 14, barHeight: 6, barWidth: 100 },
};

export const UserLevelBadge: React.FC<Props> = ({ size = 'sm', showExp = false }) => {
    const level = useUserLevelStore((s: { level: any; }) => s.level);
    const title = useUserLevelStore((s: { title: any; }) => s.title);
    const exp = useUserLevelStore((s) => s.exp);
    const expToNext = useUserLevelStore((s) => s.expToNext);

    const dims = SIZE_MAP[size];
    const progress = expToNext > 0
        ? Math.min(100, (exp / (exp + expToNext)) * 100)
        : 100;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div
                title={`Lv.${level} ${title}`}
                style={{
                    width: dims.badge,
                    height: dims.badge,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-focus-border, #6C5CE7)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: dims.fontSize,
                    fontWeight: 700,
                    flexShrink: 0,
                }}
            >
                {level}
            </div>
            {showExp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', lineHeight: 1 }}>
                        {title} · Lv.{level}
                    </div>
                    <div
                        style={{
                            width: dims.barWidth,
                            height: dims.barHeight,
                            borderRadius: dims.barHeight / 2,
                            backgroundColor: 'var(--color-canvas-subtle)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${progress}%`,
                                height: '100%',
                                borderRadius: dims.barHeight / 2,
                                background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)',
                                transition: 'width 300ms ease',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};