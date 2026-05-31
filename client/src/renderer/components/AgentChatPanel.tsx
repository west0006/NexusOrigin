// client/src/renderer/components/AgentChatPanel.tsx
// Agent 对话面板（极简扁平风格）

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { C } from '../styles/theme';
import { Icon } from './icons';
import { ollamaChat, checkOllamaHealth } from '../api/llm/local-ollama';
import type { AgentRegistration } from '../store/agentRegistry.store';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Props {
    agent: AgentRegistration;
    onClose: () => void;
}

const AgentChatPanel: React.FC<Props> = ({ agent, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: 'assistant',
        content: `你好！我是 **${agent.name}**，基于 ${agent.framework} 框架。有什么我可以帮你的？`,
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingText]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        const userMsg: ChatMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        setStreamingText('');

        try {
            const health = await checkOllamaHealth();
            if (!health) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `<Icon name="warning" size={14} /> Ollama 服务未启动，请先启动 Ollama`,
                }]);
                setLoading(false);
                return;
            }
            let fullContent = '';
            await ollamaChat({
                messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                onChunk: (token: string) => {
                    fullContent += token;
                    setStreamingText(fullContent);
                },
            });
            setStreamingText('');
            setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '请求失败，请检查网络或 Ollama 服务',
            }]);
        }
        setLoading(false);
    }, [input, loading, messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void handleSend();
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: C.bg, color: C.text,
        }}>
            {/* 标题栏 */}
            <div style={{
                padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon
                        name="statusDot"
                        size={10}
                        color={agent.status === 'idle' ? C.success : agent.status === 'busy' ? C.warning : C.textLight}
                    />
                    <div>
                        <div style={{ fontSize: C.textSubhead, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="bot" size={16} />
                            {agent.name}
                        </div>
                        <div style={{ fontSize: C.textCaption, color: C.textLight, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="cpu" size={11} /> {agent.framework}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} style={{
                    padding: '4px 10px', borderRadius: C.radiusSm, fontSize: C.textCaption,
                    border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.textSecondary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                    <Icon name="x" size={12} /> 关闭
                </button>
            </div>

            {/* 消息列表 */}
            <div style={{
                flex: 1, overflow: 'auto', padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
            }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        maxWidth: '80%', padding: '8px 14px', borderRadius: C.radiusMd,
                        background: msg.role === 'user' ? C.primary : C.cardBg,
                        color: msg.role === 'user' ? C.textInverse : C.text,
                        fontSize: C.textBodySm, lineHeight: 1.6,
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        whiteSpace: 'pre-wrap',
                    }}>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: msg.content
                                    .replace(/\n/g, '<br/>')
                                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/`([^`]+)`/g, '<code style="background:#eee;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>'),
                            }}
                        />
                    </div>
                ))}
                {loading && streamingText && (
                    <div style={{
                        maxWidth: '80%', padding: '8px 14px', borderRadius: C.radiusMd,
                        background: C.cardBg, color: C.text,
                        fontSize: C.textBodySm, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>
                        {streamingText}
                        <span style={{ animation: 'blink 1s infinite', marginLeft: 2 }}>▍</span>
                    </div>
                )}
                {loading && !streamingText && (
                    <div style={{
                        maxWidth: '80%', padding: '8px 14px', borderRadius: C.radiusMd,
                        background: C.cardBg, color: C.textLight, fontSize: C.textBodySm,
                        display: 'flex', alignItems: 'center', gap: 6, fontStyle: 'italic',
                    }}>
                        <Icon name="loading" size={14} /> 思考中...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div style={{
                padding: '10px 16px', borderTop: `1px solid ${C.border}`,
                display: 'flex', gap: 8, alignItems: 'flex-end',
            }}>
                <textarea
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: C.radiusSm,
                        border: `1px solid ${C.border}`, background: C.cardBg,
                        color: C.text, fontSize: C.textBodySm, resize: 'none',
                        minHeight: 36, maxHeight: 100, outline: 'none',
                    }}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`向 ${agent.name} 提问...`}
                    rows={1}
                />
                <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || loading}
                    style={{
                        padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                        background: C.primary, color: C.textInverse, cursor: 'pointer',
                        fontSize: C.textCaption, fontWeight: 600, whiteSpace: 'nowrap',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        opacity: (!input.trim() || loading) ? 0.4 : 1,
                    }}
                >
                    <Icon name="arrowUp" size={12} /> 发送
                </button>
            </div>
        </div>
    );
};

export default AgentChatPanel;