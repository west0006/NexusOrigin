// ── AssistantPanel：Ctrl+K 全局命令面板
// 极简扁平风格，统一使用 C token

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { C } from '../../styles/theme';
import { useAppStore } from '../../store/app';
import { useAssistantStore } from '../../store/assistant.store';
import { COMMANDS } from './assistant-prompt';
import { detectIntent } from './intent-detector';
import { getClarifyTemplate } from './clarify-templates';
import { collectPageContext, formatContextForLLM } from './context-collector';

interface Suggestion {
    id: string;
    label: string;
    description?: string;
    category: string;
    action: () => void;
    shortcut?: string;
}

const AssistantPanel: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const setRoute = useAppStore((s) => s.setRoute);
    const currentRoute = useAppStore((s) => s.currentRoute);
    const { setInput: setAssistantInput } = useAssistantStore();

    // 全局快捷键 Ctrl+K
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

    useEffect(() => {
        if (!open) return;
        requestAnimationFrame(() => inputRef.current?.focus());
        setQuery('');
        setSelectedIdx(0);
    }, [open]);

    // 建议列表
    const suggestions: Suggestion[] = useMemo(() => {
        const list: Suggestion[] = [
            {
                id: 'smart-general',
                label: '💬 打开平台助理',
                description: '与 AI 助手对话',
                category: '智能建议',
                action: () => { setRoute('assistant'); setOpen(false); },
            },
        ];

        if (currentRoute === 'collaborationLab') {
            list.unshift({
                id: 'smart-collab',
                label: '📝 帮我写一份分析报告',
                description: '基于当前上下文',
                category: '智能建议',
                action: () => {
                    const ctx = formatContextForLLM(collectPageContext(currentRoute));
                    setAssistantInput(`帮我写一份分析报告\n\n背景：${ctx}`);
                    setRoute('assistant');
                    setOpen(false);
                },
            });
        } else if (currentRoute === 'agents' || currentRoute === 'deployment') {
            list.unshift({
                id: 'smart-agent',
                label: '🔧 部署一个新的 Agent',
                description: '跳转到部署向导',
                category: '智能建议',
                action: () => { setRoute('deployment'); setOpen(false); },
            });
        } else if (currentRoute === 'costCenter') {
            list.unshift({
                id: 'smart-cost',
                label: '💰 分析 Token 消耗',
                description: '深入了解成本',
                category: '智能建议',
                action: () => {
                    setAssistantInput('帮我分析一下当前的 Token 消耗情况');
                    setRoute('assistant');
                    setOpen(false);
                },
            });
        }

        COMMANDS.forEach((c) => {
            list.push({
                id: `cmd-${c.cmd}`,
                label: c.label,
                description: `输入 ${c.cmd} 快速操作`,
                category: '常用命令',
                action: () => {
                    setAssistantInput(c.cmd + ' ');
                    setRoute('assistant');
                    setOpen(false);
                },
                shortcut: c.cmd,
            });
        });

        return list;
    }, [currentRoute, setAssistantInput, setRoute]);

    // 过滤 + 分组
    const { filteredItems, groups } = useMemo(() => {
        if (!query.trim()) {
            const g = new Map<string, Suggestion[]>();
            suggestions.forEach((s) => { if (!g.has(s.category)) g.set(s.category, []); g.get(s.category)!.push(s); });
            return { filteredItems: suggestions, groups: g };
        }
        const q = query.toLowerCase();
        const filtered = suggestions.filter(
            (s) => s.label.toLowerCase().includes(q) || s.shortcut?.toLowerCase().includes(q),
        );
        const intent = detectIntent(query);
        if (intent !== 'unknown') {
            const t = getClarifyTemplate(intent);
            if (t) {
                filtered.unshift({
                    id: `clarify-${intent}`,
                    label: `${t.title}：${query}`,
                    description: t.description,
                    category: '⏎ 回车确认',
                    action: () => {
                        setAssistantInput(query);
                        setRoute('assistant');
                        setOpen(false);
                    },
                });
            }
        }
        const g = new Map<string, Suggestion[]>();
        filtered.forEach((s) => { if (!g.has(s.category)) g.set(s.category, []); g.get(s.category)!.push(s); });
        return { filteredItems: filtered, groups: g };
    }, [query, suggestions, setAssistantInput, setRoute]);

    const allItems = filteredItems;
    useEffect(() => {
        if (selectedIdx >= allItems.length) setSelectedIdx(Math.max(0, allItems.length - 1));
    }, [allItems.length, selectedIdx]);

    const executeSelected = useCallback(() => {
        allItems[selectedIdx]?.action();
        setOpen(false);
    }, [allItems, selectedIdx]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown': e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, allItems.length - 1)); break;
                case 'ArrowUp': e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, 0)); break;
                case 'Enter': e.preventDefault(); executeSelected(); break;
                case 'Escape': setOpen(false); break;
            }
        },
        [allItems.length, executeSelected],
    );

    useEffect(() => {
        const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx]);

    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', justifyContent: 'center', paddingTop: '15vh',
            background: 'rgba(0,0,0,0.35)',
        }} onClick={() => setOpen(false)}>
            <div style={{
                width: 580, maxWidth: '90vw', maxHeight: '60vh',
                background: C.cardBg, borderRadius: C.radiusLg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }} onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    style={{
                        width: '100%', padding: '12px 16px', fontSize: C.textBody,
                        border: 'none', outline: 'none',
                        background: 'transparent', color: C.text,
                        borderBottom: `1px solid ${C.border}`,
                    }}
                    placeholder="输入命令或自然语言描述…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
                    onKeyDown={handleKeyDown}
                />
                <div ref={listRef} style={{ overflow: 'auto', flex: 1 }}>
                    {[...groups.entries()].map(([category, items]) => (
                        <div key={category}>
                            <div style={{
                                padding: '6px 16px', fontSize: C.textCaption, fontWeight: 600,
                                color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1,
                            }}>
                                {category}
                            </div>
                            {items.map((item) => {
                                const globalIdx = allItems.indexOf(item);
                                const active = globalIdx === selectedIdx;
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 16px', cursor: 'pointer', fontSize: C.textBodySm,
                                            color: C.text, background: active ? C.primaryLight : 'transparent',
                                            transition: 'background 0.15s',
                                        }}
                                        onClick={() => { item.action(); setOpen(false); }}
                                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                                    >
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {item.shortcut && (
                                            <span style={{
                                                fontSize: C.textCaption, color: C.textSecondary,
                                                background: C.bg, padding: '1px 6px', borderRadius: C.radiusSm,
                                            }}>
                        {item.shortcut}
                      </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AssistantPanel;