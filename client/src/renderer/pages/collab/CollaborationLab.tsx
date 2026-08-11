// client/src/renderer/pages/CollaborationLab.tsx
// 协作实验室（增强版：模板保存/加载 + 步骤排序 + 执行历史 + 流式可视化）
// 极简扁平风格，统一使用 C token

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '../../components/icons';
import { C } from '../../styles/theme';
import { showToast } from '../../components/Toast';
import { pythonService } from '../../api/ipc/pythonService';
import { CollaborationFlowEnhanced } from '../../components/Agent/CollaborationFlowEnhanced';
import { useTaskExecutionStore } from '../../store/taskExecution.store';


interface StepDef {
    name: string;
    capabilityId: string;
}

interface StepStatus {
    stepId: string;
    name: string;
    capabilityId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output: string;
    cost: number;
    tokens: { input: number; output: number };
    error?: string;
}

interface PipelineTemplate {
    id: string;
    name: string;
    framework: 'single' | 'cross' | 'custom';
    steps: StepDef[];
    createdAt: number;
}

interface ExecRecord {
    id: string;
    input: string;
    framework: string;
    steps: StepStatus[];
    finalOutput: string;
    totalCost: number;
    totalTokens: number;
    executedAt: number;
}

type FrameworkType = 'single' | 'cross' | 'custom';

const FRAMEWORK_COLORS: Record<string, string> = {
    single: '#00B894',
    cross: '#74B9FF',
    custom: '#FDCB6E',
};

const FRAMEWORK_LABELS: Record<FrameworkType, string> = {
    single: 'CrewAI 单框架',
    cross: 'LangGraph 多节点',
    custom: '自定义流水线',
};

const SYSTEM_PROMPTS: Record<string, string> = {
    'crewai-plan': `你是项目规划员。请分析用户的需求，将其分解为 2-4 个具体的子任务。每个子任务用 "- " 开头。只输出任务列表，不要额外解释。`,
    'crewai-research': `你是研究员。基于用户的问题和已有上下文，提供详细、准确的分析和见解。引用具体的信息点。`,
    'crewai-write': `你是撰稿人。请将前面的分析结果整合成一份结构清晰、语言流畅的最终回答。使用标题和段落组织内容。`,
    'langgraph-analyze': `你是分析专家。请对用户的输入进行深度分析，提取关键要素，并给出专业见解。`,
    'langgraph-research': `你是研究员。请对分析结果进行深入研究，查找关联信息，补充论据。`,
    'langgraph-decide': `你是决策专家。请基于前面的分析结果，做出最优决策方案。列出优缺点对比。`,
    'langgraph-respond': `你是输出整合专家。请将所有阶段的结果整合为一份结构清晰、语言流畅的最终回答。`,
    'task-decompose': `你是任务分解专家。请将用户的任务分解为可执行的子任务，标注依赖关系和优先级。`,
    'subtask-execute': `你是执行专家。请依次执行子任务，每个步骤给出中间输出。`,
    'result-aggregate': `你是结果聚合专家。请将所有子任务的输出合并成一份完整的最终报告。`,
};

const ALL_CAPABILITIES: { id: string; name: string; group: string }[] = [
    { id: 'crewai-plan', name: '规划员', group: 'CrewAI' },
    { id: 'crewai-research', name: '研究员', group: 'CrewAI' },
    { id: 'crewai-write', name: '撰稿人', group: 'CrewAI' },
    { id: 'langgraph-analyze', name: '分析节点', group: 'LangGraph' },
    { id: 'langgraph-research', name: '研究节点', group: 'LangGraph' },
    { id: 'langgraph-decide', name: '决策节点', group: 'LangGraph' },
    { id: 'langgraph-respond', name: '输出节点', group: 'LangGraph' },
    { id: 'task-decompose', name: '任务分解', group: '自定义' },
    { id: 'subtask-execute', name: '子任务执行', group: '自定义' },
    { id: 'result-aggregate', name: '结果聚合', group: '自定义' },
];

const CollaborationLab: React.FC = () => {
    const [framework, setFramework] = useState<FrameworkType>('single');
    const [input, setInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [steps, setSteps] = useState<StepStatus[]>([]);
    const [finalOutput, setFinalOutput] = useState('');
    const [cost, setCost] = useState({ tokens: 0, estimatedUsd: 0 });
    const [ollamaOk, setOllamaOk] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // 模板
    const [templates, setTemplates] = useState<PipelineTemplate[]>(() => {
        try { return JSON.parse(localStorage.getItem('nexus_pipeline_templates') || '[]'); }
        catch { return []; }
    });
    const [showTemplatePanel, setShowTemplatePanel] = useState(false);
    const [templateName, setTemplateName] = useState('');

    // 自定义步骤编辑
    const [customSteps, setCustomSteps] = useState<StepDef[]>([
        { name: '任务分解', capabilityId: 'task-decompose' },
        { name: '子任务执行', capabilityId: 'subtask-execute' },
        { name: '结果聚合', capabilityId: 'result-aggregate' },
    ]);

    // 执行历史
    const [execHistory, setExecHistory] = useState<ExecRecord[]>(() => {
        try { return JSON.parse(localStorage.getItem('nexus_exec_history') || '[]'); }
        catch { return []; }
    });
    const [showHistory, setShowHistory] = useState(false);

    const { setCurrentTask, setShowFlow, updateStep } = useTaskExecutionStore();

    useEffect(() => {
        pythonService.healthCheck('crewai').then(() => setOllamaOk(true)).catch(() => setOllamaOk(false));
    }, []);

    const toast = {
        success: (m: string) => showToast(m, 'success'),
        error: (m: string) => showToast(m, 'error'),
        info: (m: string) => showToast(m),
    };

    const getStepDefs = (): StepDef[] => {
        if (framework === 'single') {
            return [
                { name: '规划员', capabilityId: 'crewai-plan' },
                { name: '研究员', capabilityId: 'crewai-research' },
                { name: '撰稿人', capabilityId: 'crewai-write' },
            ];
        }
        if (framework === 'cross') {
            return [
                { name: '分析节点', capabilityId: 'langgraph-analyze' },
                { name: '研究节点', capabilityId: 'langgraph-research' },
                { name: '决策节点', capabilityId: 'langgraph-decide' },
                { name: '输出节点', capabilityId: 'langgraph-respond' },
            ];
        }
        return customSteps;
    };

    // ─── 模板管理 ───
    const saveTemplate = () => {
        if (!templateName.trim()) { toast.error('请输入模板名称'); return; }
        const tpl: PipelineTemplate = {
            id: Date.now().toString(36),
            name: templateName.trim(),
            framework,
            steps: getStepDefs(),
            createdAt: Date.now(),
        };
        const updated = [...templates, tpl];
        setTemplates(updated);
        localStorage.setItem('nexus_pipeline_templates', JSON.stringify(updated));
        setTemplateName('');
        toast.success('模板已保存');
    };

    const loadTemplate = (tpl: PipelineTemplate) => {
        setFramework(tpl.framework);
        if (tpl.framework === 'custom') {
            setCustomSteps(tpl.steps);
        }
        setShowTemplatePanel(false);
        toast.success(`已加载模板: ${tpl.name}`);
    };

    const deleteTemplate = (id: string) => {
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem('nexus_pipeline_templates', JSON.stringify(updated));
        toast.success('模板已删除');
    };

    // ─── 自定义步骤排序 ───
    const moveStep = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= customSteps.length) return;
        const updated = [...customSteps];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setCustomSteps(updated);
    };

    const addStep = (capabilityId: string) => {
        if (customSteps.some(s => s.capabilityId === capabilityId)) {
            toast.info('该步骤已在流水线中');
            return;
        }
        const cap = ALL_CAPABILITIES.find(c => c.id === capabilityId);
        if (!cap) return;
        setCustomSteps([...customSteps, { name: cap.name, capabilityId: cap.id }]);
    };

    const removeStep = (index: number) => {
        if (customSteps.length <= 1) { toast.error('至少保留一个步骤'); return; }
        setCustomSteps(customSteps.filter((_, i) => i !== index));
    };

    // ─── 历史回放 ───
    const replayHistory = (record: ExecRecord) => {
        setInput(record.input);
        setFramework(record.framework as FrameworkType);
        setSteps(record.steps);
        setFinalOutput(record.finalOutput);
        setCost({ tokens: record.totalTokens, estimatedUsd: record.totalCost });
        setShowHistory(false);
        toast.success('已回放历史执行记录');
    };

    const clearHistory = () => {
        setExecHistory([]);
        localStorage.removeItem('nexus_exec_history');
    };

    // ─── 运行 ───
    const handleStop = useCallback(() => {
        abortRef.current?.abort();
        setIsRunning(false);
        toast.info('已中止执行');
    }, [toast]);

    const handleStart = useCallback(async () => {
        const text = input.trim();
        if (!text) { toast.error('请输入任务描述'); return; }
        if (!ollamaOk) { toast.error('CrewAI 服务未启动'); return; }

        setIsRunning(true);
        setFinalOutput('');
        setCost({ tokens: 0, estimatedUsd: 0 });

        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        const stepDefs = getStepDefs();
        const initialSteps: StepStatus[] = stepDefs.map((sd, i) => ({
            stepId: `${sd.capabilityId}-${i}`,
            name: sd.name,
            capabilityId: sd.capabilityId,
            status: 'pending' as const,
            output: '',
            cost: 0,
            tokens: { input: 0, output: 0 },
        }));
        setSteps(initialSteps);

        try {
            // 使用 pythonService.executePipeline 调用 CrewAI 服务
            const response = await pythonService.executePipeline({
                service: framework === 'single' ? 'crewai' : 'langgraph',
                input: text,
                stream: true,
            });

            if (!response.ok) {
                throw new Error(`服务返回 ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('无法读取流式响应');

            const decoder = new TextDecoder();
            let buffer = '';
            let aggregatedOutput = '';
            let totalTokens = 0;
            let totalCost = 0;
            let currentStepIndex = -1;

            while (true) {
                const { done, value } = await reader.read();
                if (done || signal.aborted) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = JSON.parse(line.slice(6));
                    const { agent, content, cost: stepCost, tokenCount } = payload;

                    if (agent) {
                        // 新步骤开始
                        currentStepIndex = stepDefs.findIndex(sd => sd.capabilityId === agent);
                        if (currentStepIndex >= 0) {
                            setSteps(prev => prev.map((s, idx) =>
                                idx === currentStepIndex
                                    ? { ...s, status: 'running' as const, output: content || '' }
                                    : s
                            ));
                        }
                    } else if (content && currentStepIndex >= 0) {
                        // 内容流式更新
                        aggregatedOutput += content;
                        const stepChars = aggregatedOutput.length;
                        const stepTk = stepChars / 4;
                        totalTokens += content.length / 4;
                        totalCost += (content.length / 4 / 1000) * 0.001;
                        setCost({ tokens: Math.round(totalTokens), estimatedUsd: totalCost });
                        setSteps(prev => prev.map((s, idx) =>
                            idx === currentStepIndex
                                ? {
                                    ...s, output: aggregatedOutput,
                                    tokens: { input: Math.round(text.length / 4), output: Math.round(stepTk) },
                                }
                                : s
                        ));
                    }

                    if (stepCost !== undefined && currentStepIndex >= 0) {
                        setSteps(prev => prev.map((s, idx) =>
                            idx === currentStepIndex
                                ? { ...s, status: 'completed' as const, cost: stepCost }
                                : s
                        ));
                    }
                }
            }

            if (aggregatedOutput && !signal.aborted) {
                setFinalOutput(aggregatedOutput);
            }

            // 保存执行历史
            if (aggregatedOutput) {
                const currentSteps = steps; // 不能用 get, 直接用 state
                const record: ExecRecord = {
                    id: Date.now().toString(36),
                    input: text,
                    framework,
                    steps: steps.map((s: any) => ({ ...s })),
                    finalOutput: aggregatedOutput,
                    totalCost,
                    totalTokens: Math.round(totalTokens),
                    executedAt: Date.now(),
                };
                const updated = [record, ...execHistory].slice(0, 20);
                setExecHistory(updated);
                localStorage.setItem('nexus_exec_history', JSON.stringify(updated));
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            toast.error(err?.message || '执行失败');
        }

        setIsRunning(false);
    }, [input, framework, customSteps, ollamaOk, toast, execHistory, steps]);

    // ─── 渲染色 ───
    const stepColors: Record<string, string> = {
        pending: C.textLight, running: C.warning, completed: C.success, failed: C.error,
    };

    const currentStepDefs = getStepDefs();

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            {/* ─── 标题 ─── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text }}>协作实验室</h1>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSecondary }}>
                        {ollamaOk ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="check" size={14} color={C.success} /> Ollama 运行中
                            </span>
                        ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="warning" size={14} color={C.warning} /> Ollama 未启动
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowTemplatePanel(!showTemplatePanel)} style={btnSecondaryStyle}>
                        <Icon name="file" size={14} style={{ marginRight: 4 }} /> 模板
                    </button>
                    <button onClick={() => setShowHistory(!showHistory)} style={btnSecondaryStyle}>
                        <Icon name="clock" size={14} style={{ marginRight: 4 }} /> 历史
                    </button>
                    <button onClick={() => setShowFlow(true)} style={btnSecondaryStyle}>
                        <Icon name="pipeline" size={14} style={{ marginRight: 4 }} /> 流程图
                    </button>
                </div>
            </div>

            {/* ─── 模板面板 ─── */}
            {showTemplatePanel && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: 16, marginBottom: 16,
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: C.text }}>流水线模板</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input
                            placeholder="模板名称"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            style={inputStyle}
                        />
                        <button onClick={saveTemplate} style={btnPrimaryStyle}>保存当前</button>
                    </div>
                    {templates.length === 0 && (
                        <div style={{ fontSize: 12, color: C.textSecondary }}>暂无保存的模板，输入模板名称后点击"保存当前"</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {templates.map(tpl => (
                            <div key={tpl.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', background: C.bg, borderRadius: C.radiusSm,
                            }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{tpl.name}</span>
                                    <span style={{ fontSize: 11, color: C.textLight, marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <Icon name="cpu" size={10} /> {FRAMEWORK_LABELS[tpl.framework as FrameworkType]}
                                    </span>
                                    <span style={{ fontSize: 11, color: C.textLight, marginLeft: 8 }}>
                                        ({tpl.steps.length} 步)
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => loadTemplate(tpl)} style={btnPrimaryStyle}>加载</button>
                                    <button onClick={() => deleteTemplate(tpl.id)} style={btnDangerStyle}>
                                        <Icon name="trash" size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── 历史面板 ─── */}
            {showHistory && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: 16, marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>执行历史</span>
                        {execHistory.length > 0 && (
                            <button onClick={clearHistory} style={btnDangerStyle}>
                                <Icon name="trash" size={12} style={{ marginRight: 4 }} /> 清空
                            </button>
                        )}
                    </div>
                    {execHistory.length === 0 && (
                        <div style={{ fontSize: 12, color: C.textSecondary }}>暂无执行记录</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                        {execHistory.map((rec, idx) => (
                            <div key={rec.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', background: C.bg, borderRadius: C.radiusSm,
                            }}>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {rec.input.slice(0, 60)}{rec.input.length > 60 ? '...' : ''}
                                    </div>
                                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 2, display: 'flex', gap: 12 }}>
                                        <span>{new Date(rec.executedAt).toLocaleString()}</span>
                                        <span>{rec.framework}</span>
                                        <span>{rec.steps.filter(s => s.status === 'completed').length}/{rec.steps.length} 步完成</span>
                                        <span>¥{rec.totalCost.toFixed(6)}</span>
                                    </div>
                                </div>
                                <button onClick={() => replayHistory(rec)} style={btnSecondaryStyle}>
                                    <Icon name="refresh" size={12} style={{ marginRight: 4 }} /> 回放
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── 框架选择 ─── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(Object.keys(FRAMEWORK_LABELS) as FrameworkType[]).map(k => (
                    <button
                        key={k}
                        onClick={() => setFramework(k)}
                        style={{
                            padding: '8px 16px', borderRadius: C.radiusMd,
                            border: framework === k ? 'none' : `1px solid ${C.border}`,
                            background: framework === k ? FRAMEWORK_COLORS[k] : C.cardBg,
                            color: framework === k ? '#fff' : C.textSecondary,
                            cursor: 'pointer', fontSize: 13, fontWeight: framework === k ? 600 : 400,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <Icon name="cpu" size={14} />
                        {FRAMEWORK_LABELS[k]}
                    </button>
                ))}
            </div>

            {/* ─── 自定义步骤编辑 ─── */}
            {framework === 'custom' && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: 16, marginBottom: 16,
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>自定义流水线</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {customSteps.map((step, idx) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', background: C.bg, borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`,
                            }}>
                                <span style={{ fontSize: 11, color: C.textLight, minWidth: 20 }}>#{idx + 1}</span>
                                <Icon name="node" size={14} color={C.primary} />
                                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{step.name}</span>
                                <span style={{ fontSize: 11, color: C.textLight }}>{step.capabilityId}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                                            style={{ ...btnIconStyle, opacity: idx === 0 ? 0.3 : 1 }}>
                                        <Icon name="arrowUp" size={12} />
                                    </button>
                                    <button onClick={() => moveStep(idx, 1)} disabled={idx === customSteps.length - 1}
                                            style={{ ...btnIconStyle, opacity: idx === customSteps.length - 1 ? 0.3 : 1 }}>
                                        <Icon name="arrowDown" size={12} />
                                    </button>
                                    <button onClick={() => removeStep(idx)} style={btnIconStyle}>
                                        <Icon name="x" size={12} color={C.error} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* 添加步骤 */}
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {ALL_CAPABILITIES.filter(c => !customSteps.some(s => s.capabilityId === c.id)).map(cap => (
                            <button key={cap.id} onClick={() => addStep(cap.id)}
                                    style={{
                                        padding: '3px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                        border: `1px solid ${C.border}`,
                                        background: C.bg, color: C.textSecondary, cursor: 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                    }}>
                                <Icon name="plus" size={10} /> {cap.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── 输入区 ─── */}
            <div style={{
                background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                padding: 16, marginBottom: 16,
            }}>
                <textarea
                    placeholder="输入任务描述，例如：分析 React 和 Vue 的优劣..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isRunning}
                    style={{
                        width: '100%', minHeight: 80, resize: 'vertical',
                        border: 'none', background: 'transparent',
                        color: C.text, fontSize: 13, outline: 'none',
                        fontFamily: 'inherit', lineHeight: 1.6,
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: C.textLight, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="cpu" size={12} /> {currentStepDefs.length} 步 ·
                        {framework === 'single' ? ' CrewAI' : framework === 'cross' ? ' LangGraph' : ' 自定义'}
                    </div>
                    {isRunning ? (
                        <button onClick={handleStop} style={{
                            padding: '6px 20px', borderRadius: C.radiusSm, border: 'none',
                            background: C.error, color: '#fff', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                        }}>
                            <Icon name="x" size={14} style={{ marginRight: 4 }} /> 中止
                        </button>
                    ) : (
                        <button onClick={handleStart} disabled={!input.trim() || !ollamaOk} style={{
                            padding: '6px 20px', borderRadius: C.radiusSm, border: 'none',
                            background: !input.trim() || !ollamaOk ? C.border : C.primary,
                            color: !input.trim() || !ollamaOk ? C.textLight : C.textInverse,
                            cursor: !input.trim() || !ollamaOk ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center',
                        }}>
                            <Icon name="pipeline" size={14} style={{ marginRight: 4 }} /> 执行流水线
                        </button>
                    )}
                </div>
            </div>

            {/* ─── 步骤执行状态 ─── */}
            {steps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {steps.map(step => (
                        <div key={step.stepId} style={{
                            background: C.cardBg, borderRadius: C.radiusMd,
                            border: `1px solid ${step.status === 'running' ? C.warning : C.border}`,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 14px',
                                borderBottom: step.output ? `1px solid ${C.border}` : 'none',
                            }}>
                                <Icon
                                    name={step.status === 'pending' ? 'circle' : step.status === 'running' ? 'loading' : step.status === 'completed' ? 'success' : 'error'}
                                    size={14}
                                    color={stepColors[step.status]}
                                />
                                <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>
                                    {step.name}
                                </span>
                                {step.cost > 0 && (
                                    <span style={{ fontSize: 11, color: '#f39c12' }}>
                                        ¥{step.cost.toFixed(6)}
                                    </span>
                                )}
                                <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                    background: stepColors[step.status] + '20',
                                    color: stepColors[step.status],
                                }}>
                                    {step.status === 'pending' ? '等待中' : step.status === 'running' ? '执行中' : step.status === 'completed' ? '完成' : '失败'}
                                </span>
                            </div>
                            {step.output && (
                                <pre style={{
                                    margin: 0, padding: '10px 14px', fontSize: 12,
                                    color: C.textSecondary, background: C.bg,
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    maxHeight: 200, overflow: 'auto',
                                }}>
                                    {step.output}
                                </pre>
                            )}
                            {step.error && (
                                <div style={{ padding: '8px 14px', fontSize: 12, color: C.error, background: C.error + '10' }}>
                                    {step.error}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ─── 成本汇总 ─── */}
            {cost.tokens > 0 && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: '10px 16px', marginBottom: 16,
                    display: 'flex', justifyContent: 'space-between', fontSize: 13,
                }}>
                    <span style={{ color: C.textSecondary }}>Token 消耗：<span style={{ color: C.text, fontWeight: 600 }}>{cost.tokens.toLocaleString()}</span></span>
                    <span style={{ color: C.textSecondary }}>预估费用：<span style={{ color: '#f39c12', fontWeight: 600 }}>¥{cost.estimatedUsd.toFixed(6)}</span></span>
                </div>
            )}

            {/* ─── 最终输出 ─── */}
            {finalOutput && (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: 16, marginBottom: 16,
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: C.text }}>最终输出</div>
                    <pre style={{
                        margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        background: C.bg, padding: 12, borderRadius: C.radiusSm,
                    }}>
                        {finalOutput}
                    </pre>
                </div>
            )}

            {/* ─── 流式可视化浮窗 ─── */}
            <CollaborationFlowEnhanced />
        </div>
    );
};

// ─── 样式 ───
const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 13, outline: 'none', flex: 1,
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
    padding: '4px 10px', borderRadius: C.radiusSm, border: `1px solid ${C.error}`,
    background: 'transparent', color: C.error, cursor: 'pointer',
    fontSize: 12, display: 'inline-flex', alignItems: 'center',
};
const btnIconStyle: React.CSSProperties = {
    padding: '4px', borderRadius: C.radiusSm, border: 'none',
    background: 'transparent', color: C.textSecondary, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center',
};

export default CollaborationLab;