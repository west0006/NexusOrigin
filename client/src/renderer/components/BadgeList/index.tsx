// client/src/renderer/components/BadgeList/index.tsx
import React from 'react';
import { useUserLevelStore, Badge } from '../../store/userLevel.store';

interface Props {
    max?: number;
    compact?: boolean;
}

export const BadgeList: React.FC<Props> = ({ max = 6, compact = false }) => {
    const badges: Badge[] = useUserLevelStore((s) => s.badges);

    const display = badges.length > max ? badges.slice(0, max) : badges;

    if (badges.length === 0) {
        return (
            <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', padding: '8px 0' }}>
                暂无徽章，积极参与社区活动解锁
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: compact ? 4 : 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {display.map((badge: Badge) => (
                <div
                    key={badge.id}
                    title={`${badge.name}: ${badge.description}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: compact ? '2px 6px' : '4px 8px',
                        borderRadius: 6,
                        backgroundColor: 'var(--color-canvas-subtle)',
                        fontSize: compact ? 11 : 12,
                        cursor: 'default',
                    }}
                >
                    <span
                        style={{
                            fontSize: compact ? 14 : 16,
                            lineHeight: 1,
                        }}
                    >
                        {badge.icon}
                    </span>
                    {!compact && <span>{badge.name}</span>}
                </div>
            ))}
            {badges.length > max && (
                <span style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                    +{badges.length - max}
                </span>
            )}
        </div>
    );
};