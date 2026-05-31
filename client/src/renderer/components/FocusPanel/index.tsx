import React, { useEffect, useRef, useCallback } from 'react';
import type { Comment } from '@shared/types';

interface Props {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
    /** 当前聚焦的元素 ID（用于高亮） */
    focusedId?: string;
    /** 聚焦的评论上下文 */
    parents?: Comment[];
    target?: Comment | null;
    /** 子评论列表 */
    replyList?: Comment[];
    onReply?: (id: string, username?: string) => void;
}

export const FocusPanel: React.FC<Props> = ({
                                                visible, title, subtitle, onClose, children, footer, width = 380, focusedId,
                                                parents = [], target, replyList = [], onReply,
                                            }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<Element | null>(null);

    // 记录触发元素，关闭时回归焦点
    useEffect(() => {
        if (visible) {
            triggerRef.current = document.activeElement;
            // 自动聚焦面板内第一个可聚焦元素
            requestAnimationFrame(() => {
                if (panelRef.current) {
                    const first = panelRef.current.querySelector('button, [tabindex]:not([tabindex="-1"])') as HTMLElement;
                    first?.focus();
                }
            });
        }
    }, [visible]);

    // 全局 Escape 关闭时回归焦点
    const handleClose = useCallback(() => {
        onClose();
        requestAnimationFrame(() => {
            (triggerRef.current as HTMLElement)?.focus();
        });
    }, [onClose]);

    // 全局 Escape 关闭
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && visible) handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [visible, handleClose]);

    // J/K 键盘导航：在 replyList 中上下移动焦点
    useEffect(() => {
        if (!visible || !panelRef.current) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'j' || e.key === 'J') {
                const items = panelRef.current!.querySelectorAll('[data-focus-nav]');
                const active = document.activeElement;
                const idx = Array.from(items).indexOf(active!);
                if (idx < items.length - 1) (items[idx + 1] as HTMLElement).focus();
                e.preventDefault();
            }
            if (e.key === 'k' || e.key === 'K') {
                const items = panelRef.current!.querySelectorAll('[data-focus-nav]');
                const active = document.activeElement;
                const idx = Array.from(items).indexOf(active!);
                if (idx > 0) (items[idx - 1] as HTMLElement).focus();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [visible]);

    // 为聚焦卡片添加呼吸光效（通过 CSS 变量控制）
    useEffect(() => {
        if (!panelRef.current || !focusedId) return;
        const el = panelRef.current.querySelector(`[data-focus-id="${focusedId}"]`) as HTMLElement;
        if (el) {
            el.style.setProperty('--focus-pulse-color', 'var(--color-focus-border, #6C5CE7)');
            el.style.animation = 'focus-pulse 2s infinite';
            el.style.borderLeft = '3px solid var(--color-focus-border, #6C5CE7)';
            el.style.backgroundColor = 'var(--color-focus-bg, rgba(108,92,231,0.08))';
        }
    }, [focusedId, visible]);

    return (
        <div
            ref={panelRef}
            role="dialog"
            aria-label={title}
            aria-modal={visible}
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
                            onClick={handleClose}
                            aria-label="关闭面板"
                            style={{
                                background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
                                color: 'var(--color-ink-muted)', lineHeight: 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* 父评论链（上下文面包屑） */}
                    {parents.length > 0 && (
                        <div data-focus-nav tabIndex={0} style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-ink-muted)' }}>
                            {parents.map((p) => (
                                <div key={p.id} style={{ marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--color-border)' }}>
                                    <strong>{p.author?.username ?? '匿名'}</strong>：{p.body.slice(0, 60)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 内容区 */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                        {target ? (
                            <div data-focus-id={focusedId} style={{ marginBottom: 12, padding: 8, borderRadius: 6, backgroundColor: 'var(--color-canvas-subtle)' }}>
                                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 4 }}>
                                    <strong>{target.author?.username ?? '匿名'}</strong>
                                </div>
                                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{target.body}</div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-ink-muted)', fontSize: 13 }}>
                                该评论已被删除
                            </div>
                        )}

                        {/* 子回复列表 */}
                        {replyList.length > 0 && (
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                                    回复 ({replyList.length}) &mdash; 按 <kbd style={{ padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: 11 }}>J</kbd> <kbd style={{ padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: 11 }}>K</kbd> 导航
                                </div>
                                {replyList.map((r) => (
                                    <div key={r.id} data-focus-nav tabIndex={0} style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 4, backgroundColor: 'var(--color-canvas-subtle)', outline: 'none', transition: 'box-shadow 200ms', cursor: 'default' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginBottom: 2 }}>
                                            <strong>{r.author?.username ?? '匿名'}</strong>
                                        </div>
                                        <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{r.body}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 额外 children */}
                        {children}
                    </div>

                    {/* 回复按钮 */}
                    {target && onReply && (
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)' }}>
                            <button
                                onClick={() => onReply(target.id, target.author?.username)}
                                style={{
                                    fontSize: 12, background: 'none', border: '1px solid var(--color-border)',
                                    borderRadius: 4, padding: '4px 12px', cursor: 'pointer',
                                    color: 'var(--color-ink-muted)', transition: 'border-color 200ms',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-focus-border, #6C5CE7)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                            >
                                回复此评论
                            </button>
                        </div>
                    )}

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