// client/src/renderer/pages/TaskMarketplace.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../components/icons';
import { C } from '../styles/theme';
import { showToast } from '../components/Toast';
import { a2aTasksApi } from '../api/task.api';
import { orchestratorApi } from '../api/orchestrator.api';
import { useTaskExecutionStore } from '../store/taskExecution.store';
import { useAgentRegistryStore } from '../store/agentRegistry.store';
import { CollaborationFlowEnhanced } from '../components/Agent/CollaborationFlowEnhanced';
import { MOCK_TASKS } from '../data/mockTasks';
import type { A2ATask } from '@shared/types';
import { USE_MOCK } from '../config/env';

interface Rating {
    score: number;
    comment: string;
    ratedAt: number;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: '招募中', color: '#2ecc71' },
    ACCEPTED: { label: '已接取', color: '#3498db' },
    IN_PROGRESS: { label: '执行中', color: '#f39c12' },
    COMPLETED: { label: '已完成', color: '#95a5a6' },
    FAILED: { label: '失败', color: '#e74c3c' },
    CANCELLED: { label: '已取消', color: '#bdc3c7' },
};

const TaskMarketplace: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'market' | 'mine'>('market');
    const [tasks, setTasks] = useState<A2ATask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<A2ATask | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [executing, setExecuting] = useState(false);

    // 竞标
    const [bidForm, setBidForm] = useState({ bidAmount: 0, estimatedDays: 1, message: '' });
    const [showBidForm, setShowBidForm] = useState<string | null>(null);

    // 评分
    const [ratings, setRatings] = useState<Record<string, Rating>>(() => {
        try { return JSON.parse(localStorage.getItem('nexus_task_ratings') || '{}'); }
        catch { return {}; }
    });
    const [showRatingForm, setShowRatingForm] = useState<string | null>(null);
    const [ratingForm, setRatingForm] = useState({ score: 5, comment: '' });

    // 自动匹配
    const { registrations } = useAgentRegistryStore();
    const [showMatchPanel, setShowMatchPanel] = useState<string | null>(null);

    const { setCurrentTask, setShowFlow } = useTaskExecutionStore();

    // 发布表单
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        reward: 0,
        deadline: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            if (USE_MOCK) {
                setTimeout(() => { setTasks(MOCK_TASKS); setLoading(false); }, 300);
            } else {
                // ✅ 修复：list() 接受 (page, pageSize, status?)
                const data = await a2aTasksApi.list(1, 50);
                setTasks(data.tasks || []);
                setLoading(false);
            }
        } catch {
            showToast('获取任务列表失败', 'error');
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchTasks(); }, [fetchTasks]);

    // ─── 发布任务 ───
    const handleCreate = async () => {
        if (!createForm.title.trim() || !createForm.description.trim()) {
            showToast('请填写标题和描述', 'error');
            return;
        }
        setSubmitting(true);
        try {
            if (USE_MOCK) {
                const newTask: A2ATask = {
                    id: `a2a-mock-${Date.now()}`,
                    title: createForm.title,
                    description: createForm.description,
                    status: 'PENDING',
                    reward: createForm.reward,
                    clientId: 'u-current',
                    cost: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deadline: createForm.deadline || undefined,
                    client: { id: 'u-current', username: '当前用户' },
                    bids: [],
                };
                setTasks(prev => [newTask, ...prev]);
            } else {
                await a2aTasksApi.create({
                    title: createForm.title,
                    description: createForm.description,
                    reward: createForm.reward,
                    deadline: createForm.deadline || undefined,
                });
                await fetchTasks();
            }
            setShowCreateModal(false);
            setCreateForm({ title: '', description: '', reward: 0, deadline: '' });
            showToast('发布成功', 'success');
        } catch {
            showToast('发布失败', 'error');
        }
        setSubmitting(false);
    };

    // ─── 竞标 ───
    const handlePlaceBid = (taskId: string) => {
        if (bidForm.bidAmount <= 0) { showToast('请填写竞标金额', 'error'); return; }
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const mockBid = {
                id: `bid-mock-${Date.now()}`,
                taskId,
                agentId: 'agt-current',
                bidAmount: bidForm.bidAmount,
                estimatedDays: bidForm.estimatedDays,
                message: bidForm.message,
                status: 'PENDING' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                agent: { id: 'agt-current', name: '当前 Agent', owner: { username: '当前用户' } },
            };
            return { ...t, bids: [...(t.bids || []), mockBid] };
        }));
        setShowBidForm(null);
        setBidForm({ bidAmount: 0, estimatedDays: 1, message: '' });
        showToast('竞标已提交', 'success');
    };

    const handleAcceptBid = (taskId: string, bidId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const acceptedBid = (t.bids || []).find(b => b.id === bidId);
            return {
                ...t,
                status: 'ACCEPTED' as const,
                agentId: acceptedBid?.agentId,
                agent: acceptedBid?.agent,
                bids: (t.bids || []).map(b => ({
                    ...b,
                    status: b.id === bidId ? 'ACCEPTED' as const : 'REJECTED' as const,
                })),
            };
        }));
        showToast('已采纳该竞标', 'success');
    };

    // ─── 自动匹配 ───
    const handleAutoMatch = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const keywords = (task.title + ' ' + task.description).toLowerCase();
        const scored = registrations.map(agent => {
            let score = 0;
            const caps = agent.capabilities.map(c => c.name.toLowerCase() + ' ' + c.description.toLowerCase()).join(' ');
            if (caps.includes('测试') || caps.includes('test')) score += 10;
            if (caps.includes('数据') || caps.includes('data')) score += 10;
            if (caps.includes('文档') || caps.includes('doc')) score += 10;
            if (caps.includes('安全') || caps.includes('security')) score += 10;
            if (caps.includes('代码') || caps.includes('code') || caps.includes('review')) score += 10;
            if (caps.includes('分析') || caps.includes('analyze') || caps.includes('analysis')) score += 10;
            if (keywords.includes(agent.name.toLowerCase())) score += 15;
            if (agent.status === 'idle') score += 5;
            return { agent, score };
        });

        const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

        if (matched.length === 0) {
            showToast('未找到匹配的 Agent', 'error');
            return;
        }

        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const newBids = matched.map(m => ({
                id: `bid-auto-${Date.now()}-${m.agent.agentId}`,
                taskId,
                agentId: m.agent.agentId,
                bidAmount: task.reward * 0.9,
                estimatedDays: 3,
                message: `自动匹配：能力评分 ${m.score} 分`,
                status: 'PENDING' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                agent: { id: m.agent.agentId, name: m.agent.name, owner: { username: m.agent.name } },
            }));
            return { ...t, bids: [...(t.bids || []), ...newBids] };
        }));
        setShowMatchPanel(null);
        showToast(`已推荐 ${matched.length} 个匹配的 Agent`, 'success');
    };

    // ─── 执行任务 ───
    const handleExecute = async (task: A2ATask) => {
        setExecuting(true);
        try {
            if (USE_MOCK) {
                setCurrentTask({
                    taskId: task.id,
                    originalInput: task.description,
                    steps: [
                        {
                            stepId: 's1', capabilityId: 'crewai-plan', agentId: task.agentId || null,
                            input: task.description, output: '', status: 'running',
                            cost: 0, tokenCount: { input: 0, output: 0 },
                            startedAt: Date.now(), completedAt: null,
                        },
                    ],
                    status: 'running',
                    totalCost: 0,
                    totalTokens: { input: 0, output: 0 },
                    createdAt: Date.now(),
                    completedAt: null,
                });
                setShowFlow(true);
                setTimeout(() => {
                    setTasks(prev => prev.map(t =>
                        t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t
                    ));
                    setExecuting(false);
                }, 1000);
            } else {
                const result = await orchestratorApi.createTask({ input: task.description });
                setCurrentTask(result);
                setShowFlow(true);
                setExecuting(false);
            }
        } catch {
            showToast('执行失败', 'error');
            setExecuting(false);
        }
    };

    // ─── 评分 ───
    const handleSubmitRating = (taskId: string) => {
        if (ratingForm.score < 1 || ratingForm.score > 5) { showToast('请选择 1-5 星评分', 'error'); return; }
        const rating: Rating = { score: ratingForm.score, comment: ratingForm.comment, ratedAt: Date.now() };
        const updated = { ...ratings, [taskId]: rating };
        setRatings(updated);
        localStorage.setItem('nexus_task_ratings', JSON.stringify(updated));
        setShowRatingForm(null);
        setRatingForm({ score: 5, comment: '' });
        showToast('评分已提交', 'success');
    };

    const formatTime = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${Math.floor(diff / 86400000)}天前`;
    };

    const displayTasks = activeTab === 'mine'
        ? tasks.filter(t => t.clientId === 'u-current')
        : tasks;

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            {/* ─── 标题 ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text }}>任务市场</h1>
                <button onClick={() => setShowCreateModal(true)} style={btnPrimaryStyle}>
                    <Icon name="plus" size={14} style={{ marginRight: 4 }} /> 发布任务
                </button>
            </div>

            {/* ─── Tabs ─── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {(['market', 'mine'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={activeTab === tab ? tabActiveStyle : tabInactiveStyle}
                    >
                        {tab === 'market' ? '市场' : '我的任务'}
                        {activeTab === tab && (
                            <span style={{
                                fontSize: 10, background: 'rgba(255,255,255,0.2)',
                                padding: '1px 6px', borderRadius: 8, marginLeft: 4,
                            }}>
                                {displayTasks.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ─── 任务列表 ─── */}
            {loading && <div style={{ textAlign: 'center', padding: 40, color: C.textSecondary }}>加载中...</div>}
            {!loading && displayTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: C.textSecondary }}>
                    {activeTab === 'mine' ? '还没有发布过任务' : '市场上暂无任务'}
                </div>
            )}

            {!loading && displayTasks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {displayTasks.map(task => {
                        const status = STATUS_MAP[task.status] || { label: task.status, color: '#95a5a6' };
                        const isCreator = task.clientId === 'u-current';
                        const rating = ratings[task.id];
                        return (
                            <div key={task.id} style={{
                                background: C.cardBg, borderRadius: C.radiusMd,
                                border: `1px solid ${C.border}`, padding: 16,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{task.title}</span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 500, padding: '2px 8px',
                                                borderRadius: C.radiusSm, color: status.color,
                                                background: status.color + '20',
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                            }}>
                                                <Icon name="statusDot" size={7} color={status.color} />
                                                {status.label}
                                            </span>
                                        </div>
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
                                            {task.description}
                                        </p>
                                        <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 11, color: C.textLight, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <Icon name="billing" size={11} /> ¥{task.reward}
                                            </span>
                                            {task.deadline && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <Icon name="clock" size={11} /> 截止 {new Date(task.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                <Icon name="calendar" size={11} /> {formatTime(task.createdAt)}
                                            </span>
                                            {task.client && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <Icon name="user" size={11} /> {task.client.username}
                                                </span>
                                            )}
                                            {task.agent && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <Icon name="bot" size={11} /> {task.agent.name}
                                                </span>
                                            )}
                                            {(task.bids?.length || 0) > 0 && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <Icon name="comment" size={11} /> {task.bids!.length} 个竞标
                                                </span>
                                            )}
                                        </div>
                                        {rating && (
                                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ display: 'flex', gap: 1 }}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Icon key={star} name="star" size={11}
                                                              color={star <= rating.score ? '#f39c12' : C.textLight}
                                                              fill={star <= rating.score}
                                                        />
                                                    ))}
                                                </span>
                                                <span style={{ fontSize: 11, color: C.textSecondary }}>
                                                    {rating.comment || '已评分'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        {task.status === 'PENDING' && !isCreator && (
                                            <button onClick={() => setShowBidForm(showBidForm === task.id ? null : task.id)} style={btnSecondaryStyle}>
                                                <Icon name="plus" size={12} style={{ marginRight: 4 }} /> 竞标
                                            </button>
                                        )}
                                        {task.status === 'PENDING' && isCreator && (
                                            <>
                                                <button onClick={() => setShowMatchPanel(showMatchPanel === task.id ? null : task.id)} style={btnSecondaryStyle}>
                                                    <Icon name="search" size={12} style={{ marginRight: 4 }} /> 匹配
                                                </button>
                                                <button onClick={() => handleExecute(task)} disabled={executing} style={btnPrimaryStyle}>
                                                    <Icon name="pipeline" size={12} style={{ marginRight: 4 }} /> 自执行
                                                </button>
                                            </>
                                        )}
                                        {(task.status === 'ACCEPTED' || task.status === 'IN_PROGRESS') && (
                                            <button onClick={() => handleExecute(task)} disabled={executing} style={btnPrimaryStyle}>
                                                <Icon name="pipeline" size={12} style={{ marginRight: 4 }} /> 执行
                                            </button>
                                        )}
                                        {task.status === 'COMPLETED' && !rating && (
                                            <button onClick={() => setShowRatingForm(showRatingForm === task.id ? null : task.id)} style={btnSecondaryStyle}>
                                                <Icon name="star" size={12} style={{ marginRight: 4 }} /> 评分
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)} style={btnIconStyle}>
                                            <Icon name={selectedTask?.id === task.id ? 'chevronUp' : 'chevronDown'} size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* 竞标表单 */}
                                {showBidForm === task.id && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>提交竞标</div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                            <div>
                                                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 2 }}>竞标金额 (¥)</label>
                                                <input type="number" value={bidForm.bidAmount || ''}
                                                       onChange={e => setBidForm(p => ({ ...p, bidAmount: Math.max(0, Number(e.target.value)) }))}
                                                       style={{ ...inputStyle, width: 100 }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 2 }}>预估天数</label>
                                                <input type="number" value={bidForm.estimatedDays}
                                                       onChange={e => setBidForm(p => ({ ...p, estimatedDays: Math.max(1, Number(e.target.value)) }))}
                                                       style={{ ...inputStyle, width: 80 }} />
                                            </div>
                                        </div>
                                        <textarea placeholder="留言（可选）" value={bidForm.message}
                                                  onChange={e => setBidForm(p => ({ ...p, message: e.target.value }))}
                                                  style={{ ...inputStyle, width: '100%', resize: 'vertical', minHeight: 50, marginBottom: 8 }} />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => handlePlaceBid(task.id)} style={btnPrimaryStyle}>提交竞标</button>
                                            <button onClick={() => setShowBidForm(null)} style={btnSecondaryStyle}>取消</button>
                                        </div>
                                    </div>
                                )}

                                {/* 自动匹配面板 */}
                                {showMatchPanel === task.id && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>
                                            <Icon name="search" size={13} style={{ marginRight: 4 }} /> Agent 自动匹配
                                        </div>
                                        <p style={{ fontSize: 12, color: C.textSecondary, margin: '0 0 8px' }}>
                                            基于任务关键词和能力描述自动推荐合适的 Agent
                                        </p>
                                        <button onClick={() => handleAutoMatch(task.id)} style={btnPrimaryStyle}>
                                            <Icon name="refresh" size={12} style={{ marginRight: 4 }} /> 开始匹配
                                        </button>
                                    </div>
                                )}

                                {/* 评分表单 */}
                                {showRatingForm === task.id && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>评价结果</div>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button key={star} onClick={() => setRatingForm(p => ({ ...p, score: star }))}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                                    <Icon name="star" size={22}
                                                          color={star <= ratingForm.score ? '#f39c12' : C.textLight}
                                                          fill={star <= ratingForm.score}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <textarea placeholder="评价（可选）" value={ratingForm.comment}
                                                  onChange={e => setRatingForm(p => ({ ...p, comment: e.target.value }))}
                                                  style={{ ...inputStyle, width: '100%', resize: 'vertical', minHeight: 50, marginBottom: 8 }} />
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => handleSubmitRating(task.id)} style={btnPrimaryStyle}>提交评分</button>
                                            <button onClick={() => setShowRatingForm(null)} style={btnSecondaryStyle}>取消</button>
                                        </div>
                                    </div>
                                )}

                                {/* 展开 — 竞标列表 */}
                                {selectedTask?.id === task.id && (task.bids?.length || 0) > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>竞标列表 ({task.bids!.length})</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {task.bids!.map(bid => (
                                                <div key={bid.id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '8px 12px', background: C.bg, borderRadius: C.radiusSm,
                                                    border: bid.status === 'ACCEPTED' ? `1px solid ${C.success}` : `1px solid ${C.border}`,
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: 13, color: C.text }}>
                                                            {bid.agent?.name || bid.agentId}
                                                            {bid.agent?.owner && <span style={{ color: C.textLight, marginLeft: 4 }}>@{bid.agent.owner.username}</span>}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 2, display: 'flex', gap: 12 }}>
                                                            <span>¥{bid.bidAmount}</span>
                                                            <span>{bid.estimatedDays} 天</span>
                                                            {bid.message && <span>{bid.message}</span>}
                                                            <span style={{ color: bid.status === 'ACCEPTED' ? C.success : bid.status === 'REJECTED' ? C.error : C.textLight }}>
                                                                {bid.status === 'PENDING' ? '待审核' : bid.status === 'ACCEPTED' ? '已采纳' : '已拒绝'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isCreator && task.status === 'PENDING' && bid.status === 'PENDING' && (
                                                        <button onClick={() => handleAcceptBid(task.id, bid.id)} style={btnPrimaryStyle}>
                                                            <Icon name="check" size={12} style={{ marginRight: 4 }} /> 采纳
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedTask?.id === task.id && task.output && (
                                    <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: C.radiusSm, border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>执行结果</div>
                                        <pre style={{ margin: 0, fontSize: 12, color: C.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {task.output}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── 发布弹窗 ─── */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)',
                }} onClick={() => setShowCreateModal(false)}>
                    <div style={{
                        background: C.cardBg, borderRadius: C.radiusMd,
                        padding: 24, width: 480, maxWidth: '90vw',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.text }}>发布任务</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <input placeholder="任务标题" value={createForm.title}
                                   onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
                            <textarea placeholder="任务描述" value={createForm.description}
                                      onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                                      style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 2 }}>赏金 (¥)</label>
                                    <input type="number" value={createForm.reward || ''}
                                           onChange={e => setCreateForm(p => ({ ...p, reward: Math.max(0, Number(e.target.value)) }))}
                                           style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 11, color: C.textSecondary, display: 'block', marginBottom: 2 }}>截止日期</label>
                                    <input type="date" value={createForm.deadline}
                                           onChange={e => setCreateForm(p => ({ ...p, deadline: e.target.value }))}
                                           style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button onClick={() => setShowCreateModal(false)} style={btnSecondaryStyle}>取消</button>
                                <button onClick={handleCreate} disabled={submitting} style={btnPrimaryStyle}>
                                    {submitting ? '发布中...' : '发布'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CollaborationFlowEnhanced />
        </div>
    );
};

// ─── 样式 ───
const tabActiveStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
    background: C.primary, color: C.textInverse, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
};
const tabInactiveStyle: React.CSSProperties = {
    padding: '6px 14px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.textSecondary, cursor: 'pointer',
    fontSize: 13, display: 'inline-flex', alignItems: 'center',
};
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

export default TaskMarketplace;