// ─── client/src/main/ipc/deployment.ipc.ts ────────────────
import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/config';
import type { DeploymentConfig, EnvironmentCheckResult } from '../../shared/types';

export function setupDeploymentHandlers(ipcMain: IpcMain): void {
    ipcMain.handle(IPC_CHANNELS.DEPLOYMENT_CHECK_ENV, async (): Promise<EnvironmentCheckResult> => {
        // 基础实现：仅作类型示范，实际应集成 env-checker 工具
        const result: EnvironmentCheckResult = {
            node: false,
            npm: false,
            python: false,
            git: false,
            diskSpace: 0,
        };

        try {
            // 同步执行外部命令的示例（实际应使用 child_process.execAsync）
            result.node = !!process.version;
            result.diskSpace = 10; // 占位值，实际需通过 df / wmic 获取
        } catch {
            /* 保持默认值 */
        }

        return result;
    });

    ipcMain.handle(
        IPC_CHANNELS.DEPLOYMENT_INSTALL,
        async (_event, config: DeploymentConfig): Promise<{ success: boolean; path: string }> => {
            // 校验必要参数
            if (!config.apiKey) {
                throw new Error('API key is required');
            }
            // 实际部署逻辑应在 deployment.service 中实现
            return { success: true, path: config.installPath || '~/.openclaw' };
        },
    );

    ipcMain.on(IPC_CHANNELS.DEPLOYMENT_CANCEL, () => {
        // 取消部署逻辑
    });
}