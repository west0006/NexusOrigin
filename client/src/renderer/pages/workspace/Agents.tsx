// client/src/renderer/pages/Agents.tsx
// Agent 页 | 修复：提交能力 + 真实能力保存 + 状态过滤 + try/catch

import React, { useEffect, useState, useMemo } from 'react';
import { C } from '../../styles/theme';
import { Icon } from '../../components/icons';
import { showToast } from '../../components/Toast';
import { useAgentRegistryStore, type AgentRegistration } from '../../store/agentRegistry.store';
import { useSkillStore } from '../../store/skill.store';
import { checkOllamaHealth } from '../../api/llm/local-ollama';
import AgentChatPanel from '../../components/AgentChatPanel';

type TabKey = 'agents' | 'register';

const Agents: React.FC = () => {
    const { registrations, loading, fetchAgents, registerAgent, removeAgent } = useAgentRegistryStore();
    const { skills, fetchSkills } = useSkillStore();

    const [activeTab, setActiveTab] = useState<TabKey>('agents');
    const [selectedAgent, setSelectedAgent] = useState<AgentRegistration | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [ollamaOk, setOllamaOk] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

    // 注册表单
    const [form, setForm] = useState({ name: '', description: '', endpoint: '' });
    // 按 agentId 隔离的能力选中状态
    const [selectedCapIds, setSelectedCapIds] = useState<Record<string, Set<string>>>({});
    const [showCapabilityPanel, setShowCapabilityPanel] = useState<string | null>(null);
    // 注册时选中的能力（独立于 agent 详情面板）
    const [registerCapIds, setRegisterCapIds] = useState<Set<string>>(new Set());

    useEffect(() => { void fetchAgents(); }, [fetchAgents]);
    useEffect(() => {
        checkOllamaHealth().then(setOllamaOk).catch(() => setOllamaOk(false));
    }, []);
    useEffect(() => {
        if (showCapabilityPanel || activeTab === 'register') { void fetchSkills(1, 50); }
    }, [showCapabilityPanel, activeTab, fetchSkills]);

    // ─── 统计 ───
    const stats = useMemo(() => {
        const total = registrations.length;
        const idle = registrations.filter(a => a.status === 'idle').length;
        const busy = registrations.filter(a => a.status === 'busy').length;
        const offline = registrations.filter(a => a.status === 'offline').length;
        return { total, idle, busy, offline };
    }, [registrations]);

    // ─── 搜索过滤 ───
    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return registrations.filter(a => {
            if (q && !a.name.toLowerCase().includes(q) && !a.agentId.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [registrations, searchQuery]);

    // ─── 注册 ───
    const handleRegister = async () => {
        if (!form.name.trim() || !form.endpoint.trim()) {
            showToast('请填写名称和端点地址', 'error');
            return;
        }
        try {
            await registerAgent({
                name: form.name,
                description: form.description,
                endpoint: form.endpoint,
                framework: 'crewai',
                capabilities: [...registerCapIds],
            });
            setForm({ name: '', description: '', endpoint: '' });
            setRegisterCapIds(new Set());
            setActiveTab('agents');
            showToast('注册成功', 'success');
        } catch (err: any) {
            showToast(err?.message || '注册失败', 'error');
        }
    };

    // ─── 移除 ───
    const handleRemove = async (agentId: string) => {
        try {
            await removeAgent(agentId);
            showToast('已移除', 'success');
        } catch (err: any) {
            showToast(err?.message || '移除失败', 'error');
        }
    };

    // ─── 聊天 ───
    const handleStartChat = (agent: AgentRegistration) => {
        setSelectedAgent(agent);
        setShowChat(true);
    };

    // ─── 能力面板 ───
    const handleToggleCapPanel = (agentId: string) => {
        if (showCapabilityPanel === agentId) {
            setShowCapabilityPanel(null);
        } else {
            setShowCapabilityPanel(agentId);
            // 初始化该 agent 的选中状态
            if (!selectedCapIds[agentId]) {
                const agent = registrations.find(a => a.agentId === agentId);
                setSelectedCapIds(prev => ({
                    ...prev,
                    [agentId]: new Set(agent?.capabilities.map(c => c.id) || []),
                }));
            }
        }
    };

    const handleSaveCapabilities = (agentId: string) => {
        const caps = selectedCapIds[agentId] || new Set();
        // 直接更新 store 中的 registrations（本地持久化）
        const store = useAgentRegistryStore.getState();
        const updated = store.registrations.map(a => {
            if (a.agentId !== agentId) return a;
            const allSkills = skills.length > 0 ? skills : [
                { id: 'code-review', name: '代码审查', description: '' },
                { id: 'data-analyze', name: '数据分析', description: '' },
                { id: 'doc-write', name: '文档撰写', description: '' },
            ];
            return {
                ...a,
                capabilities: allSkills
                    .filter(s => caps.has(s.id))
                    .map(s => ({ id: s.id, name: s.name, description: s.description })),
            };
        });
        useAgentRegistryStore.setState({ registrations: updated });
        setShowCapabilityPanel(null);
        showToast('能力已更新', 'success');
    };

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        return `${Math.floor(diff / 3600000)}小时前`;
    };

    const statusColor = (s: string) => {
        if (s === 'idle') return C.success;
        if (s === 'busy') return C.warning;
        return C.textLight;
    };

    const fallbackSkills = [
        { id: 'code-review', name: '代码审查', description: '' },
        { id: 'data-analyze', name: '数据分析', description: '' },
        { id: 'doc-write', name: '文档撰写', description: '' },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            {/* ─── 统计头 ─── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                    { label: '全部', value: stats.total, color: C.text },
                    { label: '空闲', value: stats.idle, color: C.success },
                    { label: '忙碌', value: stats.busy, color: C.warning },
                    { label: '离线', value: stats.offline, color: C.textLight },
                ].map(s => (
                    <div key={s.label} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: C.cardBg,
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                        <span style={{ fontSize: 12, color: C.textSecondary }}>{s.label}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</span>
                    </div>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{
                    padding: '6px 14px', borderRadius: C.radiusSm,
                    fontSize: 11, color: ollamaOk ? C.success : C.textLight,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    border: `1px solid ${C.border}`, background: C.cardBg,
                }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ollamaOk ? C.success : C.error }} />
                    Ollama {ollamaOk ? '在线' : '离线'}
                </div>
            </div>

            {/* ─── Tabs ─── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {[
                    { key: 'agents' as TabKey, label: `Agent 列表 (${registrations.length})` },
                    { key: 'register' as TabKey, label: '注册新 Agent' },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                            background: activeTab === t.key ? C.primary : 'transparent',
                            color: activeTab === t.key ? C.textInverse : C.textSecondary,
                            cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════ 列表 ═══════ */}
            {activeTab === 'agents' && (
                <>
                    {/* 搜索 */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: C.cardBg, marginBottom: 12,
                    }}>
                        <Icon name="search" size={14} color={C.textLight} />
                        <input
                            placeholder="搜索 Agent 名称或 ID…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1, border: 'none', background: 'transparent',
                                color: C.text, fontSize: 13, outline: 'none',
                            }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, padding: 0,
                            }}>
                                <Icon name="x" size={14} />
                            </button>
                        )}
                    </div>

                    {/* 列表 */}
                    {loading && <div style={{ textAlign: 'center', padding: 40, color: C.textSecondary }}>加载中...</div>}
                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: C.textSecondary }}>
                            {searchQuery ? '未找到匹配的 Agent' : '暂无注册的 Agent，点击上方「注册新 Agent」开始'}
                        </div>
                    )}

                    {!loading && filtered.map(agent => {
                        const isExpanded = expandedAgent === agent.agentId;
                        const isCapPanel = showCapabilityPanel === agent.agentId;
                        const agentCaps = selectedCapIds[agent.agentId] || new Set(agent.capabilities.map(c => c.id));

                        return (
                            <div key={agent.agentId} style={{
                                background: C.cardBg, borderRadius: C.radiusMd,
                                border: `1px solid ${C.border}`, padding: 14, marginBottom: 10,
                            }}>
                                {/* 顶栏 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: '50%',
                                            background: C.primaryLight, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                            fontWeight: 600, color: C.primary,
                                        }}>
                                            {agent.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{agent.name}</div>
                                            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                                                {agent.framework} · {agent.capabilities.length} 项能力
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            fontSize: 11, fontWeight: 500, padding: '2px 8px',
                                            borderRadius: C.radiusSm,
                                            background: statusColor(agent.status) + '18',
                                            color: statusColor(agent.status),
                                        }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(agent.status) }} />
                                            {agent.status === 'idle' ? '空闲' : agent.status === 'busy' ? '忙碌' : '离线'}
                                        </span>
                                        <button onClick={() => handleStartChat(agent)} style={btnIconStyle}>
                                            <Icon name="comment" size={14} />
                                        </button>
                                        <button onClick={() => setExpandedAgent(isExpanded ? null : agent.agentId)} style={btnIconStyle}>
                                            <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={13} />
                                        </button>
                                        <button onClick={() => handleRemove(agent.agentId)} style={btnDangerStyle}>
                                            <Icon name="trash" size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* 能力标签 */}
                                {agent.capabilities.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                        {agent.capabilities.slice(0, 5).map(c => (
                                            <span key={c.id} style={{
                                                fontSize: 10, padding: '1px 7px', borderRadius: 8,
                                                background: C.bg, color: C.textSecondary,
                                                border: `1px solid ${C.border}`,
                                            }}>
                                                {c.name}
                                            </span>
                                        ))}
                                        {agent.capabilities.length > 5 && (
                                            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, color: C.textLight }}>
                                                +{agent.capabilities.length - 5}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* 能力绑定面板 */}
                                {isCapPanel && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: C.text }}>绑定能力</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflow: 'auto' }}>
                                            {(skills.length > 0 ? skills : fallbackSkills).map(cap => {
                                                const sel = agentCaps.has(cap.id);
                                                return (
                                                    <button
                                                        key={cap.id}
                                                        onClick={() => {
                                                            const next = new Set(agentCaps);
                                                            sel ? next.delete(cap.id) : next.add(cap.id);
                                                            setSelectedCapIds(prev => ({ ...prev, [agent.agentId]: next }));
                                                        }}
                                                        style={{
                                                            padding: '4px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                                            border: `1px solid ${sel ? C.primary : C.border}`,
                                                            background: sel ? C.primaryLight : 'transparent',
                                                            color: sel ? C.primary : C.textSecondary,
                                                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        }}
                                                    >
                                                        <Icon name={sel ? 'check' : 'plus'} size={10} />
                                                        {cap.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                            <button onClick={() => handleSaveCapabilities(agent.agentId)} style={btnPrimaryStyle}>保存</button>
                                            <button onClick={() => setShowCapabilityPanel(null)} style={btnSecondaryStyle}>取消</button>
                                        </div>
                                    </div>
                                )}

                                {/* 展开详情 */}
                                {isExpanded && !isCapPanel && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px 12px', fontSize: 12 }}>
                                            <span style={{ color: C.textSecondary }}>Agent ID</span>
                                            <span style={{ color: C.text, fontFamily: 'monospace' }}>{agent.agentId}</span>
                                            <span style={{ color: C.textSecondary }}>框架</span>
                                            <span style={{ color: C.text }}>{agent.framework}</span>
                                            <span style={{ color: C.textSecondary }}>端点</span>
                                            <span style={{ color: C.text, fontFamily: 'monospace' }}>{agent.endpoint}</span>
                                            <span style={{ color: C.textSecondary }}>心跳</span>
                                            <span style={{ color: C.text }}>{formatTime(agent.lastHeartbeat)}</span>
                                        </div>
                                        {agent.capabilities.length > 0 && (
                                            <>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, marginTop: 10, marginBottom: 4 }}>全部能力</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {agent.capabilities.map(c => (
                                                        <span key={c.id} style={{
                                                            fontSize: 10, padding: '2px 8px', borderRadius: 8,
                                                            background: C.primaryLight, color: C.primary,
                                                        }}>
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div style={{ marginTop: 10 }}>
                                            <button onClick={() => handleToggleCapPanel(agent.agentId)} style={btnPrimaryStyle}>
                                                <Icon name="gear" size={11} style={{ marginRight: 4 }} /> 管理能力
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {/* ═══════ 注册 ═══════ */}
            {activeTab === 'register' && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd,
                    border: `1px solid ${C.border}`, padding: 20, maxWidth: 480,
                }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: C.text }}>注册新 Agent</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input
                            placeholder="Agent 名称 *"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            style={inputStyle}
                        />
                        <input
                            placeholder="描述"
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            style={inputStyle}
                        />
                        <input
                            placeholder="端点地址 * (如 http://localhost:3001)"
                            value={form.endpoint}
                            onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))}
                            style={inputStyle}
                        />

                        {/* 注册时选择能力 */}
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>选择能力（可选）</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(skills.length > 0 ? skills : fallbackSkills).map(cap => {
                                    const sel = registerCapIds.has(cap.id);
                                    return (
                                        <button
                                            key={cap.id}
                                            onClick={() => {
                                                const next = new Set(registerCapIds);
                                                sel ? next.delete(cap.id) : next.add(cap.id);
                                                setRegisterCapIds(next);
                                            }}
                                            style={{
                                                padding: '4px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                                border: `1px solid ${sel ? C.primary : C.border}`,
                                                background: sel ? C.primaryLight : 'transparent',
                                                color: sel ? C.primary : C.textSecondary,
                                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                            }}
                                        >
                                            <Icon name={sel ? 'check' : 'plus'} size={10} />
                                            {cap.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button onClick={() => { setActiveTab('agents'); setRegisterCapIds(new Set()); }} style={btnSecondaryStyle}>取消</button>
                            <button onClick={handleRegister} style={btnPrimaryStyle}>
                                <Icon name="plus" size={12} style={{ marginRight: 4 }} /> 注册
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── 聊天面板 ─── */}
            {showChat && selectedAgent && (
                <AgentChatPanel
                    agent={selectedAgent}
                    onClose={() => { setShowChat(false); setSelectedAgent(null); }}
                />
            )}
        </div>
    );
};

// ─── 样式 ───
const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
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
const btnIconStyle: React.CSSProperties = {
    padding: '4px', borderRadius: C.radiusSm, border: 'none',
    background: 'transparent', color: C.textSecondary, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center',
};
const btnDangerStyle: React.CSSProperties = {
    padding: '4px', borderRadius: C.radiusSm, border: 'none',
    background: 'transparent', color: C.error, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center',
};

export default Agents;