import React, { useEffect, useRef } from 'react';

interface Props {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
    /** 当前聚焦的元素 ID（用于高亮） */
    focusedId?: string;
}

export const FocusPanel: React.FC<Props> = ({
                                                visible, title, subtitle, onClose, children, footer, width = 380, focusedId,
                                            }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    // 全局 Escape 关闭
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && visible) onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [visible, onClose]);

    // 为聚焦面板内部的当前聚焦卡片添加呼吸光效（通过 CSS 变量控制）
    useEffect(() => {
        if (!panelRef.current || !focusedId) return;
        const el = panelRef.current.querySelector(`[data-focus-id="${focusedId}"]`) as HTMLElement;
        if (el) {
            el.style.animation = 'focus-pulse 2s infinite';
            el.style.borderLeft = '3px solid var(--color-focus-border)';
            el.style.backgroundColor = 'var(--color-focus-bg)';
        }
    }, [focusedId, visible]);

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
                    {/* 头部 */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
                            {subtitle && <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{subtitle}</div>}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                                color: 'var(--color-ink-muted)', lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 内容区，使用 ContextTimeline 包裹 */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                        {children}
                    </div>

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