// ─── client/src/main/ipc/openclaw.ipc.ts ──────────────────
import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/config';

export function setupOpenClawHandlers(ipcMain: IpcMain): void {
    ipcMain.handle(IPC_CHANNELS.OPENCLAW_STATUS, async (): Promise<{ running: boolean; version: string }> => {
        return { running: false, version: '0.0.0' };
    });

    ipcMain.handle(IPC_CHANNELS.OPENCLAW_START, async (): Promise<void> => {
        // 启动 OpenClaw 服务
    });

    ipcMain.handle(IPC_CHANNELS.OPENCLAW_STOP, async (): Promise<void> => {
        // 停止 OpenClaw 服务
    });

    ipcMain.handle(IPC_CHANNELS.OPENCLAW_GET_CONFIG, async (): Promise<Record<string, unknown>> => {
        return {};
    });

    ipcMain.handle(
        IPC_CHANNELS.OPENCLAW_UPDATE_CONFIG,
        async (_event, config: Record<string, unknown>): Promise<void> => {
            if (typeof config !== 'object' || config === null) {
                throw new Error('Invalid config');
            }
            // 更新配置
        },
    );
}