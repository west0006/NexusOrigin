import React, { useEffect, useRef } from 'react';

interface Props {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
}

export const FocusPanel: React.FC<Props> = ({
                                                visible,
                                                title,
                                                subtitle,
                                                onClose,
                                                children,
                                                footer,
                                                width = 380,
                                            }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && visible) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [visible, onClose]);

    return (
        <div
            ref={panelRef}
            style={{
                position: 'relative',
                width: visible ? width : 0,
                overflow: 'hidden',
                transition: 'width 300ms cubic-bezier(0.16,1,0.3,1)',
                borderLeft: visible ? '1px solid var(--color-border)' : 'none',
                backgroundColor: 'var(--color-canvas)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
            }}
        >
            {visible && (
                <>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
                            {subtitle && <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{subtitle}</div>}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: 18,
                                cursor: 'pointer',
                                color: 'var(--color-ink-muted)',
                                lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>{children}</div>
                    {footer && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
                            {footer}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};