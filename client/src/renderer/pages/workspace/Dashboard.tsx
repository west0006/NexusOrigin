// client/src/renderer/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useUserStore } from '../../store/user.store';
import { apiClient } from '../../api/client.api';
import { showToast } from '../../components/Toast';
import { C } from '../../styles/theme';
import { Icon } from '../../components/icons';
import { ApiKeyPanel } from '../../components/ApiKeyPanel';
import {useTaskExecutionStore} from "@renderer/store/taskExecution.store";
import { useAgentRegistryStore } from '../../store/agentRegistry.store';

interface DailyUsage {
    date: string;
    cost: number;
    tokens: number;
}

interface UsageRecord {
    id: string;
    createdAt: string;
    model: string;
    provider: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
}

interface UsageStats {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    successCount: number;
    failCount: number;
    avgLatency: number;
    daily: DailyUsage[];
    records?: UsageRecord[];
    details: UsageRecord[];
}

// ─── 主组件 ───
const COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#55EFC4', '#FAB1A0'];

type Tab = 'overview' | 'usage' | 'cost' | 'requests' | 'apikeys';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const user = useUserStore((s) => s.user);
    const { taskHistory } = useTaskExecutionStore();

    const fetchStats = useCallback(async () => {
        try {
            const res = await apiClient<UsageStats>('/model-gateway/stats');
            setStats(res);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // ─── 从 taskHistory 派生的统计 ───
    const taskStats = useMemo(() => {
        const tasks = taskHistory.filter(t => t.status === 'completed' || t.status === 'failed');
        const successCount = tasks.filter(t => t.status === 'completed').length;
        const failCount = tasks.filter(t => t.status === 'failed').length;
        const totalTokens = tasks.reduce((s, t) => s + t.totalTokens.input + t.totalTokens.output, 0);
        const totalCost = tasks.reduce((s, t) => s + t.totalCost, 0);
        const totalRequests = tasks.length;

        // 按日期聚合
        const dailyMap: Record<string, { cost: number; tokens: number }> = {};
        tasks.forEach(t => {
            const date = new Date(t.createdAt).toISOString().slice(0, 10);
            if (!dailyMap[date]) dailyMap[date] = { cost: 0, tokens: 0 };
            dailyMap[date].cost += t.totalCost;
            dailyMap[date].tokens += t.totalTokens.input + t.totalTokens.output;
        });
        const daily = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
            date, cost: v.cost, tokens: v.tokens,
        }));

        return { totalTokens, totalCost, totalRequests, successCount, failCount, daily };
    }, [taskHistory]);

    const modelBreakdown = useMemo(() => {
        if (!stats?.records) return [];
        const map: Record<string, number> = {};
        stats.records.forEach(r => { map[r.model] = (map[r.model] || 0) + r.cost; });
        return Object.entries(map).map(([name, cost]) => ({ name, cost }));
    }, [stats]);

    // Agent 执行概况（来自 taskExecutionStore）
    const agentStats = useMemo(() => {
        const h = taskHistory || [];
        return {
            total: h.length,
            running: h.filter(t => t.status === 'running').length,
            failed: h.filter(t => t.status === 'failed').length,
            breached: h.filter(t => t.status === 'breached').length,
            totalCost: h.reduce((s, t) => s + (t.totalCost || 0), 0),
            lastRun: h[0]?.originalInput?.slice(0, 30) || '无',
        };
    }, [taskHistory]);

    // ─── 渲染器 ───

    const renderOverview = useCallback(() => {
        const { registrations } = useAgentRegistryStore.getState();
        const { taskHistory } = useTaskExecutionStore.getState();

        const agentStats = {
            total: registrations.length,
            online: registrations.filter(a => a.status === 'idle').length,
            busy: registrations.filter(a => a.status === 'busy').length,
            offline: registrations.filter(a => a.status === 'offline').length,
        };

        const completedTasks = taskHistory.filter(t => t.status === 'completed' || t.status === 'failed');
        const successCount = completedTasks.filter(t => t.status === 'completed').length;
        const failCount = completedTasks.filter(t => t.status === 'failed').length;
        const totalTaskCost = completedTasks.reduce((s, t) => s + t.totalCost, 0);
        const totalTaskTokens = completedTasks.reduce((s, t) => s + t.totalTokens.input + t.totalTokens.output, 0);

        return (
            <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <StatCard icon="cpu" label="Agent 总数" value={agentStats.total.toString()} color={C.primary} />
                    <StatCard icon="check" label="在线 Agent" value={agentStats.online.toString()} color={C.success} />
                    <StatCard icon="play" label="忙碌 Agent" value={agentStats.busy.toString()} color={C.warning} />
                    <StatCard icon="x" label="离线 Agent" value={agentStats.offline.toString()} color={C.textLight} />
                    <StatCard icon="tasks" label="完成任务" value={successCount.toString()} color={C.primary} />
                    <StatCard icon="alert" label="失败任务" value={failCount.toString()} color={C.error} />
                    <StatCard icon="dollar" label="总花费" value={`¥${totalTaskCost.toFixed(4)}`} color={C.warning} />
                    <StatCard icon="zap" label="总 Token" value={totalTaskTokens.toLocaleString()} color={C.success} />
                </div>
                {registrations.length > 0 && (
                    <div style={{ background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`, padding: 16 }}>
                        <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: C.text }}>已注册 Agent</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {registrations.map(a => (
                                <div key={a.agentId} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', background: C.bg, borderRadius: C.radiusSm,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: a.status === 'idle' ? C.success : a.status === 'busy' ? C.warning : C.textLight,
                                    }} />
                                        <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{a.name}</span>
                                        <span style={{ fontSize: 11, color: C.textLight }}>({a.agentId.slice(0, 12)}...)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 11, color: C.textSecondary }}>
                                        {a.model || a.framework}
                                    </span>
                                        <span style={{
                                            fontSize: 11, padding: '2px 6px', borderRadius: 4,
                                            background: a.builtin ? C.primary + '18' : C.border,
                                            color: a.builtin ? C.primary : C.textSecondary,
                                        }}>
                                        {a.builtin ? '内置' : '注册'}
                                    </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }, []);

    const StatCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
        <div style={{
            background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
            padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name={icon as any} size={14} color={color} />
                <span style={{ fontSize: 12, color: C.textSecondary }}>{label}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
        </div>
    );

    const renderUsage = () => (
        <>
            {/* 用量概览 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: '请求总额', value: taskStats.totalRequests.toLocaleString(), color: C.primary },
                    { label: '成功', value: (taskStats.successCount ?? 0).toLocaleString(), color: C.success },
                    { label: '失败', value: (taskStats.failCount ?? 0).toLocaleString(), color: C.error },
                    { label: '平均延迟', value: stats?.avgLatency ? `${stats.avgLatency.toFixed(0)}ms` : 'N/A', color: C.warning },
                ].map(card => (
                    <div key={card.label} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>{card.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Token 明细 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: '总消耗 Token', value: taskStats.totalTokens.toLocaleString(), color: C.primary },
                    { label: '输入 Tokens', value: (stats?.records?.reduce((s, r) => s + r.tokensIn, 0) ?? 0).toLocaleString(), color: C.info },
                    { label: '输出 Tokens', value: (stats?.records?.reduce((s, r) => s + r.tokensOut, 0) ?? 0).toLocaleString(), color: C.success },
                    { label: '缓存读取', value: '—', color: C.textLight },
                    { label: '执行次数', value: taskStats.totalRequests.toLocaleString(), color: C.info },
                    { label: '任务数', value: (taskStats.successCount + taskStats.failCount).toLocaleString(), color: C.warning },
                    { label: '总花费', value: `¥${taskStats.totalCost.toFixed(4)}`, color: C.success },
                ].map(card => (
                    <div key={card.label} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>{card.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Token 趋势 */}
            <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Token 消耗趋势</h3>
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={taskStats.daily.length > 0 ? taskStats.daily : [{ date: '暂无', cost: 0, tokens: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textLight }} />
                        <YAxis tick={{ fontSize: 11, fill: C.textLight }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="tokens" stroke={C.success} fill={C.success} fillOpacity={0.1} name="Tokens" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );

    const renderCost = () => (
        <>
            {/* 费用概览 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: '总费用', value: `$${taskStats.totalCost.toFixed(4)}`, color: C.error },
                    { label: '日均费用', value: `$${(taskStats.totalCost / Math.max(taskStats.daily.length, 1)).toFixed(4)}`, color: C.warning },
                    { label: '平均单次费用', value: `$${(taskStats.totalCost / Math.max(taskStats.totalRequests, 1)).toFixed(6)}`, color: C.primary },
                ].map(card => (
                    <div key={card.label} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>{card.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>费用趋势</h3>
                <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={taskStats.daily.length > 0 ? taskStats.daily : [{ date: '暂无', cost: 0, tokens: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textLight }} />
                        <YAxis tick={{ fontSize: 11, fill: C.textLight }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="cost" stroke={C.error} fill={C.error} fillOpacity={0.1} name="费用 ($)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );

    const renderRequests = () => {
        const records = stats?.details ?? stats?.records ?? [];
        const maxRecords = 100;
        const filteredRecords = records.slice(0, maxRecords);

        return (
            <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>请求记录</h3>
                <div style={{ maxHeight: 480, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                        <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSecondary }}>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>时间</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>模型</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Provider</th>
                            <th style={{ textAlign: 'right', padding: '6px 4px' }}>输入 Tokens</th>
                            <th style={{ textAlign: 'right', padding: '6px 4px' }}>输出 Tokens</th>
                            <th style={{ textAlign: 'right', padding: '6px 4px' }}>费用</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredRecords.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: C.textLight }}>暂无记录</td></tr>
                        ) : filteredRecords.map(r => (
                            <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '6px 4px', fontFamily: 'monospace', fontSize: 11 }}>
                                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                                </td>
                                <td style={{ padding: '6px 4px', fontWeight: 600 }}>{r.model}</td>
                                <td style={{ padding: '6px 4px' }}>{r.provider}</td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                                    {r.tokensIn.toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace' }}>
                                    {r.tokensOut.toLocaleString()}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'monospace', color: C.error }}>
                                    ${r.cost.toFixed(4)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* 二级菜单 Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
                {[
                    { key: 'overview' as Tab, label: '总览' },
                    { key: 'usage' as Tab, label: '用量' },
                    { key: 'cost' as Tab, label: '费用' },
                    { key: 'requests' as Tab, label: '请求记录' },
                    { key: 'apikeys' as Tab, label: 'API Key 管理' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: activeTab === tab.key ? 600 : 400,
                            color: activeTab === tab.key ? C.primary : C.textSecondary,
                            borderBottom: activeTab === tab.key ? `2px solid ${C.primary}` : '2px solid transparent',
                            marginBottom: -1,
                            transition: 'all 150ms',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab 内容 */}
            {loading && activeTab !== 'apikeys' ? (
                <div style={{ padding: 48, textAlign: 'center', color: C.textLight }}>加载中...</div>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'usage' && renderUsage()}
                    {activeTab === 'cost' && renderCost()}
                    {activeTab === 'requests' && renderRequests()}
                    {activeTab === 'apikeys' && <ApiKeyPanel />}
                </>
            )}
        </div>
    );
};

export default Dashboard;