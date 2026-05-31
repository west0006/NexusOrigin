// ── client/src/renderer/protocol/agent-adapter.ts
// Agent 协议适配层基础框架

export interface AgentTask {
    id: string;
    framework: 'crewai' | 'langchain' | 'autogen' | 'metagpt' | 'custom';
    action: string;
    payload: Record<string, unknown>;
    priority: number;
    maxRetries: number;
    timeout: number;
}

export interface AgentResult {
    taskId: string;
    success: boolean;
    data: unknown;
    error?: string;
    metrics: {
        durationMs: number;
        tokensUsed: number;
        costUsd: number;
    };
}

export interface AgentIdentity {
    agentId: string;
    framework: string;
    capabilities: string[];
    trustLevel: number;
    publicKey?: string;
}

// 协议消息类型
export type ProtocolMessage =
    | { type: 'TASK_ASSIGN'; task: AgentTask }
    | { type: 'TASK_RESULT'; result: AgentResult }
    | { type: 'AGENT_DISCOVERY'; identity: AgentIdentity }
    | { type: 'HEARTBEAT'; timestamp: number };

// 基础适配器接口
export interface AgentAdapter {
    framework: string;
    execute(task: AgentTask): Promise<AgentResult>;
    cancel(taskId: string): Promise<boolean>;
    getStatus(taskId: string): Promise<'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>;
}

// 简单的事件总线（跨框架通信基础）
type MessageHandler = (msg: ProtocolMessage) => void;

class ProtocolBus {
    private handlers = new Map<string, Set<MessageHandler>>();

    subscribe(agentId: string, handler: MessageHandler) {
        if (!this.handlers.has(agentId)) this.handlers.set(agentId, new Set());
        this.handlers.get(agentId)!.add(handler);
        return () => this.handlers.get(agentId)?.delete(handler);
    }

    publish(targetAgentId: string, message: ProtocolMessage) {
        this.handlers.get(targetAgentId)?.forEach((h) => h(message));
    }

    broadcast(message: ProtocolMessage) {
        this.handlers.forEach((handlers) => handlers.forEach((h) => h(message)));
    }
}

export const protocolBus = new ProtocolBus();

// 注册框架适配器
const adapters = new Map<string, AgentAdapter>();

export function registerAdapter(adapter: AgentAdapter) {
    adapters.set(adapter.framework, adapter);
}

export function getAdapter(framework: string): AgentAdapter | undefined {
    return adapters.get(framework);
}