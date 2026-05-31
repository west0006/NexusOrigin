// client/src/shared/types/agent.ts

/** 智能体 */
export interface Agent {
    id: string;
    name: string;
    description: string;
    status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
    version: string;
    endpoint?: string;
    capabilities?: string[];
    reputation?: number;
    lastHeartbeat?: string;
    owner: { id: string; username: string; avatar?: string };
    createdAt: string;
    updatedAt: string;
}

export interface RegisterAgentDto {
    name: string;
    description: string;
    endpoint: string;
    capabilities?: string[];
}

/** 单智能体对话消息 */
export interface ChatMessage {
    id: string;
    agentId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

/** 智能体会话 */
export interface AgentConversation {
    id: string;
    agentId: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

/** Agent 用量统计 */
export interface AgentUsageStats {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    taskCount: number;
}

/** Agent 任务 */
export interface AgentTask {
    id: string;
    title: string;
    description: string;
    status: string;
    clientId: string;
    agentId?: string;
    output?: string;
    cost: number;
    createdAt: string;
    updatedAt: string;
    client?: { id: string; username: string; avatar?: string };
    provider?: { id: string; username: string; avatar?: string };
}