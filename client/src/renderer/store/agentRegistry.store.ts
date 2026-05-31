// client/src/renderer/store/agentRegistry.store.ts

import { create } from 'zustand';
import { pythonService } from '../api/ipc/pythonService';
import type { RegisterAgentParams } from '../api/ipc/pythonService';

export interface AgentRegistration {
    agentId: string;
    name: string;
    framework: 'crewai' | 'langgraph' | 'openclaw';
    endpoint: string;
    model?: string;
    builtin?: boolean;
    capabilities: { id: string; name: string; description: string }[];
    status: 'idle' | 'busy' | 'offline';
    lastHeartbeat: number;
}

interface AgentRegistryState {
    registrations: AgentRegistration[];
    loading: boolean;
    error: string | null;

    fetchAgents: () => Promise<void>;
    registerAgent: (params: {
        name: string;
        description?: string;
        model?: string;
        endpoint?: string;
        framework: 'crewai' | 'langgraph';
        capabilities?: string[];
    }) => Promise<any>;
    removeAgent: (agentId: string, framework?: string) => Promise<void>;
    clearError: () => void;
}

function normalizeStatus(s: string): 'idle' | 'busy' | 'offline' {
    switch ((s || '').toUpperCase()) {
        case 'ONLINE':
        case 'IDLE':
            return 'idle';
        case 'BUSY':
            return 'busy';
        default:
            return 'offline';
    }
}

function toRegistration(a: Record<string, any>): AgentRegistration {
    return {
        agentId: a.agentId || '',
        name: a.name || '',
        framework: (a.framework || 'crewai') as AgentRegistration['framework'],
        endpoint: a.endpoint || '',
        model: a.model || undefined,
        builtin: !!a.builtin,
        capabilities: (a.capabilities || []).map((c: any) => ({
            id: c.id || '',
            name: c.name || c.id || '',
            description: c.description || '',
        })),
        status: normalizeStatus(a.status),
        lastHeartbeat: a.lastHeartbeat || Date.now(),
    };
}

export const useAgentRegistryStore = create<AgentRegistryState>((set, get) => ({
    registrations: [],
    loading: false,
    error: null,

    fetchAgents: async () => {
        set({ loading: true, error: null });
        try {
            const agentsFromApi = await pythonService.getAgents();
            const registrations: AgentRegistration[] = (agentsFromApi || []).map(toRegistration);
            set({ registrations, loading: false });
        } catch (err: any) {
            set({ error: err?.message || '获取 Agent 列表失败', loading: false });
        }
    },

    registerAgent: async (params) => {
        set({ loading: true, error: null });
        try {
            const reg: RegisterAgentParams = {
                name: params.name,
                framework: params.framework || 'crewai',
                endpoint: params.endpoint || 'http://localhost:11434',
                model: params.model || 'qwen2.5-coder:1.5b',
            };
            // 如果有 capabilities 则转换为注册格式
            if (params.capabilities && params.capabilities.length > 0) {
                reg.capabilities = params.capabilities.map(id => ({
                    id,
                    name: id,
                    description: '',
                }));
            }
            await pythonService.registerAgent(reg);
            await get().fetchAgents();
            set({ loading: false });
        } catch (err: any) {
            set({ error: err?.message || '注册失败', loading: false });
            throw err;
        }
    },

    removeAgent: async (agentId: string, framework?: string) => {
        const prev = get().registrations;
        set({ registrations: prev.filter(a => a.agentId !== agentId) });
        try {
            await pythonService.removeAgent(agentId, framework || 'crewai');
        } catch (err: any) {
            set({ registrations: prev });
            throw new Error(err?.message || '移除失败');
        }
    },

    clearError: () => set({ error: null }),
}));