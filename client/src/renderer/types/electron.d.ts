// ─── client/src/renderer/types/electron.d.ts ──────────────
/**
 * 渲染进程全局类型扩展
 * 对应于 preload.ts 通过 contextBridge 暴露的 API
 */
import type { DeploymentConfig, EnvironmentCheckResult, TokenData, BudgetConfig, SkillListParams, SkillItem } from '../../shared/types';

declare global {
    interface Window {
        electronAPI: {
            deployment: {
                checkEnv: () => Promise<EnvironmentCheckResult>;
                install: (config: DeploymentConfig) => Promise<{ success: boolean; path: string }>;
                onProgress: (callback: (progress: number) => void) => () => void;
                cancel: () => void;
            };
            openclaw: {
                getStatus: () => Promise<{ running: boolean; version: string }>;
                start: () => Promise<void>;
                stop: () => Promise<void>;
                getConfig: () => Promise<Record<string, unknown>>;
                updateConfig: (config: Record<string, unknown>) => Promise<void>;
            };
            token: {
                getUsage: (period: 'day' | 'week' | 'month') => Promise<TokenData[]>;
                onUpdate: (callback: (data: TokenData) => void) => () => void;
                setBudget: (budget: BudgetConfig) => Promise<void>;
            };
            skillStore: {
                list: (params: SkillListParams) => Promise<{ items: SkillItem[]; total: number }>;
                install: (skillId: string) => Promise<void>;
                getInstalled: () => Promise<SkillItem[]>;
            };
        };
    }
}

export {};