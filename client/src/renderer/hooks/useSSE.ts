import { useEffect, useRef, useCallback } from 'react';

interface SSEEvent {
    event: string;
    data: any;
}

interface UseSSEOptions {
    onEvent?: (event: SSEEvent) => void;
    onChunk?: (data: { agent?: string; node?: string; content: string }) => void;
    onStepStarted?: (data: { agent?: string; node?: string; name: string }) => void;
    onStepCompleted?: (data: { agent?: string; node?: string; content: string; cost?: number; tokenCount?: any }) => void;
    onDone?: (data: { output: string; totalCost?: number; tokenCount?: any }) => void;
    onError?: (error: Error) => void;
    signal?: AbortSignal;
}

/**
 * 统一的 SSE 流解析 Hook
 * 用于 SingleFrameworkCrew 和 CrossFrameworkAgent 等 SSE 组件
 */
export function useSSE(options: UseSSEOptions) {
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const abortedRef = useRef(false);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const parseAndDispatch = useCallback((line: string) => {
        const opts = optionsRef.current;
        if (line.startsWith('event: ')) {
            const eventName = line.slice(7).trim();
            // 下一行是 data
            return; // data line 处理
        }
        if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            try {
                const data = JSON.parse(raw);
                // 通过 data 中字段推断事件类型
                if (data.content && data.agent === undefined && data.node === undefined) {
                    opts.onChunk?.({ content: data.content });
                } else if (data.content && (data.agent || data.node)) {
                    opts.onChunk?.(data);
                } else if (data.agent || data.node) {
                    opts.onStepStarted?.(data);
                } else if (data.output) {
                    opts.onDone?.(data);
                }
            } catch {
                // 非 JSON 数据，忽略
            }
        }
    }, []);

    const readStream = useCallback(async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) {
            optionsRef.current.onError?.(new Error('无法获取响应流'));
            return;
        }
        readerRef.current = reader;
        abortedRef.current = false;

        const opts = optionsRef.current;

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done || abortedRef.current) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    const opts = optionsRef.current;

                    // SSE 事件行
                    if (trimmed.startsWith('event: ')) {
                        const eventName = trimmed.slice(7).trim();
                        // 存储事件名，等待下一行 data
                        continue;
                    }

                    if (trimmed.startsWith('data: ')) {
                        const raw = trimmed.slice(6).trim();
                        try {
                            const data = JSON.parse(raw);
                            // 根据字段推断事件类型
                            if (data.node && data.name) {
                                opts.onStepStarted?.(data);
                            } else if (data.agent && data.name) {
                                opts.onStepStarted?.(data);
                            } else if (data.content && (data.agent || data.node)) {
                                opts.onChunk?.(data);
                            } else if (data.content && data.cost !== undefined) {
                                opts.onStepCompleted?.(data);
                            } else if (data.content && data.agent === undefined && data.node === undefined) {
                                opts.onChunk?.({ content: data.content });
                            } else if (data.output) {
                                opts.onDone?.(data);
                            }
                        } catch {
                            // 非 JSON，忽略
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                opts.onError?.(err);
            }
        }
    }, []);

    const abort = useCallback(() => {
        abortedRef.current = true;
        readerRef.current?.cancel();
    }, []);

    return { readStream, abort };
}

export type { SSEEvent, UseSSEOptions };