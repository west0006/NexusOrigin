// client/src/renderer/pages/AgentManager.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useUserStore } from '../store/user.store';
import { FocusPanel } from '../components/FocusPanel';
import { showToast } from '../components/Toast';
import { useConfirm } from '../contexts/ConfirmContext';

interface Agent {
    id: string;
    name: string;
    description: string;
    version: string;
    endpoint: string;
    status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
    capabilities?: string[];
    lastHeartbeat?: string;
    owner: { id: string; username: string };
    createdAt: string;
}

export const AgentManager: React.FC = () => {
    const user = useUserStore(s => s.user);
    const confirm = useConfirm();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [focusAgent, setFocusAgent] = useState<Agent | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        version: '1.0.0',
        endpoint: '',
        capabilities: '',
    });
    const [message, setMessage] = useState('');

    const fetchAgents = async () => {
        try {
            const data = await apiClient<{ agents: Agent[]; total: number }>('/agents');
            setAgents(data.agents);
            if (focusAgent) {
                const updated = data.agents.find(a => a.id === focusAgent.id);
                if (updated) setFocusAgent(updated);
                else setFocusAgent(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleRegister = async () => {
        if (!form.name || !form.endpoint) {
            showToast('名称和端点必填', 'warning');
            return;
        }
        try {
            await apiClient('/agents', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    capabilities: form.capabilities
                        .split(',')
                        .map(c => c.trim())
                        .filter(Boolean),
                }),
            });
            setShowForm(false);
            setForm({ name: '', description: '', version: '1.0.0', endpoint: '', capabilities: '' });
            fetchAgents();
            showToast('Agent注册成功', 'success');
        } catch (e: any) {
            showToast('注册失败: ' + e.message, 'error');
        }
    };

    const handleHeartbeat = async (agentId: string) => {
        try {
            await apiClient(`/agents/${agentId}/heartbeat`, { method: 'POST' });
            showToast('心跳已发送', 'success');
            fetchAgents();
        } catch (e: any) {
            showToast('心跳失败: ' + e.message, 'error');
        }
    };

    const handleDeregister = async (agentId: string) => {
        const ok = await confirm({
            title: '注销Agent',
            message: '确定要注销此Agent吗？此操作不可撤销。',
        });
        if (!ok) return;
        try {
            await apiClient(`/agents/${agentId}`, { method: 'DELETE' });
            setFocusAgent(null);
            fetchAgents();
            showToast('Agent已注销', 'success');
        } catch (e: any) {
            showToast('注销失败: ' + e.message, 'error');
        }
    };

    if (loading) return <div style={{ padding: 24 }}>加载中...</div>;

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Agent管理</h2>
                {user && (
                    <button className="button button-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '取消' : '注册Agent'}
                    </button>
                )}
            </div>

            {message && (
                <div
                    style={{
                        padding: 12,
                        marginBottom: 16,
                        background: 'var(--color-success-bg)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 14,
                    }}
                >
                    {message}
                    <button
                        style={{
                            marginLeft: 16,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-primary)',
                        }}
                        onClick={() => setMessage('')}
                    >
                        关闭
                    </button>
                </div>
            )}

            {/* 注册表单 */}
            {showForm && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>注册新Agent</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <input
                            className="input"
                            placeholder="Agent名称 *"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <textarea
                            className="input"
                            placeholder="描述"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            style={{ minHeight: 60 }}
                        />
                        <input
                            className="input"
                            placeholder="A2A端点URL *"
                            value={form.endpoint}
                            onChange={e => setForm({ ...form, endpoint: e.target.value })}
                        />
                        <input
                            className="input"
                            placeholder="能力标签 (逗号分隔)"
                            value={form.capabilities}
                            onChange={e => setForm({ ...form, capabilities: e.target.value })}
                        />
                        <button className="button button-primary" onClick={handleRegister}>
                            注册
                        </button>
                    </div>
                </div>
            )}

            {/* Agent列表 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {agents.map(agent => (
                    <div
                        key={agent.id}
                        className="card"
                        style={{
                            padding: 20,
                            cursor: 'pointer',
                            borderLeft: `4px solid ${
                                agent.status === 'ONLINE'
                                    ? 'var(--color-success)'
                                    : agent.status === 'DEGRADED'
                                        ? 'var(--color-warning)'
                                        : 'var(--color-error)'
                            }`,
                        }}
                        onClick={() => setFocusAgent(agent)}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</h3>
                            <span
                                style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    background:
                                        agent.status === 'ONLINE'
                                            ? 'var(--color-success-bg)'
                                            : agent.status === 'DEGRADED'
                                                ? 'var(--color-warning-bg)'
                                                : 'var(--color-error-bg)',
                                    color:
                                        agent.status === 'ONLINE'
                                            ? 'var(--color-success)'
                                            : agent.status === 'DEGRADED'
                                                ? '#856404'
                                                : 'var(--color-error)',
                                    fontWeight: 600,
                                }}
                            >
                {agent.status}
              </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                            {agent.description || '暂无描述'}
                        </p>
                        <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>
                            {agent.capabilities?.map(c => (
                                <span
                                    key={c}
                                    style={{
                                        marginRight: 8,
                                        background: 'var(--color-surface-1)',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                    }}
                                >
                  {c}
                </span>
                            ))}
                        </div>
                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <button
                                className="button"
                                style={{ fontSize: 12 }}
                                onClick={e => {
                                    e.stopPropagation();
                                    handleHeartbeat(agent.id);
                                }}
                            >
                                心跳
                            </button>
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div
                        className="card"
                        style={{
                            padding: 48,
                            textAlign: 'center',
                            color: 'var(--color-ink-muted)',
                            gridColumn: '1 / -1',
                        }}
                    >
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
                        <p>还没有注册任何Agent</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>
                            注册你的第一个AI Agent，让它加入枢元网络
                        </p>
                    </div>
                )}
            </div>

            {/* 聚焦面板 */}
            <FocusPanel
                visible={!!focusAgent}
                title={focusAgent?.name || 'Agent详情'}
                subtitle={focusAgent?.status}
                onClose={() => setFocusAgent(null)}
            >
                {focusAgent && (
                    <div>
                        <p><strong>版本:</strong> {focusAgent.version}</p>
                        <p>
                            <strong>端点:</strong>{' '}
                            <code style={{ fontSize: 12 }}>{focusAgent.endpoint}</code>
                        </p>
                        <p>
                            <strong>最后心跳:</strong>{' '}
                            {focusAgent.lastHeartbeat
                                ? new Date(focusAgent.lastHeartbeat).toLocaleString()
                                : '从未'}
                        </p>
                        <p>
                            <strong>能力:</strong> {focusAgent.capabilities?.join(', ') || '无'}
                        </p>
                        <p><strong>拥有者:</strong> {focusAgent.owner?.username}</p>
                        <p>
                            <strong>注册时间:</strong>{' '}
                            {new Date(focusAgent.createdAt).toLocaleString()}
                        </p>
                        <div style={{ marginTop: 16 }}>
                            <button
                                className="button button-primary"
                                onClick={() => handleHeartbeat(focusAgent.id)}
                            >
                                发送心跳
                            </button>
                            <button
                                className="button button-danger"
                                style={{ marginLeft: 8 }}
                                onClick={() => handleDeregister(focusAgent.id)}
                            >
                                注销
                            </button>
                        </div>
                    </div>
                )}
            </FocusPanel>
        </div>
    );
};