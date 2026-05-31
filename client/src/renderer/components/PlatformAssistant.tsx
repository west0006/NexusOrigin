import React, { useState, useRef, useEffect } from 'react';
import { ollamaChat, checkOllamaHealth, OllamaError } from '../api/llm/local-ollama';
import { ASSISTANT_SYSTEM_PROMPT } from './Assistant/assistant-prompt';
import { C } from '../styles/theme';
import { pythonService } from '../api/ipc/pythonService';
import { useTaskExecutionStore } from '../store/taskExecution.store';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const QUICK_ACTIONS = [
    { label: '📊 平台概览', prompt: '介绍一下平台各个功能模块' },
    { label: '🤖 Agent 帮助', prompt: '如何创建和使用 Agent？' },
    { label: '💰 成本管理', prompt: '如何查看和管理平台成本？' },
    { label: '🔧 部署指南', prompt: '如何部署一个新模型？' },
];

// 协作确认弹窗组件
const CollaborationConfirmModal: React.FC<{
    open: boolean;
    input: string;
    onCrewAI: () => void;
    onLangGraph: () => void;
    onAll: () => void;
    onClose: () => void;
}> = ({ open, input, onCrewAI, onLangGraph, onAll, onClose }) => {
    if (!open) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 3000, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div style={{
                width: 420, background: C.cardBg, borderRadius: C.radiusLg,
                boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
                padding: 24,
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 8px', color: C.text }}>🤖 多智能体协作</h3>
                <p style={{ fontSize: C.textBodySm, color: C.textSecondary, margin: '0 0 16px' }}>
                    选择要运行的框架：
                </p>
                <div style={{ fontSize: C.textCaption, color: C.textLight, marginBottom: 12, padding: 8, background: `${C.bg}`, borderRadius: C.radiusSm }}>
                    "{input.slice(0, 80)}{input.length > 80 ? '...' : ''}"
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={onCrewAI} style={{
                        padding: '10px 16px', borderRadius: C.radiusSm,
                        background: '#6C5CE7', color: '#fff', border: 'none',
                        cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                    }}>
                        🚀 CrewAI 流水线（计划员 → 研究员 → 撰稿人）
                    </button>
                    <button onClick={onLangGraph} style={{
                        padding: '10px 16px', borderRadius: C.radiusSm,
                        background: '#74B9FF', color: '#fff', border: 'none',
                        cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                    }}>
                        🔄 LangGraph 状态图（分析 → 研究 → 决策 → 输出）
                    </button>
                    <button onClick={onAll} style={{
                        padding: '10px 16px', borderRadius: C.radiusSm,
                        background: C.success, color: '#fff', border: 'none',
                        cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                    }}>
                        🌐 全流程协作（CrewAI + LangGraph 串联）
                    </button>
                </div>
                <button onClick={onClose} style={{
                    marginTop: 12, padding: '8px 16px', borderRadius: C.radiusSm,
                    background: 'transparent', color: C.textSecondary,
                    border: `1px solid ${C.border}`, cursor: 'pointer',
                    width: '100%',
                }}>
                    取消
                </button>
            </div>
        </div>
    );
};

export const PlatformAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ollamaReady, setOllamaReady] = useState<boolean | null>(null);
    const [streamingContent, setStreamingContent] = useState('');
    const [showCollaborationModal, setShowCollaborationModal] = useState(false);
    const [collaborationInput, setCollaborationInput] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const setCurrentTask = useTaskExecutionStore(s => s.setCurrentTask);
    const addToHistory = useTaskExecutionStore(s => s.addToHistory);
    const setShowFlow = useTaskExecutionStore(s => s.setShowFlow);

    useEffect(() => {
        if (isOpen) checkOllamaHealth().then(setOllamaReady);
    }, [isOpen]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    const handleSend = async (text?: string) => {
        const content = (text || input).trim();
        if (!content || loading) return;

        const userMsg: Message = { role: 'user', content };
        setMessages(prev => [...prev, userMsg]);
        if (!text) setInput('');
        setLoading(true);
        setStreamingContent('');

        abortRef.current = new AbortController();

        // 检查是否是协作/调度请求
        const isCollaborationRequest = /协作|调度|多智能体|pipeline|crewai|langgraph|全流程|串联/i.test(content);

        if (isCollaborationRequest) {
            setLoading(false);
            setCollaborationInput(content);
            setShowCollaborationModal(true);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '检测到多智能体协作需求，请选择要运行的框架。',
            }]);
            return;
        }

        try {
            let fullReply = '';
            await ollamaChat({
                messages: [
                    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
                    ...messages.concat(userMsg).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                ],
                onChunk: (chunk) => {
                    fullReply += chunk;
                    setStreamingContent(fullReply);
                },
                signal: abortRef.current.signal,
            });

            setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
            setStreamingContent('');
        } catch (err: any) {
            if (err instanceof OllamaError) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠ Ollama 错误: ${err.message}`,
                }]);
            } else if (err.name !== 'AbortError') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠ 请求失败，请检查 Ollama 是否运行。',
                }]);
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    };

    const runPipeline = async (service: 'crewai' | 'langgraph') => {
        setShowCollaborationModal(false);
        setLoading(true);

        try {
            const res = await pythonService.executePipeline({
                service,
                input: collaborationInput,
                stream: true,
            });

            // 创建任务并显示流程图
            const task = {
                taskId: `task-${Date.now()}`,
                originalInput: collaborationInput,
                steps: [],
                status: 'running' as const,
                totalCost: 0,
                totalTokens: { input: 0, output: 0 },
                createdAt: Date.now(),
                completedAt: null,
            };
            setCurrentTask(task);
            addToHistory(task);
            setShowFlow(true);

            // SSE 读取
            const reader = res.body?.getReader();
            if (!reader) throw new Error('无响应流');
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            if (data.output) {
                                setMessages(prev => [...prev, { role: 'assistant', content: data.output }]);
                                setCurrentTask(null);
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠ 执行失败: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const runBothPipelines = async () => {
        setShowCollaborationModal(false);
        setLoading(true);

        try {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '🔄 启动全流程协作: CrewAI → LangGraph\n',
            }]);

            // 先跑 CrewAI
            const crewRes = await pythonService.executePipeline({
                service: 'crewai', input: collaborationInput, stream: false,
            });
            const crewResult = crewRes.json ? await crewRes.json() : crewRes;
            const crewOutput = crewResult.output || '';

            // 再跑 LangGraph（将 CrewAI 输出作为上下文）
            const langRes = await pythonService.executePipeline({
                service: 'langgraph',
                input: `CrewAI 分析结果:\n${crewOutput}\n\n原始需求: ${collaborationInput}`,
                stream: false,
            });
            const langResult = langRes.json ? await langRes.json() : langRes;
            const finalOutput = langResult.output || '';

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `## ✓ 全流程协作完成\n\n### CrewAI 输出\n${crewOutput}\n\n### LangGraph 优化\n${finalOutput}`,
            }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠ 全流程失败: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        abortRef.current?.abort();
        setLoading(false);
    };

    return (
        <>
            {/* 浮动按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6C5CE7, #74B9FF)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(108,92,231,0.3)',
                    fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                {isOpen ? '✕' : '💬'}
            </button>

            {/* 面板 */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: 90, right: 24, zIndex: 1000,
                    width: 380, height: 520,
                    background: C.cardBg, borderRadius: C.radiusLg,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* 头部 */}
                    <div style={{
                        padding: '12px 16px', background: 'linear-gradient(135deg, #6C5CE7, #74B9FF)',
                        color: '#fff', fontWeight: 600, fontSize: C.textBody,
                    }}>
                        🤖 枢元平台助理
                        {ollamaReady === false && (
                            <span style={{ marginLeft: 8, fontSize: C.textCaption, opacity: 0.8 }}>
                                (Ollama 离线)
                            </span>
                        )}
                    </div>

                    {/* 快捷操作 */}
                    <div style={{
                        display: 'flex', gap: 4, padding: '8px 12px',
                        borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
                    }}>
                        {QUICK_ACTIONS.map(qa => (
                            <button
                                key={qa.label}
                                onClick={() => handleSend(qa.prompt)}
                                style={{
                                    padding: '4px 8px', borderRadius: C.radiusSm,
                                    background: C.bg, border: `1px solid ${C.border}`,
                                    cursor: 'pointer', fontSize: C.textCaption,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {qa.label}
                            </button>
                        ))}
                    </div>

                    {/* 消息列表 */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: 12,
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        {messages.length === 0 && (
                            <div style={{
                                textAlign: 'center', color: C.textLight,
                                padding: '40px 0', fontSize: C.textBodySm,
                            }}>
                                👋 你好！我是枢元平台助理，有什么可以帮助你的？
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '8px 12px', borderRadius: C.radiusSm,
                                background: msg.role === 'user' ? C.primary : C.bg,
                                color: msg.role === 'user' ? '#fff' : C.text,
                                fontSize: C.textBodySm, lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {msg.content}
                            </div>
                        ))}
                        {streamingContent && (
                            <div style={{
                                alignSelf: 'flex-start', maxWidth: '85%',
                                padding: '8px 12px', borderRadius: C.radiusSm,
                                background: C.bg, color: C.text,
                                fontSize: C.textBodySm, lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {streamingContent}
                                <span style={{ animation: 'blink 1s step-end infinite' }}>▍</span>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* 输入区 */}
                    <div style={{
                        padding: '8px 12px', borderTop: `1px solid ${C.border}`,
                        display: 'flex', gap: 8,
                    }}>
                        <input
                            ref={inputRef => inputRef?.focus()}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={ollamaReady === false ? 'Ollama 离线，输入仍可发送' : '输入消息...'}
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, fontSize: C.textBodySm,
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={loading ? handleCancel : () => handleSend()}
                            style={{
                                padding: '8px 16px', borderRadius: C.radiusSm,
                                background: loading ? C.error : C.primary,
                                color: '#fff', border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: C.textBodySm,
                            }}
                        >
                            {loading ? '停止' : '发送'}
                        </button>
                    </div>
                </div>
            )}

            {/* 协作确认弹窗 */}
            <CollaborationConfirmModal
                open={showCollaborationModal}
                input={collaborationInput}
                onCrewAI={() => runPipeline('crewai')}
                onLangGraph={() => runPipeline('langgraph')}
                onAll={runBothPipelines}
                onClose={() => setShowCollaborationModal(false)}
            />
        </>
    );
};