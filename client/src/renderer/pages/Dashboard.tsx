// ── client/src/renderer/pages/Dashboard.tsx (完整版)
import React, { useEffect, useState, useCallback } from 'react';
import { useUserStore } from '../store/user.store';
import { tokenAPI, TokenUsage, BudgetInfo } from '../api/token';

export const Dashboard: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [usages, setUsages] = useState<TokenUsage[]>([]);
    const [budget, setBudget] = useState<BudgetInfo | null>(null);
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [totalCost, setTotalCost] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await tokenAPI.getUsageByPeriod(user.id, period);
            if (Array.isArray(data?.data)) {
                setUsages(data.data.map((d:any) => ({
                    ...d,
                    userId: user.id,
                    modelName: '-',
                    inputTokens: d.tokens || 0,
                    outputTokens: 0,
                    costUsd: d.cost || 0,
                    createdAt: d.date || new Date().toISOString(),
                })));
                const cost = data.data.reduce((sum:any, d:any) => sum + (d.cost || 0), 0);
                const tok = data.data.reduce((sum:any, d:any) => sum + (d.tokens || 0), 0);
                setTotalCost(cost);
                setTotalTokens(tok);
            }
        } catch(e) {}
    }, [user, period]);

    const fetchBudget = useCallback(async () => {
        if (!user) return;
        try {
            const b = await tokenAPI.getBudget(user.id);
            setBudget(b);
        } catch(e) {}
    }, [user]);

    useEffect(() => {
        fetchData();
        fetchBudget();
        const timer = setInterval(fetchData, 10000); // 10秒刷新
        return () => clearInterval(timer);
    }, [fetchData, fetchBudget]);

    const budgetUsage = budget?.usageRate ?? 0;

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>仪表盘</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['day','week','month'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                                className={`button ${period===p?'button-primary':''}`}>
                            {{day:'今日',week:'本周',month:'本月'}[p]}
                        </button>
                    ))}
                </div>
            </div>

            {budget && budgetUsage >= 80 && (
                <div style={{ padding: '12px 16px', background: 'var(--color-warning-bg)', borderLeft: '4px solid var(--color-warning)', marginBottom: 16, borderRadius: 'var(--radius-sm)' }}>
                    预算已使用 {budgetUsage.toFixed(1)}%，建议关注Token消耗
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Token 消耗</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{totalTokens.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>费用 (USD)</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>${totalCost.toFixed(4)}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>预算使用率</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: budgetUsage > 90 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                        {budgetUsage.toFixed(1)}%
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>活跃模型</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>GPT-4o-mini</div>
                </div>
            </div>

            {/* 简单趋势图（纯CSS） */}
            <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12 }}>消耗趋势</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 4 }}>
                    {usages.slice(-14).map((u, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--color-ink-muted)' }}>${u.costUsd.toFixed(2)}</div>
                            <div style={{ width: '100%', height: `${Math.min(100, u.costUsd * 20)}%`, background: 'var(--color-primary)', borderRadius: '2px 2px 0 0', marginTop: 2 }} />
                            <div style={{ fontSize: 8, marginTop: 2, color: 'var(--color-ink-subtle)' }}>
                                {new Date(u.createdAt).toLocaleDateString('zh', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    ))}
                    {usages.length === 0 && <div style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>暂无数据</div>}
                </div>
            </div>
        </div>
    );
};