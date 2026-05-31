// ── client/src/renderer/components/GlobalCommandPalette/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Command {
    id: string;
    label: string;
    description?: string;
    category: string;
    shortcut?: string;
    action: () => void;
}

interface Props {
    commands?: Command[];
}

const DEFAULT_COMMANDS: Command[] = [
    { id: 'new-post', label: '发布帖子', description: '在社区发布新帖子', category: '社区', action: () => {} },
    { id: 'new-task', label: '发布任务', description: '在任务市场发布新任务', category: '任务', action: () => {} },
    { id: 'view-costs', label: '查看成本', description: '打开成本监控面板', category: '监控', action: () => {} },
    { id: 'switch-dark', label: '切换暗色模式', description: '切换主题模式', category: '系统', action: () => {} },
];

export const GlobalCommandPalette: React.FC<Props> = ({ commands = DEFAULT_COMMANDS }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // 全局快捷键 Ctrl+K / Cmd+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // 打开时聚焦输入框
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => inputRef.current?.focus());
            setQuery('');
            setSelectedIdx(0);
        }
    }, [open]);

    const filtered = query
        ? commands.filter((c) =>
            c.label.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
        )
        : commands;

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[selectedIdx]) {
                    filtered[selectedIdx].action();
                    setOpen(false);
                }
            }
        },
        [filtered, selectedIdx]
    );

    // 分类分组
    const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        (acc[cmd.category] ??= []).push(cmd);
        return acc;
    }, {});

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', justifyContent: 'center', paddingTop: '15vh',
                backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                style={{
                    width: 520, maxHeight: 400, overflow: 'hidden',
                    backgroundColor: 'var(--color-canvas, #fff)',
                    borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
                    onKeyDown={handleKeyDown}
                    placeholder="输入命令或搜索..."
                    style={{
                        padding: '12px 16px', fontSize: 15, border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        outline: 'none', backgroundColor: 'transparent',
                        color: 'var(--color-ink)',
                    }}
                />
                <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                    {Object.entries(grouped).map(([category, items]) => (
                        <div key={category}>
                            <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {category}
                            </div>
                            {items.map((cmd, idx) => {
                                const globalIdx = filtered.indexOf(cmd);
                                return (
                                    <div
                                        key={cmd.id}
                                        onClick={() => { cmd.action(); setOpen(false); }}
                                        style={{
                                            padding: '8px 16px', cursor: 'pointer',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            backgroundColor: globalIdx === selectedIdx ? 'var(--color-canvas-subtle, #f0f0f0)' : 'transparent',
                                            transition: 'background-color 100ms',
                                        }}
                                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                                    >
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 500 }}>{cmd.label}</div>
                                            {cmd.description && (
                                                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{cmd.description}</div>
                                            )}
                                        </div>
                                        {cmd.shortcut && (
                                            <kbd style={{ fontSize: 11, padding: '2px 6px', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-ink-muted)' }}>
                                                {cmd.shortcut}
                                            </kbd>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: 13 }}>
                            未找到匹配的命令
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};