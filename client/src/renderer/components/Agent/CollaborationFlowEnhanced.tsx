// client/src/renderer/components/Agent/CollaborationFlowEnhanced.tsx
// 增强版协作流可视化
// - 步骤级成本显示
// - 终止/重试按钮
// - 实时日志行展开
// - 完全对齐 taskExecution.store 的 updateStep 聚合逻辑

import React, { useState, useEffect, useRef } from 'react';
import { useTaskExecutionStore } from '../../store/taskExecution.store';
import {Icon, IconName} from '../icons';
import { C } from '../../styles/theme';

const FRAMEWORK_COLORS: Record<string, string> = {
    crewai: '#00B894',
    langgraph: '#74B9FF',
    openclaw: '#FDCB6E',
};

const STEP_LABELS: Record<string, string> = {
    'crewai-plan': '计划员 (CrewAI)',
    'crewai-research': '研究员 (CrewAI)',
    'crewai-write': '撰稿人 (CrewAI)',
    'langgraph-analyze': '分析节点 (LangGraph)',
    'langgraph-research': '研究节点 (LangGraph)',
    'langgraph-decide': '决策节点 (LangGraph)',
    'langgraph-respond': '输出节点 (LangGraph)',
    'task-decompose': '任务分解',
    'subtask-execute': '子任务执行',
    'result-aggregate': '结果聚合',
};

// 步骤对应的图标名（按 capabilityId 首段匹配）
const STEP_ICONS: Record<string, IconName> = {
    'crewai': 'bot',
    'langgraph': 'network',
    'task-decompose': 'tasks',
    'subtask-execute': 'cpu',
    'result-aggregate': 'pipeline',
};

export const CollaborationFlowEnhanced: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { currentTask, showFlow, setShowFlow, clearCurrent, updateStep } = useTaskExecutionStore();
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!showFlow) {
            setExpandedSteps(new Set());
        }
    }, [showFlow]);

    if (!showFlow) return null;

    const getStepColor = (step: { status: string }) => {
        if (step.status === 'completed') return C.success;
        if (step.status === 'running') return C.warning;
        if (step.status === 'failed') return C.error;
        return C.textLight;
    };

    const getStepIconName = (status: string): IconName => {
        if (status === 'completed') return 'success';
        if (status === 'running') return 'loading';
        if (status === 'failed') return 'error';
        return 'circle';
    };

    const getStepIcon = (capabilityId: string): IconName => {
        const prefix = capabilityId.split('-')[0];
        return STEP_ICONS[prefix] || STEP_ICONS[capabilityId] || 'node';
    };

    const toggleExpand = (stepId: string) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
            return next;
        });
    };

    const handleRetry = (stepId: string) => {
        updateStep(stepId, {
            status: 'pending',
            error: undefined,
            output: '',
            cost: 0,
            tokenCount: { input: 0, output: 0 },
            startedAt: null,
            completedAt: null,
        });
    };

    const handleAbort = () => {
        if (!currentTask) return;
        currentTask.steps.forEach(s => {
            if (s.status === 'running') {
                updateStep(s.stepId, { status: 'failed', error: '用户终止', completedAt: Date.now() });
            }
        });
    };

    const handleClose = () => {
        setShowFlow(false);
        clearCurrent();
        onClose?.();
    };

    const task = currentTask;
    if (!task) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 2000, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
        }}>
            <div style={{
                width: 680, maxHeight: '85vh',
                background: C.cardBg, borderRadius: C.radiusLg,
                boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }} onClick={e => e.stopPropagation()}>
                {/* 头部 */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon name="bot" size={20} /> 协作执行流
                        </h3>
                        <span style={{ fontSize: 12, color: C.textSecondary }}>
                            ID: {task.taskId.slice(0, 8)}... | 状态: {task.status === 'running' ? '运行中' : task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '等待中'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {task.status === 'running' && (
                            <button onClick={handleAbort} style={{
                                padding: '6px 14px', borderRadius: 6, border: 'none',
                                background: C.error, color: '#fff', fontSize: 12, cursor: 'pointer',
                            }}>
                                终止
                            </button>
                        )}
                        <button onClick={handleClose} style={{
                            padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`,
                            background: 'transparent', color: C.textSecondary, fontSize: 12, cursor: 'pointer',
                        }}>
                            关闭
                        </button>
                    </div>
                </div>

                {/* 步骤列表 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                    {task.steps.map((step, idx) => {
                        const stepLabel = STEP_LABELS[step.capabilityId] || step.capabilityId;
                        const isExpanded = expandedSteps.has(step.stepId);
                        return (
                            <div key={step.stepId} style={{
                                marginBottom: 8, borderRadius: 8, border: `1px solid ${C.border}`,
                                background: C.bg,
                            }}>
                                {/* 步骤头 */}
                                <div onClick={() => toggleExpand(step.stepId)} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '12px 14px', cursor: 'pointer',
                                    borderBottom: isExpanded ? `1px solid ${C.border}` : 'none',
                                }}>
                                    <Icon
                                        name={getStepIconName(step.status)}
                                        size={16}
                                        color={getStepColor(step)}
                                    />
                                    <Icon
                                        name={getStepIcon(step.capabilityId)}
                                        size={18}
                                        color={C.text}
                                        strokeWidth={1.5}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{stepLabel}</div>
                                        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                                            {step.agentId ? `Agent: ${step.agentId} | ` : ''}
                                            Token: {step.tokenCount.input + step.tokenCount.output} |
                                            费用: ¥{step.cost.toFixed(4)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {step.status === 'failed' && (
                                            <button onClick={(e) => { e.stopPropagation(); handleRetry(step.stepId); }} style={{
                                                padding: '4px 10px', borderRadius: 4, border: 'none',
                                                background: C.warning, color: '#333', fontSize: 12, cursor: 'pointer',
                                            }}>重试</button>
                                        )}
                                        {step.status === 'running' && (
                                            <span style={{ fontSize: 12, color: C.warning }}>运行中...</span>
                                        )}
                                        <Icon
                                            name={isExpanded ? 'chevronUp' : 'chevronDown'}
                                            size={14}
                                            color={C.textLight}
                                        />
                                    </div>
                                </div>

                                {/* 展开内容 */}
                                {isExpanded && (
                                    <div style={{ padding: '10px 14px' }}>
                                        {step.output && (
                                            <div style={{
                                                fontSize: 13, color: C.text,
                                                background: C.cardBg, borderRadius: 6,
                                                padding: '8px 12px', marginBottom: 8,
                                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                                maxHeight: 200, overflowY: 'auto',
                                            }}>
                                                {step.output}
                                            </div>
                                        )}
                                        {step.error && (
                                            <div style={{
                                                fontSize: 13, color: C.error,
                                                background: `${C.error}10`, borderRadius: 6,
                                                padding: '8px 12px', marginBottom: 8,
                                                display: 'flex', alignItems: 'center', gap: 6,
                                            }}>
                                                <Icon name="error" size={14} color={C.error} />
                                                {step.error}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
                                            {step.startedAt && `开始: ${new Date(step.startedAt).toLocaleTimeString()}`}
                                            {step.completedAt && ` | 完成: ${new Date(step.completedAt).toLocaleTimeString()}`}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 底部汇总 */}
                {task.status === 'completed' || task.status === 'failed' ? (
                    <div style={{
                        padding: '12px 20px', borderTop: `1px solid ${C.border}`,
                        fontSize: 13, color: task.status === 'completed' ? C.success : C.error,
                        textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <Icon
                            name={task.status === 'completed' ? 'success' : 'error'}
                            size={16}
                            color={task.status === 'completed' ? C.success : C.error}
                        />
                        {task.status === 'completed' ? '全部步骤已完成' : '部分步骤失败'}
                    </div>
                ) : null}
            </div>
        </div>
    );
};