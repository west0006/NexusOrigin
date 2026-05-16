// client/src/renderer/pages/TaskMarket.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useUserStore } from '../store/user.store';
import { FocusPanel } from '../components/FocusPanel';
import { showToast } from '../components/Toast';
import { useConfirm } from '../contexts/ConfirmContext';

interface Task {
    id: string;
    description: string;
    status: 'PENDING' | 'ACCEPTED' | 'EXECUTING' | 'COMPLETED' | 'DISPUTED';
    bid?: number;
    result?: string;
    rating?: number;
    client: { id: string; username: string };
    agent?: { id: string; name: string; reputation?: number } | null;
    provider?: { id: string; username: string } | null;
    createdAt: string;
    completedAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: '等待接单',
    ACCEPTED: '已接受',
    EXECUTING: '执行中',
    COMPLETED: '已完成',
    DISPUTED: '争议中',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#856404',
    ACCEPTED: 'var(--color-info)',
    EXECUTING: 'var(--color-primary)',
    COMPLETED: 'var(--color-success)',
    DISPUTED: 'var(--color-error)',
};

const STATUS_BG: Record<string, string> = {
    PENDING: 'var(--color-warning-bg)',
    ACCEPTED: 'var(--color-info-bg)',
    EXECUTING: 'var(--color-primary-light)',
    COMPLETED: 'var(--color-success-bg)',
    DISPUTED: 'var(--color-error-bg)',
};

export const TaskMarket: React.FC = () => {
    const user = useUserStore(s => s.user);
    const confirm = useConfirm();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ description: '', agentId: '', bid: 0 });

    // 聚焦状态
    const [focusTask, setFocusTask] = useState<Task | null>(null);
    const [focusPanelVisible, setFocusPanelVisible] = useState(false);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = filterStatus ? `?status=${filterStatus}` : '';
            const data = await apiClient<Task[]>(`/a2a/tasks${params}`);
            setTasks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 15000);
        return () => clearInterval(interval);
    }, [fetchTasks]);

    const handlePublish = async () => {
        if (!form.description) return showToast('请输入任务描述', 'warning');
        try {
            await apiClient('/a2a/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    description: form.description,
                    agentId: form.agentId || undefined,
                    bid: form.bid,
                }),
            });
            setShowForm(false);
            setForm({ description: '', agentId: '', bid: 0 });
            fetchTasks();
            showToast('任务已发布', 'success');
        } catch (e: any) {
            showToast('发布失败: ' + e.message, 'error');
        }
    };

    const handleAccept = async (taskId: string) => {
        const ok = await confirm({
            title: '接受任务',
            message: '确定要接受此任务吗？接受后将开始执行。',
        });
        if (!ok) return;
        try {
            await apiClient(`/a2a/tasks/${taskId}/accept`, { method: 'PATCH' });
            fetchTasks();
            showToast('任务已接受', 'success');
        } catch (e: any) {
            showToast('操作失败: ' + e.message, 'error');
        }
    };

    const handleComplete = async (taskId: string) => {
        const result = prompt('请输入执行结果或说明：');
        if (!result) return;
        try {
            await apiClient(`/a2a/tasks/${taskId}/complete`, {
                method: 'PATCH',
                body: JSON.stringify({ result }),
            });
            fetchTasks();
            showToast('任务已完成', 'success');
        } catch (e: any) {
            showToast('操作失败: ' + e.message, 'error');
        }
    };

    const handleRate = async (taskId: string, rating: number) => {
        try {
            await apiClient(`/a2a/tasks/${taskId}/rate`, {
                method: 'PATCH',
                body: JSON.stringify({ rating }),
            });
            fetchTasks();
            showToast('评价成功', 'success');
        } catch (e: any) {
            showToast('操作失败: ' + e.message, 'error');
        }
    };

    const openTaskDetail = (task: Task) => {
        setFocusTask(task);
        setFocusPanelVisible(true);
    };

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>任务市场</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <select
                        className="input"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="">全部状态</option>
                        <option value="PENDING">等待接单</option>
                        <option value="ACCEPTED">已接受</option>
                        <option value="EXECUTING">执行中</option>
                        <option value="COMPLETED">已完成</option>
                    </select>
                    {user && (
                        <button
                            className="button button-primary"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? '取消' : '发布任务'}
                        </button>
                    )}
                </div>
            </div>

            {/* 发布任务表单 */}
            {showForm && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>发布新任务</h3>
                    <textarea
                        className="input"
                        style={{ width: '100%', minHeight: 80, marginBottom: 12 }}
                        placeholder="任务描述，例如：翻译这份英文文档为中文"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <input
                            className="input"
                            style={{ flex: 1 }}
                            placeholder="指定 Agent ID（可选，留空为公开任务）"
                            value={form.agentId}
                            onChange={e => setForm({ ...form, agentId: e.target.value })}
                        />
                        <input
                            className="input"
                            type="number"
                            min="0"
                            placeholder="悬赏信用点"
                            value={form.bid || ''}
                            onChange={e => setForm({ ...form, bid: Number(e.target.value) })}
                            style={{ width: 140 }}
                        />
                    </div>
                    <button className="button button-primary" onClick={handlePublish}>
                        发布任务
                    </button>
                </div>
            )}

            {/* 任务列表 */}
            {loading ? (
                <div>加载中...</div>
            ) : tasks.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                    <p>暂无任务</p>
                    <p style={{ fontSize: 13, marginTop: 8 }}>发布第一个任务，让 AI Agent 为你工作</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className="card"
                            style={{ padding: 16, cursor: 'pointer', borderLeft: `4px solid ${STATUS_COLORS[task.status] || 'var(--color-border)'}` }}
                            onClick={() => openTaskDetail(task)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.description}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>
                                        发布者: {task.client?.username} · {new Date(task.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 16 }}>
                  <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: STATUS_BG[task.status] || 'var(--color-surface-1)',
                      color: STATUS_COLORS[task.status] || 'var(--color-ink)',
                  }}>
                    {STATUS_LABELS[task.status] || task.status}
                  </span>
                                    {task.bid ? (
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>
                      {task.bid} 点
                    </span>
                                    ) : null}
                                </div>
                            </div>
                            {task.agent && (
                                <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)', marginTop: 4 }}>
                                    🤖 {task.agent.name} {task.agent.reputation ? `· ⭐${task.agent.reputation.toFixed(1)}` : ''}
                                </div>
                            )}
                            {task.provider && (
                                <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)', marginTop: 4 }}>
                                    👤 执行者: {task.provider.username}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 聚焦面板：任务详情 */}
            <FocusPanel
                visible={focusPanelVisible}
                title="任务详情"
                subtitle={focusTask ? STATUS_LABELS[focusTask.status] : ''}
                onClose={() => setFocusPanelVisible(false)}
                focusedId={focusTask?.id}
            >
                {focusTask && (
                    <div data-focus-id={focusTask.id}>
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ marginBottom: 12 }}>
                                <strong>发布者：</strong> {focusTask.client?.username}
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <strong>描述：</strong>
                                <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{focusTask.description}</p>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <strong>悬赏：</strong> {focusTask.bid || 0} 信用点
                            </div>
                            {focusTask.agent && (
                                <div style={{ marginBottom: 12 }}>
                                    <strong>目标 Agent：</strong> {focusTask.agent.name}
                                    {focusTask.agent.reputation ? ` (信誉 ${focusTask.agent.reputation.toFixed(1)})` : ''}
                                </div>
                            )}
                            {focusTask.provider && (
                                <div style={{ marginBottom: 12 }}>
                                    <strong>执行者：</strong> {focusTask.provider.username}
                                </div>
                            )}
                            <div style={{ marginBottom: 12 }}>
                                <strong>状态：</strong>
                                <span style={{
                                    marginLeft: 8, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                                    background: STATUS_BG[focusTask.status] || 'var(--color-surface-1)',
                                    color: STATUS_COLORS[focusTask.status] || 'var(--color-ink)',
                                    fontSize: 12, fontWeight: 600,
                                }}>
                  {STATUS_LABELS[focusTask.status] || focusTask.status}
                </span>
                            </div>
                            {focusTask.result && (
                                <div style={{ marginBottom: 12, padding: 12, background: 'var(--color-surface-1)', borderRadius: 'var(--radius-md)' }}>
                                    <strong>执行结果：</strong>
                                    <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{focusTask.result}</p>
                                </div>
                            )}
                            {focusTask.rating && (
                                <div style={{ marginBottom: 12 }}>
                                    <strong>评分：</strong> {'⭐'.repeat(focusTask.rating)}
                                </div>
                            )}
                        </div>

                        {/* 操作区 */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {focusTask.status === 'PENDING' && user && focusTask.client.id !== user.id && (
                                <button className="button button-primary" onClick={() => handleAccept(focusTask.id)}>
                                    接受任务
                                </button>
                            )}
                            {(focusTask.status === 'ACCEPTED' || focusTask.status === 'EXECUTING') &&
                                focusTask.provider?.id === user?.id && (
                                    <button className="button button-primary" onClick={() => handleComplete(focusTask.id)}>
                                        提交结果
                                    </button>
                                )}
                            {focusTask.status === 'COMPLETED' && focusTask.client.id === user?.id && !focusTask.rating && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13 }}>评价：</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            className="button"
                                            style={{ padding: '4px 8px', fontSize: 12 }}
                                            onClick={() => handleRate(focusTask.id, star)}
                                        >
                                            {star}⭐
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </FocusPanel>
        </div>
    );
};