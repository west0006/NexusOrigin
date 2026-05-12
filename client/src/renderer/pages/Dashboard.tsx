import React, { useEffect, useState, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useUserStore } from '../store/user.store';
import { tokenAPI, TokenUsage, BudgetInfo } from '../api/token';
import { userAPI } from '../api/user'; // 获取余额
import { FocusPanel } from '../components/FocusPanel';
import {showToast} from "@renderer/components/Toast";

// 颜色常量
const COLORS = {
    primary: '#6C5CE7',
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E17055',
    info: '#74B9FF',
};

// 模拟真实趋势数据
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
    const [focusMsg, setFocusMsg] = useState<string>('');
    // 聚焦面板状态
    const [focusPanelVisible, setFocusPanelVisible] = useState(false);
    const [focusPanelTitle, setFocusPanelTitle] = useState('');
    const [focusContent, setFocusContent] = useState<React.ReactNode>(null);

    // 数据拉取逻辑（同之前）
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
                const cost = formatted.reduce((sum:number, d:any) => sum + d.costUsd, 0);
                const tok = formatted.reduce((sum:number, d:any) => sum + d.inputTokens + d.outputTokens, 0);
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

    // 异常尖峰聚焦
    const handleSpikeFocus = (date: string) => {
        setFocusPanelTitle('消耗溯源');
        setFocusContent(
            <div>
                <p style={{ marginBottom: 16 }}>时段 <strong>{date}</strong> 出现异常消耗尖峰，总花费 <strong style={{ color: COLORS.error }}>$2.30</strong>，较均值增长 180%。</p>
                <div style={{ background: '#1E1E1E', color: '#0f0', padding: 12, borderRadius: 6, fontFamily: 'monospace' }}>
                    <div>🟢 12:05 | task: "market-report-gen" | cost: $1.20</div>
                    <div>🟢 12:12 | task: "competitor-analysis" | cost: $0.80</div>
                    <div>🔴 12:20 | task: "thursday-newsletter" | cost: $0.30 <span style={{ color: '#f00' }}>← 检测到重复查询</span></div>
                </div>
                <button className="button button-primary" style={{ marginTop: 16 }} onClick={() => showToast('已启用语义缓存（模拟）')}>一键启用优化</button>
            </div>
        );
        setFocusPanelVisible(true);
    };

    // 普通聚焦（成本详情）
    const handleCostFocus = () => {
        setFocusPanelTitle('成本明细');
        setFocusContent(
            <div>
                {usages.slice(0, 5).map((u, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ fontWeight: 600 }}>{new Date(u.createdAt).toLocaleString()}</div>
                        <div>模型: {u.modelName} · 消耗: {u.inputTokens + u.outputTokens} tokens</div>
                        <div style={{ color: 'var(--color-error)' }}>费用: ${u.costUsd.toFixed(4)}</div>
                    </div>
                ))}
                {usages.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>暂无详细记录</p>}
            </div>
        );
        setFocusPanelVisible(true);
    };

    const budgetUsage = budget?.usageRate ?? 0;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* 头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>仪表盘</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['day', 'week', 'month'].map(p => (
                        <button key={p} onClick={() => setPeriod(p as any)} className={`button ${period === p ? 'button-primary' : ''}`}>
                            {{ day: '今日', week: '本周', month: '本月' }[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* 预警横幅 */}
            {budget && budgetUsage >= 80 && (
                <div style={{ padding: '12px 16px', background: COLORS.warning + '30', borderLeft: `4px solid ${COLORS.warning}`, marginBottom: 16, borderRadius: 6 }}>
                    预算已使用 {budgetUsage.toFixed(1)}%，建议关注Token消耗
                </div>
            )}

            {/* 指标卡片网格 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Token 消耗</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{totalTokens.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>今日费用 (USD)</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>${totalCost.toFixed(4)}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>信用点余额</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: COLORS.primary }}>{credits.toFixed(0)} 点</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>预算使用率</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: budgetUsage > 90 ? COLORS.error : 'var(--color-ink)' }}>
                        {budgetUsage.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* 趋势图区域 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* 面积图 + 异常聚焦 */}
                <div className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => handleSpikeFocus('12:00')}>
                    <h3 style={{ fontWeight: 600, marginBottom: 12 }}>今日消耗趋势（点击尖峰聚焦）</h3>
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
                            <Area type="monotone" dataKey="cost" stroke={COLORS.primary} fill="url(#colorCost)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 预算环形图 */}
                <div className="card" style={{ padding: 16 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 12 }}>预算健康度</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: '已用', value: budgetUsage },
                                    { name: '剩余', value: Math.max(0, 100 - budgetUsage) },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                dataKey="value"
                                startAngle={90}
                                endAngle={-270}
                            >
                                <Cell fill={budgetUsage > 80 ? COLORS.error : COLORS.primary} />
                                <Cell fill="#f0f0f0" />
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: -20, fontSize: 14, color: 'var(--color-ink-muted)' }}>
                        {budget ? `已用 $${budget.used.toFixed(2)} / 预算 $${budget.budget.toFixed(2)}` : '未设置预算'}
                    </div>
                </div>
            </div>

            {/* 最近消耗记录 + 聚焦按钮 */}
            <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 600 }}>最近消耗记录</h3>
                    <button className="button" onClick={handleCostFocus}>聚焦详情</button>
                </div>
                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {usages.slice(-10).map((u, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: 14 }}>
                            <span style={{ fontFamily: 'monospace' }}>{new Date(u.createdAt).toLocaleString()}</span>
                            <span>{u.modelName}</span>
                            <span>{u.inputTokens + u.outputTokens} tokens</span>
                            <span style={{ color: COLORS.error }}>${u.costUsd.toFixed(4)}</span>
                        </div>
                    ))}
                    {usages.length === 0 && <p style={{ color: 'var(--color-ink-muted)' }}>暂无记录</p>}
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