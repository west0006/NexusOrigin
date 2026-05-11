// ─── client/src/main/preload.ts ───────────────────────────
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/config';
import type { DeploymentConfig, TokenData, BudgetConfig, SkillListParams } from '../shared/types';

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
        getUsage: (period: 'day' | 'week' | 'month'): Promise<TokenData[]> =>
            ipcRenderer.invoke(IPC_CHANNELS.TOKEN_USAGE, period),
        onUpdate: (callback: (data: TokenData) => void): (() => void) => {
            const handler = (_event: Electron.IpcRendererEvent, data: TokenData): void =>
                callback(data);
            ipcRenderer.on(IPC_CHANNELS.TOKEN_REALTIME, handler);
            return () => ipcRenderer.removeListener(IPC_CHANNELS.TOKEN_REALTIME, handler);
        },
        setBudget: (budget: BudgetConfig): Promise<void> =>
            ipcRenderer.invoke(IPC_CHANNELS.TOKEN_SET_BUDGET, budget),
    },

    skillStore: {
        list: (params: SkillListParams): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_LIST, params),
        install: (skillId: string): Promise<void> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_INSTALL, skillId),
        getInstalled: (): Promise<unknown> =>
            ipcRenderer.invoke(IPC_CHANNELS.SKILL_INSTALLED),
    },
} as const;

// 使用 as 断言确保暴露的 API 类型与 Window 扩展一致
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;