// client/src/renderer/pages/Assistant.tsx
// 极简扁平风格，统一使用 C token
// 整合上下文收集器 + 澄清模板 + 文本选中触发

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { C } from '../../styles/theme';
import { showToast } from '../../components/Toast';
import { useAppStore } from '../../store/app';
import { useAssistantStore } from '../../store/assistant.store';
import { COMMANDS, HELP_TEXT } from '../../components/Assistant/assistant-prompt';
import { intentToRoute, detectIntent } from '../../components/Assistant/intent-detector';
import {
    getClarifyTemplate,
    needsClarification,
    type ClarifyTemplate,
} from '../../components/Assistant/clarify-templates';
import { collectPageContext, formatContextForLLM } from '../../components/Assistant/context-collector';
import {Icon} from "@renderer/components/icons";

const Assistant: React.FC = () => {
    const {
        messages, input, loading, isStreaming,
        currentIntent,
        setInput, sendMessage, abortStream, newChat,
    } = useAssistantStore();

    const setRoute = useAppStore((s) => s.setRoute);
    const currentRoute = useAppStore((s) => s.currentRoute);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 文本选中状态
    const [selectedText, setSelectedText] = useState('');
    // 澄清模板
    const [template, setTemplate] = useState<ClarifyTemplate | null>(null);
    const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});

    // 自动滚动
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 意图 → 澄清模板 / 路由跳转
    useEffect(() => {
        if (currentIntent === 'unknown' || currentIntent === 'help' || currentIntent === 'cost_query') return;
        if (needsClarification(currentIntent)) {
            const t = getClarifyTemplate(currentIntent);
            if (t) { setTemplate(t); setClarifyAnswers({}); return; }
        }
        const route = intentToRoute(currentIntent);
        if (route) {
            const timer = setTimeout(() => {
                setRoute(route as any);
                useAssistantStore.setState({ currentIntent: 'unknown' });
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [currentIntent, setRoute]);

    // 文本选中监听（设计文档 2.2.1）
    useEffect(() => {
        const handler = () => {
            const sel = window.getSelection();
            const text = sel?.toString().trim();
            if (text && text.length > 2 && text.length < 500) {
                setSelectedText(text);
            } else {
                setSelectedText('');
            }
        };
        document.addEventListener('mouseup', handler);
        return () => document.removeEventListener('mouseup', handler);
    }, []);

    const handleProcessSelected = () => {
        if (!selectedText) return;
        const ctx = collectPageContext(currentRoute, { selectedText });
        setInput(`请帮我处理以下内容：\n\n${formatContextForLLM(ctx)}`);
        setSelectedText('');
        inputRef.current?.focus();
    };

    // 输入变化时检测意图
    const handleInputChange = useCallback((val: string) => {
        setInput(val);
        const intent = detectIntent(val);
        if (needsClarification(intent)) {
            const t = getClarifyTemplate(intent);
            if (t) setTemplate(t);
        } else {
            setTemplate(null);
        }
    }, [setInput]);

    // 澄清模板确认
    const handleClarifyConfirm = () => {
        if (!template) return;
        const refined = template.assemble(clarifyAnswers);
        setInput(refined);
        setTemplate(null);
        useAssistantStore.setState({ currentIntent: 'unknown' });
        inputRef.current?.focus();
    };

    // Ctrl+Enter 发送
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // 快捷命令点击
    const handleCommand = useCallback((cmd: string) => {
        setInput(cmd);
        inputRef.current?.focus();
    }, [setInput]);

    const cmdChipStyle: React.CSSProperties = {
        padding: '4px 10px', borderRadius: C.radiusSm, fontSize: C.textCaption,
        color: C.textSecondary, cursor: 'pointer', background: C.bg,
        border: `1px solid ${C.border}`,
        transition: 'all 0.15s',
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
                <div style={{ fontSize: C.textSubhead, fontWeight: 600 }}><Icon name="bot" size={20} color={C.primary} />  平台助理</div>
                <button
                    style={{
                        padding: '4px 12px', borderRadius: C.radiusSm, fontSize: C.textCaption,
                        border: `1px solid ${C.border}`, background: C.cardBg, color: C.textSecondary,
                        cursor: 'pointer',
                    }}
                    onClick={newChat}
                >
                    + 新对话
                </button>
            </div>

            {/* 快捷命令 */}
            <div style={{
                display: 'flex', gap: 6, padding: '8px 16px', flexWrap: 'wrap',
                borderBottom: `1px solid ${C.border}`,
            }}>
                {COMMANDS.map((c) => (
                    <span key={c.cmd} style={cmdChipStyle} onClick={() => handleCommand(c.cmd + ' ')}>
            {c.cmd} {c.label}
          </span>
                ))}
            </div>

            {/* 文本选中触发提示 */}
            {selectedText && (
                <div style={{
                    padding: '8px 16px', background: C.primaryLight,
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: C.textCaption, color: C.textSecondary,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📎 已选中：{selectedText.slice(0, 60)}{selectedText.length > 60 ? '…' : ''}
          </span>
                    <button
                        style={{
                            padding: '2px 10px', borderRadius: C.radiusSm, fontSize: C.textCaption,
                            border: 'none', background: C.primary, color: C.textInverse, cursor: 'pointer',
                        }}
                        onClick={handleProcessSelected}
                    >
                        让助手处理
                    </button>
                    <button
                        style={{
                            padding: '2px 8px', borderRadius: C.radiusSm, fontSize: C.textCaption,
                            border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer',
                        }}
                        onClick={() => setSelectedText('')}
                    >
                        取消
                    </button>
                </div>
            )}

            {/* 澄清模板 */}
            {template && (
                <div style={{
                    padding: '12px 16px', background: C.cardBg,
                    borderBottom: `1px solid ${C.border}`,
                }}>
                    <div style={{ fontSize: C.textBody, fontWeight: 600, marginBottom: 4 }}>{template.title}</div>
                    <div style={{ fontSize: C.textCaption, color: C.textSecondary, marginBottom: 10 }}>{template.description}</div>
                    {template.questions.map((q) => (
                        <div key={q.id} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: C.textCaption, color: C.textSecondary, marginBottom: 4 }}>{q.label}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {q.options.map((opt) => {
                                    const active = clarifyAnswers[q.id] === opt.value;
                                    return (
                                        <span
                                            key={opt.value}
                                            style={{
                                                padding: '3px 10px', borderRadius: 12, fontSize: C.textCaption,
                                                background: active ? C.primary : C.bg,
                                                color: active ? C.textInverse : C.textSecondary,
                                                border: `1px solid ${active ? C.primary : C.border}`,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                            onClick={() => setClarifyAnswers((p) => ({ ...p, [q.id]: opt.value }))}
                                        >
                      {opt.label}
                    </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <button
                        style={{
                            padding: '4px 16px', borderRadius: C.radiusSm, border: 'none',
                            background: C.primary, color: C.textInverse, cursor: 'pointer',
                            fontSize: C.textCaption, fontWeight: 600, marginTop: 4,
                        }}
                        onClick={handleClarifyConfirm}
                    >
                        确认并发送
                    </button>
                </div>
            )}

            {/* 消息列表 */}
            <div style={{
                flex: 1, overflow: 'auto', padding: '12px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
            }}>
                {messages.map((msg) => (
                    <div key={msg.id}>
                        <div style={{
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
                    </div>
                ))}
                {loading && (
                    <div style={{
                        maxWidth: '80%', padding: '8px 14px', borderRadius: C.radiusMd,
                        background: C.cardBg, color: C.textLight, fontSize: C.textBodySm,
                        fontStyle: 'italic',
                    }}>
                        <Icon name="loading" size={14} color={C.textLight} /> 思考中...
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
            ref={inputRef}
            style={{
                flex: 1, padding: '8px 12px', borderRadius: C.radiusSm,
                border: `1px solid ${C.border}`, background: C.cardBg,
                color: C.text, fontSize: C.textBodySm, resize: 'none',
                minHeight: 36, maxHeight: 100, outline: 'none',
            }}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题，或粘贴文本让助手处理…"
            rows={1}
        />
                {isStreaming ? (
                    <button
                        style={{
                            padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                            background: C.error, color: C.textInverse, cursor: 'pointer',
                            fontSize: C.textCaption, fontWeight: 600, whiteSpace: 'nowrap',
                        }}
                        onClick={abortStream}
                    >
                        停止
                    </button>
                ) : (
                    <button
                        style={{
                            padding: '6px 14px', borderRadius: C.radiusSm, border: 'none',
                            background: C.primary, color: C.textInverse, cursor: 'pointer',
                            fontSize: C.textCaption, fontWeight: 600, whiteSpace: 'nowrap',
                            opacity: input.trim() ? 1 : 0.4,
                        }}
                        disabled={!input.trim() || loading}
                        onClick={sendMessage}
                    >
                        发送
                    </button>
                )}
            </div>
            <div style={{ padding: '2px 16px 8px', fontSize: C.textCaption, color: C.textLight }}>
                Ctrl+Enter 发送 · 全局 Ctrl+K 打开命令面板
            </div>
        </div>
    );
};

export default Assistant;