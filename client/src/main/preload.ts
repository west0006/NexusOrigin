// ─── client/src/main/preload.ts ───────────────────────────
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/config';
import type { TokenUsage, BudgetConfig, SkillListResponse } from '@shared/types';
import type { DeploymentConfig } from '@shared/types/environment';

const electronAPI = {
    deployment: {
        checkEnv: (): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.DEPLOYMENT_CHECK_ENV),
        install: (config: DeploymentConfig): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.DEPLOYMENT_INSTALL, config),
        onProgress: (callback: (progress: number) => void): (() => void) => {
            const handler = (_event: Electron.IpcRendererEvent, progress: number): void =>
                callback(progress);
            ipcRenderer.on(IPC_CHANNELS.DEPLOYMENT_PROGRESS, handler);
            return () => ipcRenderer.removeListener(IPC_CHANNELS.DEPLOYMENT_PROGRESS, handler);
        },
        cancel: (): void => ipcRenderer.send(IPC_CHANNELS.DEPLOYMENT_CANCEL),
    },

    openclaw: {
        getStatus: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_STATUS),
        start: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_START),
        stop: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_STOP),
        getConfig: (): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_GET_CONFIG),
        updateConfig: (config: Record<string, unknown>): Promise<void> =>
            ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_UPDATE_CONFIG, config),
    },

    token: {
        getUsage: (period: 'day' | 'week' | 'month') =>
            ipcRenderer.invoke(IPC_CHANNELS.TOKEN_USAGE, period),
        onUpdate: (callback: (data: any) => void) => {
            const handler = (_event: any, data: any) => callback(data);
            ipcRenderer.on(IPC_CHANNELS.TOKEN_REALTIME, handler);
            return () => ipcRenderer.removeListener(IPC_CHANNELS.TOKEN_REALTIME, handler);
        },
        setBudget: (budget: any) =>
            ipcRenderer.invoke(IPC_CHANNELS.TOKEN_SET_BUDGET, budget),
        getBudget: () => ipcRenderer.invoke('token:getBudget'),
        startProxy: (targetUrl: string, apiKey: string) =>
            ipcRenderer.invoke('token:startProxy', targetUrl, apiKey),
        stopProxy: () => ipcRenderer.invoke('token:stopProxy'),
    },

    skillStore: {
        list: (params: SkillListResponse): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST, params),
        install: (skillId: string): Promise<void> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_INSTALL, skillId),
        getInstalled: (): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_INSTALLED),
    },

    // ─── 中枢调度器 ───
    orchestrator: {
        getAgents: (): Promise<any> => ipcRenderer.invoke('orchestrator:get-agents'),
        registerAgent: (registration: any): Promise<any> => ipcRenderer.invoke('orchestrator:register-agent', registration),
        createTask: (params: { input: string; pipeline?: any[] }): Promise<any> => ipcRenderer.invoke('orchestrator:create-task', params),
        getTask: (taskId: string): Promise<any> => ipcRenderer.invoke('orchestrator:get-task', taskId),
        cancelTask: (taskId: string): Promise<any> => ipcRenderer.invoke('orchestrator:cancel-task', taskId),
        removeAgent: (agentId: string): Promise<any> => ipcRenderer.invoke('orchestrator:remove-agent', agentId),
    },

    // ─── Python 服务 ───
    python: {
        executePipeline: (params: { service: 'crewai' | 'langgraph'; input: string; stream?: boolean }): Promise<any> =>
            ipcRenderer.invoke('python:execute-pipeline', params),
        checkOllama: (): Promise<boolean> => ipcRenderer.invoke('python:check-ollama'),
        healthCheck: (service: 'crewai' | 'langgraph'): Promise<any> => ipcRenderer.invoke('python:health-check', service),
        registerAgent: (params: { service: 'crewai' | 'langgraph'; agentId: string; name: string; framework: string; capabilities: any[] }): Promise<any> =>
            ipcRenderer.invoke('python:register-agent', params),
    },
} as const;

// 使用 as 断言确保暴露的 API 类型与 Window 扩展一致
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;