// client/src/renderer/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { useUserStore } from '../store/user.store';
import { tokenAPI, TokenUsage, BudgetInfo } from '../api/token';
import { userAPI } from '../api/user';
import { FocusPanel } from '../components/FocusPanel';
import { showToast } from '../components/Toast';

const COLORS = {
    primary: '#6C5CE7',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E17055',
    info: '#74B9FF',
};

const mockTrend = [
    { date: '00:00', cost: 0.12 },
    { date: '04:00', cost: 0.08 },
    { date: '08:00', cost: 0.45 },
    { date: '12:00', cost: 1.20 },
    { date: '16:00', cost: 2.30 },
    { date: '20:00', cost: 1.80 },
    { date: '23:59', cost: 0.95 },
];

export const Dashboard: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [usages, setUsages] = useState<TokenUsage[]>([]);
    const [budget, setBudget] = useState<BudgetInfo | null>(null);
    const [credits, setCredits] = useState<number>(0);
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [totalCost, setTotalCost] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);

    const [focusPanelVisible, setFocusPanelVisible] = useState(false);
    const [focusPanelTitle, setFocusPanelTitle] = useState('');
    const [focusContent, setFocusContent] = useState<React.ReactNode>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const data = await tokenAPI.getUsageByPeriod(user.id, period);
            if (Array.isArray(data?.data)) {
                const formatted = data.data.map((d: any) => ({
                    id: d.date,
                    userId: user.id,
                    modelName: '-',
                    inputTokens: d.tokens ?? 0,
                    outputTokens: 0,
                    costUsd: d.cost ?? 0,
                    createdAt: d.date,
                }));
                setUsages(formatted);
                const cost = formatted.reduce((sum: number, d: any) => sum + d.costUsd, 0);
                const tok = formatted.reduce((sum: number, d: any) => sum + d.inputTokens + d.outputTokens, 0);
                setTotalCost(cost);
                setTotalTokens(tok);
            }
        } catch (e) {
            console.error(e);
        }
    }, [user, period]);

    const fetchBudget = useCallback(async () => {
        if (!user) return;
        try {
            const b = await tokenAPI.getBudget(user.id);
            setBudget(b);
        } catch (e) {}
    }, [user]);

    const fetchCredits = useCallback(async () => {
        if (!user) return;
        try {
            const res = await userAPI.getBalance();
            setCredits(res.credits);
        } catch (e) {}
    }, [user]);

    useEffect(() => {
        fetchData();
        fetchBudget();
        fetchCredits();
        const timer = setInterval(fetchData, 15000);
        return () => clearInterval(timer);
    }, [fetchData, fetchBudget, fetchCredits]);

    const handleSpikeFocus = (date: string) => {
        setFocusPanelTitle('消耗溯源');
        setFocusContent(
            <div>
                <p style={{ marginBottom: 16 }}>
                    时段 <strong>{date}</strong> 出现异常消耗尖峰，总花费{' '}
                    <strong style={{ color: COLORS.error }}>$2.30</strong>，较均值增长 180%。
                </p>
                <div style={{
                    background: '#1E1E1E', color: '#0f0', padding: 12,
                    borderRadius: 6, fontFamily: 'var(--font-family-mono)', fontSize: 12,
                }}>
                    <div>🟢 12:05 | task: "market-report-gen" | cost: $1.20</div>
                    <div>🟢 12:12 | task: "competitor-analysis" | cost: $0.80</div>
                    <div>
                        🔴 12:20 | task: "thursday-newsletter" | cost: $0.30{' '}
                        <span style={{ color: '#f00' }}>← 检测到重复查询</span>
                    </div>
                </div>
                <button
                    className="button button-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => showToast('已启用语义缓存（模拟）', 'success')}
                >
                    一键启用优化
                </button>
            </div>
        );
        setFocusPanelVisible(true);
    };

    const handleCostFocus = () => {
        setFocusPanelTitle('成本明细');
        setFocusContent(
            <div>
                {usages.slice(0, 10).map((u, i) => (
                    <div key={i} style={{
                        padding: '8px 0', borderBottom: '1px solid var(--color-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 13,
                    }}>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: 11, flex: 2 }}>
                            {new Date(u.createdAt).toLocaleString()}
                        </span>
                        <span style={{ flex: 1, textAlign: 'right' }}>{u.modelName}</span>
                        <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-family-mono)' }}>
                            {u.inputTokens + u.outputTokens} tok
                        </span>
                        <span style={{ flex: 1, textAlign: 'right', color: 'var(--color-error)', fontWeight: 600 }}>
                            ${u.costUsd.toFixed(4)}
                        </span>
                        {u.skillId && (
                            <span style={{
                                background: 'var(--color-surface-1)', padding: '0 4px',
                                borderRadius: 4, fontSize: 10, marginLeft: 8, cursor: 'pointer',
                            }}>
                                {u.skillId}
                            </span>
                        )}
                    </div>
                ))}
                {usages.length === 0 && (
                    <p style={{ color: 'var(--color-ink-muted)', textAlign: 'center', padding: 20 }}>
                        暂无详细记录
                    </p>
                )}
            </div>
        );
        setFocusPanelVisible(true);
    };

    const budgetUsage = budget?.usageRate ?? 0;
    const todayCost = totalCost;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* 头部 */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
            }}>
                <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>仪表盘</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['day', 'week', 'month'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`button ${period === p ? 'button-primary' : ''}`}
                        >
                            {{ day: '今日', week: '本周', month: '本月' }[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* 预算告警 */}
            {budget && budgetUsage >= 80 && (
                <div style={{
                    padding: '12px 16px',
                    background: budgetUsage >= 95 ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                    borderLeft: `4px solid ${budgetUsage >= 95 ? 'var(--color-error)' : 'var(--color-warning)'}`,
                    marginBottom: 16,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                }}>
                    <strong>预算使用已达 {budgetUsage.toFixed(1)}%</strong>
                    {budgetUsage >= 95
                        ? '，当月预算即将耗尽！请调整预算或暂停非必要任务。'
                        : '，建议关注 Token 消耗。'}
                </div>
            )}

            {/* 成本总览卡片组 */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16, marginBottom: 24,
            }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                        今日花费 (USD)
                    </div>
                    <div style={{
                        fontSize: 24, fontWeight: 600,
                        color: todayCost > 0 ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                    }}>
                        {todayCost > 0 ? `$${todayCost.toFixed(4)}` : '—'}
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                        剩余预算 (本月)
                    </div>
                    <div style={{
                        fontSize: 24, fontWeight: 600,
                        color: budget && budget.remaining > 0 ? 'var(--color-ink)' : 'var(--color-error)',
                    }}>
                        {budget ? `$${budget.remaining.toFixed(2)}` : '未设置'}
                    </div>
                    {budget && (
                        <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 4 }}>
                            总预算: ${budget.budget.toFixed(2)}
                        </div>
                    )}
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                        Token 消耗
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>
                        {totalTokens.toLocaleString()}
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                        信用点余额
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-primary)' }}>
                        {credits.toFixed(0)} <span style={{ fontSize: 14, fontWeight: 400 }}>点</span>
                    </div>
                </div>
            </div>

            {/* 趋势图区域 */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24,
            }}>
                {/* 面积图 */}
                <div
                    className="card"
                    style={{ padding: 16, cursor: 'pointer' }}
                    onClick={() => handleSpikeFocus('12:00')}
                >
                    <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 'var(--text-body)' }}>
                        消耗趋势（点击尖峰聚焦）
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={mockTrend}>
                            <defs>
                                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="date" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip />
                            <Area
                                type="monotone" dataKey="cost"
                                stroke={COLORS.primary} fill="url(#colorCost)" strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 预算环形图 */}
                <div className="card" style={{ padding: 16 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 'var(--text-body)' }}>
                        预算健康度
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: '已用', value: budgetUsage },
                                    { name: '剩余', value: Math.max(0, 100 - budgetUsage) },
                                ]}
                                cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                                dataKey="value" startAngle={90} endAngle={-270}
                            >
                                <Cell fill={budgetUsage > 80 ? COLORS.error : COLORS.primary} />
                                <Cell fill="#f0f0f0" />
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                        textAlign: 'center', marginTop: -20, fontSize: 14,
                        color: 'var(--color-ink-muted)',
                    }}>
                        {budget
                            ? `已用 $${budget.used.toFixed(2)} / 预算 $${budget.budget.toFixed(2)}`
                            : '未设置预算'}
                    </div>
                </div>
            </div>

            {/* 最近消耗记录 */}
            <div className="card" style={{ padding: 16 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 12,
                }}>
                    <h3 style={{ fontWeight: 600, fontSize: 'var(--text-body)' }}>最近消耗记录</h3>
                    <button className="button" onClick={handleCostFocus}>聚焦详情</button>
                </div>
                <div style={{ maxHeight: 220, overflow: 'auto' }}>
                    {usages.length === 0 && (
                        <p style={{
                            color: 'var(--color-ink-muted)', textAlign: 'center', padding: 24,
                        }}>
                            暂无消耗记录
                        </p>
                    )}
                    {usages.slice(-15).map((u, i) => (
                        <div
                            key={i}
                            style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', padding: '6px 0',
                                borderBottom: '1px solid var(--color-border)', fontSize: 13,
                            }}
                        >
                            <span style={{
                                fontFamily: 'var(--font-family-mono)', fontSize: 11, flex: 2,
                            }}>
                                {new Date(u.createdAt).toLocaleString()}
                            </span>
                            <span style={{ flex: 1, textAlign: 'right' }}>{u.modelName}</span>
                            <span style={{
                                flex: 1, textAlign: 'right',
                                fontFamily: 'var(--font-family-mono)',
                            }}>
                                {u.inputTokens + u.outputTokens} tok
                            </span>
                            <span style={{
                                flex: 1, textAlign: 'right',
                                color: 'var(--color-error)', fontWeight: 600,
                            }}>
                                ${u.costUsd.toFixed(4)}
                            </span>
                            {u.skillId && (
                                <span style={{
                                    background: 'var(--color-surface-1)',
                                    padding: '0 4px', borderRadius: 4,
                                    fontSize: 10, marginLeft: 8, cursor: 'pointer',
                                }}>
                                    {u.skillId}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 聚焦面板 */}
            <FocusPanel
                visible={focusPanelVisible}
                title={focusPanelTitle}
                onClose={() => setFocusPanelVisible(false)}
            >
                {focusContent}
            </FocusPanel>
        </div>
    );
};