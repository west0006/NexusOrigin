import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/config';
import { getDriver } from '../services/agent-driver';
import { checkEnvironment } from '../utils/env-checker';
import type { DeploymentConfig } from '@shared/types/environment';

// 存储当前安装任务的取消函数（简单实现）
let currentCancel: (() => void) | null = null;

export function setupDeploymentHandlers(ipcMain: IpcMain): void {
    // 环境检测
    ipcMain.handle(IPC_CHANNELS.DEPLOYMENT_CHECK_ENV, async () => {
        return checkEnvironment();
    });

    // 安装
    ipcMain.handle(
        IPC_CHANNELS.DEPLOYMENT_INSTALL,
        async (event, config: DeploymentConfig) => {
            const { framework, ...installOptions } = config;
            const driver = getDriver(framework as any);

            // 模拟进度（实际应通过 Go 服务的 WebSocket 或轮询日志）
            let progress = 0;
            const interval = setInterval(() => {
                progress = Math.min(progress + 10, 90);
                event.sender.send(IPC_CHANNELS.DEPLOYMENT_PROGRESS, progress);
            }, 1000);

            currentCancel = () => {
                clearInterval(interval);
                event.sender.send(IPC_CHANNELS.DEPLOYMENT_PROGRESS, 0);
            };

            try {
                const result = await driver.install(installOptions);
                clearInterval(interval);
                event.sender.send(IPC_CHANNELS.DEPLOYMENT_PROGRESS, 100);
                return { success: true, path: result.path };
            } catch (error: any) {
                clearInterval(interval);
                throw new Error(error.message);
            } finally {
                currentCancel = null;
            }
        }
    );

    // 取消安装
    ipcMain.on(IPC_CHANNELS.DEPLOYMENT_CANCEL, () => {
        if (currentCancel) {
            currentCancel();
        }
    });
}