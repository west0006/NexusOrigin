// ─── client/src/main/services/token-proxy.service.ts ──────
import { TokenProxyServer } from '../sidecar/token-proxy';

let proxyInstance: TokenProxyServer | null = null;

export class TokenProxyService {
    /**
     * 启动 Token 监测代理
     */
    start(targetUrl: string, apiKey: string): Promise<void> {
        if (proxyInstance) {
            return Promise.resolve();
        }
        proxyInstance = new TokenProxyServer(targetUrl, apiKey);
        proxyInstance.on('metrics', (data) => {
            // 将 Token 数据通过 IPC 推送到渲染进程
            const { BrowserWindow } = require('electron');
            const win = BrowserWindow.getAllWindows()[0];
            if (win) {
                win.webContents.send('token:update', data);
            }
        });
        return proxyInstance.start();
    }

    stop(): Promise<void> {
        if (!proxyInstance) return Promise.resolve();
        const p = proxyInstance;
        proxyInstance = null;
        return p.stop();
    }
}