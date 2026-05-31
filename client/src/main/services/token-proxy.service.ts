import { BrowserWindow } from 'electron';
import { TokenProxyServer, TokenMetrics } from '../sidecar/token-proxy';
import { IPC_CHANNELS } from '../../shared/config';

let proxyInstance: TokenProxyServer | null = null;

export class TokenProxyService {
    async start(targetUrl: string, apiKey: string): Promise<void> {
        if (proxyInstance) {
            await this.stop();
        }
        proxyInstance = new TokenProxyServer(targetUrl, apiKey, async (metrics) => {
            const win = BrowserWindow.getAllWindows()[0];
            if (win && !win.isDestroyed()) {
                // 保存到数据库
                win.webContents.send('token:saveUsage', metrics);
                // 实时推送前端
                win.webContents.send(IPC_CHANNELS.TOKEN_REALTIME, metrics);
            }
        });
        await proxyInstance.start();
    }

    async stop(): Promise<void> {
        if (proxyInstance) {
            await proxyInstance.stop();
            proxyInstance = null;
        }
    }

    async updateConfig(targetUrl: string, apiKey: string): Promise<void> {
        const wasRunning = proxyInstance !== null;
        if (wasRunning) {
            await this.stop();
            await this.start(targetUrl, apiKey);
        }
    }

    isRunning(): boolean {
        return proxyInstance !== null;
    }
}