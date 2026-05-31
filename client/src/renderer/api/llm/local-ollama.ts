/**
 * 本地 Ollama 流式对话 API
 */

import { AGENT_CONFIG } from '../../config/agent-config';

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OllamaChatOptions {
    messages: OllamaMessage[];
    model?: string;
    stream?: boolean;
    onChunk?: (text: string) => void;
    onTokenCount?: (input: number, output: number) => void;
    signal?: AbortSignal;
}

export interface OllamaChatResponse {
    model: string;
    message: OllamaMessage;
    done: boolean;
}

const { baseUrl, defaultModel } = AGENT_CONFIG.ollama;

export class OllamaError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'OllamaError';
    }
}

/** 粗略估算 Token 数 */
function estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 2.5));
}

/**
 * 检查 Ollama 是否可用
 */
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${baseUrl}/api/tags`);
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * 流式对话 - 逐字返回，支持中断和 Token 计数
 */
export async function ollamaChat(options: OllamaChatOptions): Promise<string> {
    const {
        messages,
        model = defaultModel,
        stream = true,
        onChunk,
        onTokenCount,
        signal,
    } = options;

    const inputTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    onTokenCount?.(inputTokens, 0);

    const body = JSON.stringify({ model, messages, stream });

    try {
        const res = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal,
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new OllamaError(errText || `Ollama 返回错误: ${res.status}`, `HTTP_${res.status}`);
        }

        if (stream && onChunk) {
            const reader = res.body?.getReader();
            if (!reader) throw new OllamaError('无法获取响应流');

            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const data = JSON.parse(trimmed);
                        const content = data.message?.content || '';
                        if (content) {
                            onChunk(content);
                            fullContent += content;
                        }
                        if (data.done) {
                            onTokenCount?.(inputTokens, estimateTokens(fullContent));
                            return fullContent;
                        }
                    } catch {
                        // 跳过解析失败的行
                    }
                }
            }

            onTokenCount?.(inputTokens, estimateTokens(fullContent));
            return fullContent;
        } else {
            const data: OllamaChatResponse = await res.json();
            const outputTokens = estimateTokens(data.message.content);
            onTokenCount?.(inputTokens, outputTokens);
            return data.message.content;
        }
    } catch (err: any) {
        if (err instanceof OllamaError) throw err;
        throw new OllamaError(err.message || 'Ollama 请求失败');
    }
}