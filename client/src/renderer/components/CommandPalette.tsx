import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/app';
import { apiClient } from '../../api/client.api';

interface SearchResult {
    type: 'post' | 'agent' | 'capability';
    id: string;
    title: string;
    subtitle?: string;
    endpoint?: string;
}

export const CommandPalette: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [focusItem, setFocusItem] = useState<SearchResult | null>(null);
    const setRoute = useAppStore(s => s.setRoute);

    // Escape 关闭
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // Ctrl+K 打开
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener('keydown', down);
        return () => window.removeEventListener('keydown', down);
    }, []);

    // 搜索逻辑
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setFocusItem(null);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const [postsRes, agentsRes, capsRes] = await Promise.all([
                    apiClient<{ posts: any[] }>(`/posts?search=${encodeURIComponent(query)}`),
                    apiClient<{ agents: any[] }>('/agents?page=1&pageSize=10'),
                    apiClient<{ items: any[] }>(`/capabilities?search=${encodeURIComponent(query)}`),
                ]);

                const combined: SearchResult[] = [
                    ...(postsRes.posts || []).map((p: any) => ({
                        type: 'post' as const,
                        id: p.id,
                        title: p.title,
                        subtitle: p.author?.username || '匿名',
                    })),
                    ...(agentsRes.agents || []).map((a: any) => ({
                        type: 'agent' as const,
                        id: a.id,
                        title: a.name,
                        subtitle: a.status,
                        endpoint: a.endpoint,
                    })),
                    ...(capsRes.items || []).map((c: any) => ({
                        type: 'capability' as const,
                        id: c.id,
                        title: c.name,
                        subtitle: c.author?.username || '开源',
                    })),
                ];

                // 简单过滤标题匹配
                const filtered = combined.filter(item =>
                    item.title.toLowerCase().includes(query.toLowerCase())
                );
                setResults(filtered);
                setSelectedIndex(0);
                if (filtered.length > 0) setFocusItem(filtered[0]);
                else setFocusItem(null);
            } catch (e) {
                console.error(e);
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // 键盘导航
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIdx = Math.min(prev + 1, results.length - 1);
                setFocusItem(results[newIdx]);
                return newIdx;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIdx = Math.max(prev - 1, 0);
                setFocusItem(results[newIdx]);
                return newIdx;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusItem) handleSelect(focusItem);
        }
    };

    const handleSelect = (item: SearchResult) => {
        setOpen(false);
        setQuery('');
        if (item.type === 'post') {
            window.location.hash = `#/community?postId=${item.id}`;
            setRoute('community');
        } else if (item.type === 'agent') {
            setRoute('agents');
        } else if (item.type === 'capability') {
            setRoute('skills');
        }
    };

    if (!open) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '15vh',
                backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                style={{
                    width: 640,
                    maxHeight: '60vh',
                    backgroundColor: 'var(--color-canvas)',
                    borderRadius: 12,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                <input
                    className="input"
                    style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border)',
                        borderRadius: 0,
                        padding: '14px 20px',
                        fontSize: 'var(--text-body)',
                    }}
                    placeholder="搜索帖子、Agent、能力..."
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                    {/* 结果列表 */}
                    <div style={{ flex: 3, borderRight: results.length > 0 ? '1px solid var(--color-border)' : 'none' }}>
                        {results.length === 0 && query && (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                                没有找到相关结果
                            </div>
                        )}
                        {results.map((item, idx) => (
                            <div
                                key={`${item.type}-${item.id}`}
                                style={{
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    backgroundColor: idx === selectedIndex ? 'var(--color-primary-light)' : 'transparent',
                                    borderLeft: idx === selectedIndex ? '3px solid var(--color-primary)' : '3px solid transparent',
                                }}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => {
                                    setSelectedIndex(idx);
                                    setFocusItem(item);
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.type.toUpperCase()}</span>
                                    <span>{item.subtitle}</span>
                                </div>
                            </div>
                        ))}
                        {!query && (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                                输入关键词开始搜索...
                            </div>
                        )}
                    </div>

                    {/* 预览面板 */}
                    {focusItem && (
                        <div style={{ flex: 2, padding: 16 }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>{focusItem.title}</div>
                            <div style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>
                                {focusItem.type === 'agent' && `端点: ${focusItem.endpoint}`}
                                {focusItem.type === 'post' && '双击或 Enter 打开帖子详情'}
                                {focusItem.type === 'capability' && '进入市场查看详情'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};