// client/src/renderer/components/FocusButton/index.tsx
import React, { useCallback } from 'react';

interface Props {
    onClick: (e: React.MouseEvent) => void;
    title?: string;
    style?: React.CSSProperties;
}

export const FocusButton: React.FC<Props> = ({ onClick, title = '聚焦查看', style }) => {
    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.color = 'var(--color-primary)';
    }, []);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.color = 'var(--color-ink-muted)';
    }, []);

    return (
        <button
            onClick={onClick}
            title={title}
            aria-label={title}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--color-ink-muted)',
                transition: 'color 0.15s, background 0.15s',
                ...style,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
        </button>
    );
};