// client/src/renderer/pages/CostCenter.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { tokenAPI, BudgetInfo } from '../api/token';
import { useUserStore } from '../store/user.store';
import { showToast } from '../components/Toast';

interface DailyUsage {
    date: string;
    cost: number;
}

export const CostCenter: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
    const [usages, setUsages] = useState<DailyUsage[]>([]);
    const [budget, setBudget] = useState<BudgetInfo | null>(null);
    const [newBudget, setNewBudget] = useState('');
    const [loading, setLoading] = useState(true);
    const [sidecarStatus, setSidecarStatus] = useState<'online' | 'offline'>('offline');

    // 获取成本数据
    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await tokenAPI.getUsageByPeriod(user.id, period);
            if (Array.isArray(data?.data)) {
                setUsages(data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user, period]);

    // 获取预算
    const fetchBudget = useCallback(async () => {
        if (!user) return;
        try {
            const b = await tokenAPI.getBudget(user.id);
            setBudget(b);
            setNewBudget(b?.budget?.toString() || '');
        } catch (e) {}
    }, [user]);

    // 检查 Sidecar 状态
    const checkSidecar = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:8081/health');
            if (res.ok) setSidecarStatus('online');
            else setSidecarStatus('offline');
        } catch {
            setSidecarStatus('offline');
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchBudget();
        checkSidecar();
        const timer = setInterval(checkSidecar, 10000);
        return () => clearInterval(timer);
    }, [fetchData, fetchBudget, checkSidecar]);

    // 更新预算
    const handleSetBudget = async () => {
        const amount = parseFloat(newBudget);
        if (isNaN(amount) || amount <= 0) return showToast('请输入有效的预算金额', 'warning');
        try {
            await tokenAPI.setBudget(user!.id, amount);
            showToast('预算设置成功', 'success');
            fetchBudget();
        } catch (e) {
            showToast('预算设置失败', 'error');
        }
    };

    const totalCost = usages.reduce((sum, d) => sum + d.cost, 0);
    const budgetUsage = budget?.usageRate ?? 0;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>统一成本监控</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: sidecarStatus === 'online' ? 'var(--color-success)' : 'var(--color-error)',
              display: 'inline-block',
          }} />
                    <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
            Sidecar {sidecarStatus === 'online' ? '运行中' : '离线'}
          </span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
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
            </div>

            {/* 成本概览卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>当前周期总花费</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>${totalCost.toFixed(4)}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>月度预算</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>
                        {budget ? `$${budget.budget.toFixed(2)}` : '未设置'}
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>预算使用率</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: budgetUsage > 90 ? 'var(--color-error)' : 'var(--color-ink)' }}>
                        {budgetUsage.toFixed(1)}%
                    </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>本月请求数</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{usages.length}</div>
                </div>
            </div>

            {/* 预算设置 */}
            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>预算管理</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="输入月度预算 (USD)"
                        value={newBudget}
                        onChange={e => setNewBudget(e.target.value)}
                        style={{ width: 220 }}
                    />
                    <button className="button button-primary" onClick={handleSetBudget}>保存</button>
                    <button className="button" onClick={() => {
                        tokenAPI.setBudget(user!.id, 0).then(() => fetchBudget());
                    }}>清除预算</button>
                </div>
                {budget && budgetUsage >= 80 && (
                    <div style={{
                        marginTop: 12, padding: '8px 12px', background: 'var(--color-warning-bg)',
                        borderLeft: '4px solid var(--color-warning)', borderRadius: 4, fontSize: 13,
                    }}>
                        ⚠️ 预算已使用 {budgetUsage.toFixed(1)}%，请密切关注！
                    </div>
                )}
            </div>

            {/* 消耗明细表格 */}
            <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 16 }}>消耗明细</h3>
                {loading ? (
                    <div>加载中...</div>
                ) : usages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-ink-muted)', padding: 32 }}>暂无数据</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 0' }}>日期</th>
                            <th>花费 (USD)</th>
                            <th>预估消耗</th>
                        </tr>
                        </thead>
                        <tbody>
                        {usages.map((u, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '8px 0' }}>{u.date}</td>
                                <td style={{ color: 'var(--color-error)', fontWeight: 600 }}>${u.cost.toFixed(4)}</td>
                                <td style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>基于官方使用量校准</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};