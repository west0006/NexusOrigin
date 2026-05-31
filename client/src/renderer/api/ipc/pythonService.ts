/**
 * Python 服务 IPC 桥接
 * 渲染进程通过此模块调用主进程，主进程转发到 Python 服务
 */

import type { ElectronAPI } from '@main/preload';

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

function useIPC(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.python;
}

const CREWAI_URL = 'http://localhost:8001';
const LANGGRAPH_URL = 'http://localhost:8002';

export interface RegisterAgentParams {
    agentId?: string;
    name: string;
    framework: 'crewai' | 'langgraph';
    endpoint: string;
    model?: string;
    capabilities?: { id: string; name: string; description: string }[];
}

export const pythonService = {
    async executePipeline(params: { service: 'crewai' | 'langgraph'; input: string; stream?: boolean }): Promise<any> {
        if (useIPC()) {
            return window.electronAPI!.python.executePipeline(params);
        }
        const baseUrl = params.service === 'crewai' ? CREWAI_URL : LANGGRAPH_URL;
        const endpoint = params.service === 'crewai' ? '/api/crewai/pipeline' : '/api/langgraph/execute';
        const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: params.input, stream: params.stream ?? true }),
        });
        return res;
    },

    async getAgents(): Promise<any[]> {
        if (useIPC()) {
            return window.electronAPI!.orchestrator.getAgents();
        }
        try {
            const crewaiRes = await fetch(`${CREWAI_URL}/api/crewai/agents`);
            const crewaiData = await crewaiRes.json();
            const crewaiAgents = crewaiData.agents || [];
            return crewaiAgents;
        } catch {
            return [];
        }
    },

    async registerAgent(registration: RegisterAgentParams): Promise<any> {
        if (useIPC()) {
            return window.electronAPI!.orchestrator.registerAgent(registration);
        }
        const baseUrl = registration.framework === 'crewai' ? CREWAI_URL : LANGGRAPH_URL;
        const res = await fetch(`${baseUrl}/api/${registration.framework}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registration),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: '注册失败' }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
    },

    async removeAgent(agentId: string, framework: string = 'crewai'): Promise<void> {
        if (useIPC()) {
            return window.electronAPI!.orchestrator.removeAgent(agentId);
        }
        const baseUrl = framework === 'crewai' ? CREWAI_URL : LANGGRAPH_URL;
        const res = await fetch(`${baseUrl}/api/${framework}/agents/${agentId}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: '移除失败' }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
    },

    async healthCheck(framework: 'crewai' | 'langgraph'): Promise<any> {
        const baseUrl = framework === 'crewai' ? CREWAI_URL : LANGGRAPH_URL;
        const res = await fetch(`${baseUrl}/api/${framework}/health`);
        return res.json();
    },

    async createTask(params: { input: string; pipeline?: any[] }): Promise<any> {
        if (useIPC()) {
            return window.electronAPI!.orchestrator.createTask(params);
        }
        throw new Error('createTask 需要 Electron 主进程支持');
    },

    async getTask(taskId: string): Promise<any> {
        if (useIPC()) {
            return window.electronAPI!.orchestrator.getTask(taskId);
        }
        const res = await fetch(`${CREWAI_URL}/api/crewai/pipeline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: `查询任务: ${taskId}`, stream: false }),
        });
        return res.json();
    },
};