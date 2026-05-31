// client/src/renderer/store/assistant.store.ts
// 平台助理状态管理（增强版：任务发布桥接 + 成本查询 + 路由跳转）

import { create } from 'zustand';
import { ollamaChat } from '../api/llm/local-ollama';
import { tasksApi } from '../api/task.api';
import { SYSTEM_PROMPT, WELCOME_MESSAGE, type IntentType } from '../components/Assistant/assistant-prompt';
import { detectIntent } from '../components/Assistant/intent-detector';
import { useAppStore } from './app';

export interface AssistantMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface TaskDraft {
    title: string;
    description: string;
    type: string;
    budget: number;
    deadline: string;
}

interface AssistantState {
    messages: AssistantMessage[];
    input: string;
    loading: boolean;
    isStreaming: boolean;
    currentIntent: IntentType;
    pendingTask: TaskDraft | null;
    history: string[];
    activeHistory: number;

    setInput: (input: string) => void;
    setMessages: (messages: AssistantMessage[]) => void;
    sendMessage: () => Promise<void>;
    abortStream: () => void;
    newChat: () => void;
    setPendingTask: (task: TaskDraft | null) => void;
    confirmPublish: () => Promise<void>;
    cancelPublish: () => void;
    switchHistory: (index: number) => void;
}

let abortController: AbortController | null = null;

// ─── 任务发布桥接：将 pendingTask 发送到后端 ───
async function publishTask(task: TaskDraft): Promise<boolean> {
    try {
        await tasksApi.create({
            title: task.title,
            description: task.description,
            type: task.type || 'general',
            priority: 'medium' as any,
            budget: task.budget || 0,
            deadline: task.deadline ?? undefined,
        });
        return true;
    } catch {
        return false;
    }
}

// ─── 意图动作映射（无需 LLM 的快速回复）───
const ACTION_REPLIES: Record<string, string> = {
    help: '可用命令：\n- `/help` 显示帮助\n- `/collab` 打开协作实验室\n- `/task` 打开任务大厅\n- `/agent` 打开智能体管理\n- `/cost` 查询成本信息\n- `/deploy` 打开部署向导',
    cost_query: '正在查询成本信息…（请前往 **成本中心** 查看详细数据）',
};

export const useAssistantStore = create<AssistantState>((set, get) => ({
    messages: [WELCOME_MESSAGE as AssistantMessage],
    input: '',
    loading: false,
    isStreaming: false,
    currentIntent: 'unknown',
    pendingTask: null,
    history: ['当前对话'],
    activeHistory: 0,

    setInput: (input) => {
        set({ input });
        // 输入时检测意图
        if (input.trim()) {
            const intent = detectIntent(input);
            set({ currentIntent: intent });
        }
    },

    setMessages: (messages) => set({ messages }),

    sendMessage: async () => {
        const { input, isStreaming, messages } = get();
        if (!input.trim() || isStreaming) return;

        const userMsg: AssistantMessage = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };
        set({ messages: [...messages, userMsg], input: '', loading: true });

        const intent = detectIntent(input);

        // ── 意图匹配：task_publish → 创建任务草稿 ──
        if (intent === 'task_publish') {
            const draft: TaskDraft = {
                title: input.length > 30 ? input.slice(0, 30) + '…' : input,
                description: input,
                type: 'general',
                budget: 100,
                deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            };
            set({
                pendingTask: draft,
                currentIntent: 'task_publish',
                loading: false,
            });
            return;
        }

        // ── 意图匹配：其他快捷回复（无需 LLM）──
        if (intent in ACTION_REPLIES) {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: ACTION_REPLIES[intent],
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], loading: false, currentIntent: 'unknown' });
            return;
        }

        // ── 意图匹配：collab → 跳转 + 回复 ──
        if (intent === 'collab') {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: '正在跳转到协作实验室…',
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], loading: false });
            // 延迟跳转，让用户看到回复
            setTimeout(() => {
                useAppStore.getState().setRoute('collaborationLab');
            }, 600);
            return;
        }

        // ── 意图匹配：agent_manage / deploy → 跳转 ──
        if (intent === 'agent_manage') {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: '正在打开智能体管理页面…',
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], loading: false });
            setTimeout(() => useAppStore.getState().setRoute('agents'), 600);
            return;
        }

        if (intent === 'deploy') {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: '正在打开部署向导…',
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], loading: false });
            setTimeout(() => useAppStore.getState().setRoute('deployment'), 600);
            return;
        }

        // ── 意图匹配：task_query → 跳转任务大厅 ──
        if (intent === 'task_query') {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: '正在打开任务大厅…',
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], loading: false });
            setTimeout(() => useAppStore.getState().setRoute('tasks'), 600);
            return;
        }

        // ── LLM 流式回复 ──
        abortController = new AbortController();
        set({ isStreaming: true, loading: false });

        const assistantId = `a-${Date.now()}`;
        const assistantMsg: AssistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
        };
        set({ messages: [...get().messages, assistantMsg] });

        try {
            await ollamaChat({
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages.slice(1).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                    { role: 'user', content: userMsg.content },
                ],
                signal: abortController.signal,
                onChunk: (chunk) => {
                    const msgs = get().messages;
                    set({
                        messages: msgs.map(m =>
                            m.id === assistantId ? { ...m, content: m.content + chunk } : m
                        ),
                    });
                },
            });
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                const msgs = get().messages;
                set({
                    messages: msgs.map(m =>
                        m.id === assistantId ? { ...m, content: m.content || '抱歉，发生了错误，请重试。' } : m
                    ),
                });
            }
        } finally {
            set({ isStreaming: false, currentIntent: 'unknown' });
            abortController = null;
        }
    },

    abortStream: () => {
        abortController?.abort();
        abortController = null;
        set({ isStreaming: false });
    },

    newChat: () => {
        set({
            messages: [WELCOME_MESSAGE as AssistantMessage],
            input: '',
            loading: false,
            isStreaming: false,
            currentIntent: 'unknown',
            pendingTask: null,
            history: [...get().history, '当前对话'],
            activeHistory: get().history.length,
        });
    },

    setPendingTask: (task) => set({ pendingTask: task }),

    confirmPublish: async () => {
        const { pendingTask } = get();
        if (!pendingTask) return;

        set({ loading: true });
        const ok = await publishTask(pendingTask);
        if (ok) {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: `✅ 任务「${pendingTask.title}」已成功发布！`,
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], pendingTask: null, loading: false });
        } else {
            const reply: AssistantMessage = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: '❌ 任务发布失败，请稍后重试。',
                timestamp: Date.now(),
            };
            set({ messages: [...get().messages, reply], pendingTask: null, loading: false });
        }
    },

    cancelPublish: () => {
        set({ pendingTask: null });
    },

    switchHistory: (index) => {
        // MVP: 简化处理，仅重置对话
        set({ activeHistory: index });
    },
}));