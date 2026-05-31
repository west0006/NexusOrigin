// client/src/renderer/pages/CostCenter.tsx
// 成本中心（增强版：BudgetCircuitBreaker 状态机 + 预算仪表盘 + 熔断动画）
// 极简扁平风格，统一使用 C token

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { C } from '../styles/theme';
import { Icon } from '../components/icons';
import { useTaskExecutionStore } from '../store/taskExecution.store';
import { BudgetCircuitBreaker, type BreakerStatus } from '../components/Agent/BudgetCircuitBreaker';

interface DailyTrend {
    date: string;
    cost: number;
    tokens: number;
}

const CostCenter: React.FC = () => {
    const { taskHistory, budget, setBudget, resetBudget } = useTaskExecutionStore();
    const [showBudgetEdit, setShowBudgetEdit] = useState(false);
    const [editBudget, setEditBudget] = useState(String(budget));
    const [breachFlash, setBreachFlash] = useState(false);

    // 熔断器实例（使用 ref 保持跨渲染单例）
    const breakerRef = useRef<BudgetCircuitBreaker | null>(null);
    if (!breakerRef.current) {
        breakerRef.current = new BudgetCircuitBreaker({ budgetLimit: budget });
    }

    // 当预算变化时同步熔断器
    useEffect(() => {
        breakerRef.current?.setBudgetLimit(budget);
    }, [budget]);

    // 计算统计数据
    const stats = useMemo(() => {
        const entries = taskHistory || [];
        const totalInput = entries.reduce((s, e) => s + (e.totalTokens?.input || 0), 0);
        const totalOutput = entries.reduce((s, e) => s + (e.totalTokens?.output || 0), 0);
        const totalCost = entries.reduce((s, e) => s + (e.totalCost || 0), 0);
        const taskCount = entries.length;
        const runningCount = entries.filter(e => e.status === 'running').length;
        const failedCount = entries.filter(e => e.status === 'failed').length;
        const breachedCount = entries.filter(e => e.status === 'breached').length;

        const dailyMap = new Map<string, { cost: number; tokens: number }>();
        entries.forEach(e => {
            const day = new Date(e.createdAt).toISOString().slice(0, 10);
            const prev = dailyMap.get(day) || { cost: 0, tokens: 0 };
            dailyMap.set(day, {
                cost: prev.cost + (e.totalCost || 0),
                tokens: prev.tokens + (e.totalTokens?.input || 0) + (e.totalTokens?.output || 0),
            });
        });
        const dailyTrend: DailyTrend[] = Array.from(dailyMap.entries())
            .map(([date, v]) => ({ date, cost: v.cost, tokens: v.tokens }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 通过熔断器获取状态
        const total = totalCost;
        const status = breakerRef.current!.recordUsage(0); // no-op check
        const breakerStatus = status.status;

        return {
            totalInput, totalOutput, totalCost: total, taskCount,
            runningCount, failedCount, breachedCount, dailyTrend,
            breakerStatus,
        };
    }, [taskHistory, budget]);

    // 熔断闪烁效果
    useEffect(() => {
        if (stats.breakerStatus.state === 'OPEN') {
            setBreachFlash(true);
            const t = setTimeout(() => setBreachFlash(false), 2000);
            return () => clearTimeout(t);
        }
    }, [stats.breakerStatus.state]);

    const handleSaveBudget = () => {
        const v = parseFloat(editBudget);
        if (isNaN(v) || v <= 0) { return; }
        setBudget(v);
        setShowBudgetEdit(false);
        showToast('预算已更新', 'success');
    };

    const handleResetBudget = () => {
        resetBudget();
        breakerRef.current?.reset();
        setEditBudget(String(DEFAULT_BUDGET));
        showToast('熔断器已重置', 'success');
    };

    const formatCost = (c: number) => `¥${(c * 7).toFixed(4)}`;
    const formatDate = (d: string) => d.slice(5, 10).replace('-', '/');

    const cardBase: React.CSSProperties = {
        background: C.cardBg, borderRadius: C.radiusMd,
        border: `1px solid ${C.border}`, padding: 16,
    };

    const entries = taskHistory || [];
    const { breakerStatus } = stats;

    // 预算仪表盘 SVG 圆形参数
    const svgSize = 120;
    const svgCenter = svgSize / 2;
    const svgRadius = 48;
    const svgCircumference = 2 * Math.PI * svgRadius;
    const usageRatio = Math.min(breakerStatus.usageRatio, 1);
    const svgOffset = svgCircumference * (1 - usageRatio);
    const breakerColor = breakerStatus.state === 'CLOSED' ? C.success
        : breakerStatus.state === 'HALF_OPEN' ? C.warning
            : C.error;

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            {/* ─── 熔断闪烁遮罩 ─── */}
            {breachFlash && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
                    background: `radial-gradient(circle, ${C.error}40 0%, transparent 70%)`,
                    animation: 'fadeOut 2s ease-out',
                    opacity: 0,
                }} />
            )}

            {/* ─── 标题 ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="billing" size={24} /> 成本中心
                    </h1>
                    <p style={{ margin: '4px 0 0', color: C.textSecondary, fontSize: 13 }}>
                        统一成本监控与预算管理
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowBudgetEdit(!showBudgetEdit)} style={btnPrimaryStyle}>
                        <Icon name="billing" size={14} style={{ marginRight: 4 }} /> 预算设置
                    </button>
                    {breakerStatus.state === 'OPEN' && (
                        <button onClick={handleResetBudget} style={btnDangerStyle}>
                            <Icon name="refresh" size={14} style={{ marginRight: 4 }} /> 重置熔断器
                        </button>
                    )}
                </div>
            </div>

            {/* ─── 预算编辑面板 ─── */}
            {showBudgetEdit && (
                <div style={{ ...cardBase, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>预算设置</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: C.textSecondary }}>预算上限 ($)：</span>
                        <input
                            type="number" step="0.01" min="0.01"
                            value={editBudget}
                            onChange={e => setEditBudget(e.target.value)}
                            style={inputStyle}
                        />
                        <button onClick={handleSaveBudget} style={btnPrimaryStyle}>保存</button>
                        <button onClick={() => setShowBudgetEdit(false)} style={btnSecondaryStyle}>取消</button>
                        <span style={{ fontSize: 11, color: C.textLight, marginLeft: 8 }}>
                            当前预算 {formatCost(budget)}
                        </span>
                    </div>
                </div>
            )}

            {/* ─── 熔断器 + 统计卡片 ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, marginBottom: 20 }}>
                {/* 预算仪表盘圆形 */}
                <div style={{
                    ...cardBase, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', minWidth: 140,
                    borderColor: breakerStatus.state === 'OPEN' ? C.error
                        : breakerStatus.state === 'HALF_OPEN' ? C.warning
                            : C.border,
                }}>
                    <svg width={svgSize} height={svgSize}>
                        <circle cx={svgCenter} cy={svgCenter} r={svgRadius}
                                fill="none" stroke={C.bg} strokeWidth={8} />
                        <circle cx={svgCenter} cy={svgCenter} r={svgRadius}
                                fill="none" stroke={breakerColor} strokeWidth={8}
                                strokeDasharray={svgCircumference}
                                strokeDashoffset={svgOffset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${svgCenter} ${svgCenter})`}
                                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                        />
                        <text x={svgCenter} y={svgCenter - 6}
                              textAnchor="middle" fontSize="22" fontWeight="700"
                              fill={breakerColor}>
                            {Math.round(usageRatio * 100)}%
                        </text>
                        <text x={svgCenter} y={svgCenter + 14}
                              textAnchor="middle" fontSize="10"
                              fill={C.textSecondary}>
                            {breakerStatus.state === 'CLOSED' ? '正常'
                                : breakerStatus.state === 'HALF_OPEN' ? '半开'
                                    : '已熔断'}
                        </text>
                    </svg>
                    <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>
                        已使用 {formatCost(breakerStatus.totalCost)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textSecondary }}>
                        剩余 {formatCost(breakerStatus.remainingBudget)}
                    </div>
                    {breakerStatus.nextAutoRecoveryAt && (
                        <div style={{ fontSize: 10, color: C.warning, marginTop: 4 }}>
                            预计恢复 {new Date(breakerStatus.nextAutoRecoveryAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>

                {/* 统计卡片网格 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div style={cardBase}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{formatCost(stats.totalCost)}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>总费用</div>
                    </div>
                    <div style={cardBase}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{(stats.totalInput + stats.totalOutput).toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>总 Token</div>
                    </div>
                    <div style={cardBase}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{stats.taskCount}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>任务数</div>
                    </div>
                    <div style={{ ...cardBase, borderColor: stats.runningCount > 0 ? C.warning : C.border }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.warning }}>{stats.runningCount}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>运行中</div>
                    </div>
                    <div style={{ ...cardBase, borderColor: stats.failedCount > 0 ? C.error : C.border }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.error }}>{stats.failedCount}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>失败</div>
                    </div>
                    <div style={{ ...cardBase, borderColor: stats.breachedCount > 0 ? C.error : C.border }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: C.error }}>{stats.breachedCount}</div>
                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>熔断</div>
                    </div>
                </div>
            </div>

            {/* ─── 熔断器状态详情 ─── */}
            {breakerStatus.state !== 'CLOSED' && (
                <div style={{
                    ...cardBase, marginBottom: 16,
                    borderColor: breakerStatus.state === 'OPEN' ? C.error : C.warning,
                    background: breakerStatus.state === 'OPEN' ? C.error + '08' : C.warning + '08',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: breakerColor }}>
                        <Icon name="warning" size={18} color={breakerColor} />
                        {breakerStatus.state === 'OPEN' ? '预算熔断已触发' : '预算熔断器处于半开状态'}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: C.textSecondary, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>当前费用：{formatCost(breakerStatus.totalCost)} / 预算上限：{formatCost(budget)}</span>
                        <span>使用比例：{(breakerStatus.usageRatio * 100).toFixed(1)}%</span>
                        {breakerStatus.state === 'OPEN' && breakerStatus.nextAutoRecoveryAt && (
                            <span>预计自动恢复时间：{new Date(breakerStatus.nextAutoRecoveryAt).toLocaleTimeString()}</span>
                        )}
                        {breakerStatus.state === 'HALF_OPEN' && (
                            <span>剩余测试次数：{breakerStatus.halfOpenTestsRemaining} 次</span>
                        )}
                    </div>
                    {breakerStatus.state === 'OPEN' && (
                        <button onClick={handleResetBudget} style={{ ...btnDangerStyle, marginTop: 8 }}>
                            <Icon name="refresh" size={12} style={{ marginRight: 4 }} /> 手动重置
                        </button>
                    )}
                </div>
            )}

            {/* ─── 每日趋势 ─── */}
            <div style={{ ...cardBase, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>每日费用趋势</div>
                {stats.dailyTrend.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: C.textLight, fontSize: 13 }}>暂无趋势数据</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stats.dailyTrend.map(d => {
                            const maxCost = Math.max(...stats.dailyTrend.map(x => x.cost), 0.001);
                            const barWidth = (d.cost / maxCost) * 100;
                            return (
                                <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 36, fontSize: 11, color: C.textSecondary, textAlign: 'right' }}>{formatDate(d.date)}</span>
                                    <div style={{ flex: 1, height: 14, borderRadius: 3, background: C.bg, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${barWidth}%`, height: '100%',
                                            background: C.primary, borderRadius: 3, transition: 'width 0.3s',
                                        }} />
                                    </div>
                                    <span style={{ width: 60, fontSize: 11, color: C.textLight }}>{formatCost(d.cost)}</span>
                                    <span style={{ width: 50, fontSize: 10, color: C.textLight }}>{d.tokens.toLocaleString()} t</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── 成本明细列表 ─── */}
            <div style={cardBase}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>成本明细</div>
                {entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: C.textLight, fontSize: 13 }}>暂无成本记录</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{
                            display: 'flex', gap: 8, padding: '8px 10px', fontSize: 11, color: C.textLight,
                            fontWeight: 600, borderBottom: `1px solid ${C.border}`,
                        }}>
                            <span style={{ flex: 2 }}>任务名称</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>输入 Token</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>输出 Token</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>成本</span>
                            <span style={{ flex: 1, textAlign: 'center' }}>状态</span>
                        </div>
                        {entries.map(e => {
                            const statusColor = e.status === 'completed' ? C.success
                                : e.status === 'running' ? C.warning
                                    : e.status === 'breached' ? C.error
                                        : C.textLight;
                            const statusLabel = e.status === 'completed' ? '完成'
                                : e.status === 'running' ? '运行中'
                                    : e.status === 'breached' ? '熔断'
                                        : e.status === 'failed' ? '失败'
                                            : '等待';
                            return (
                                <div key={e.taskId} style={{
                                    display: 'flex', gap: 8, padding: '8px 10px',
                                    fontSize: 12, color: C.text, borderBottom: `1px solid ${C.border}`,
                                    background: e.status === 'breached' ? C.error + '08' : 'transparent',
                                }}>
                                    <span style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {e.originalInput?.slice(0, 40) || e.taskId}
                                    </span>
                                    <span style={{ flex: 1, textAlign: 'right', color: C.textSecondary }}>
                                        {(e.totalTokens?.input || 0).toLocaleString()}
                                    </span>
                                    <span style={{ flex: 1, textAlign: 'right', color: C.textSecondary }}>
                                        {(e.totalTokens?.output || 0).toLocaleString()}
                                    </span>
                                    <span style={{ flex: 1, textAlign: 'right', fontWeight: 500 }}>
                                        {formatCost(e.totalCost || 0)}
                                    </span>
                                    <span style={{ flex: 1, textAlign: 'center', color: statusColor }}>
                                        {statusLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── 样式 ───
const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 13, outline: 'none', width: 120,
};
const btnPrimaryStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
    background: C.primary, color: C.textInverse, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
};
const btnSecondaryStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: C.cardBg, color: C.textSecondary, cursor: 'pointer',
    fontSize: 12, display: 'inline-flex', alignItems: 'center',
};
const btnDangerStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: C.radiusSm, border: `1px solid ${C.error}`,
    background: 'transparent', color: C.error, cursor: 'pointer',
    fontSize: 12, display: 'inline-flex', alignItems: 'center',
};
const DEFAULT_BUDGET = 0.05;

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    // 简单 toast——实际使用项目中引入的 showToast
    const { showToast: st } = require('../components/Toast') as { showToast: (m: string, t?: 'success' | 'error' | 'info') => void };
    st(msg, type);
}

export default CostCenter;