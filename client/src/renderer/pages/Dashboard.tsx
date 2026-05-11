// ─── client/src/renderer/pages/Dashboard.tsx ──────────────
import React, { useState } from 'react';
import { useTokenMonitor } from '../hooks/useTokenMonitor';

export const Dashboard: React.FC = () => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const { usages, totalTokens, totalCost, budget, budgetUsage } = useTokenMonitor(period);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Token 监测面板</h1>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as typeof period)}
                    style={{ padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: 4 }}
                >
                    <option value="day">今日</option>
                    <option value="week">本周</option>
                    <option value="month">本月</option>
                </select>
            </div>

            {budget && budgetUsage >= 80 && (
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: budgetUsage >= 95 ? '#fef2f2' : '#fffbeb',
                    borderLeft: `4px solid ${budgetUsage >= 95 ? '#ef4444' : '#f59e0b'}`,
                    marginBottom: 16,
                }}>
                    预算已使用 {budgetUsage.toFixed(1)}%，请关注Token消耗
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ color: '#6b7280', fontSize: 14 }}>Token 消耗</div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>{totalTokens.toLocaleString()}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ color: '#6b7280', fontSize: 14 }}>费用 (USD)</div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>${totalCost.toFixed(4)}</div>
                </div>
                {budget && (
                    <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ color: '#6b7280', fontSize: 14 }}>预算使用率</div>
                        <div style={{ fontSize: 28, fontWeight: 600 }}>{budgetUsage.toFixed(1)}%</div>
                    </div>
                )}
            </div>

            <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontWeight: 600, marginBottom: 8 }}>实时请求流</h2>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, border: '1px solid #e5e7eb', padding: 8 }}>
                    {usages.length === 0 && <div style={{ color: '#9ca3af' }}>暂无数据</div>}
                    {usages.slice(-20).map((u, i) => (
                        <div key={i} style={{ borderBottom: '1px solid #f3f4f6', padding: '4px 0' }}>
                            [{new Date(u.timestamp).toLocaleTimeString()}] {u.model} | {u.inputTokens}+{u.outputTokens} tokens | ${u.costUsd.toFixed(6)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};