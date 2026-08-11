// ─── client/src/main/index.ts ─────────────────────────────
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { setupDeploymentHandlers } from './ipc/deployment.ipc';
import { setupTokenMonitorHandlers } from './ipc/token-monitor.ipc';
import { setupOpenClawHandlers } from './ipc/openclaw.ipc';
import { setupSkillStoreHandlers } from './ipc/skill-store.ipc';
import { registerOrchestratorIPC } from './services/orchestrator';
import { registerPythonServiceIPC } from './services/pythonService';
import { TokenProxyService } from './services/token-proxy.service';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let tokenProxy: TokenProxyService | null = null;

// ── Python service lifecycle ────────────────────────────────

function getPythonCommand(): string {
    if (process.platform === 'win32') return 'python';
    return 'python3';
}

function spawnPythonServices(): void {
    const scriptDir = join(__dirname, 'python');
    const cmd = getPythonCommand();

    try {
        pythonProcess = spawn(cmd, ['start_services.py'], {
            cwd: scriptDir,
            stdio: 'pipe',
            shell: process.platform === 'win32',
        });

        pythonProcess.stdout?.on('data', (data: Buffer) => {
            console.log(`[Python] ${data.toString().trim()}`);
        });

        pythonProcess.stderr?.on('data', (data: Buffer) => {
            console.error(`[Python:err] ${data.toString().trim()}`);
        });

        pythonProcess.on('error', (err) => {
            console.warn(`[Python] failed to start services: ${err.message}`);
            pythonProcess = null;
        });

        pythonProcess.on('exit', (code) => {
            console.log(`[Python] services exited (code=${code})`);
            pythonProcess = null;
        });
    } catch (err: any) {
        console.warn(`[Python] could not spawn services: ${err.message}`);
    }
}

function stopPythonServices(): void {
    if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill('SIGTERM');
        pythonProcess = null;
    }
}

// ── Sidecar proxy lifecycle ─────────────────────────────────

async function startSidecarIfConfigured(): Promise<void> {
    const targetUrl = process.env.SIDECAR_TARGET_URL;
    const apiKey = process.env.SIDECAR_API_KEY;
    if (!targetUrl || !apiKey) {
        console.log('[Sidecar] not configured (set SIDECAR_TARGET_URL + SIDECAR_API_KEY)');
        return;
    }
    try {
        tokenProxy = new TokenProxyService();
        await tokenProxy.start(targetUrl, apiKey);
        console.log(`[Sidecar] proxy listening on 127.0.0.1:18790`);
    } catch (err: any) {
        console.warn(`[Sidecar] failed to start: ${err.message}`);
    }
}

async function stopSidecar(): Promise<void> {
    if (tokenProxy) {
        await tokenProxy.stop();
        tokenProxy = null;
    }
}

// ── Cleanup ──────────────────────────────────────────────────

function cleanupServices(): void {
    stopPythonServices();
    stopSidecar();
}

// ── Window ───────────────────────────────────────────────────

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        show: false,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
        },
    });

    if (isDev) {
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    mainWindow.once('ready-to-show', () => mainWindow?.show());

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 外部链接使用系统默认浏览器打开
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

function registerIpcHandlers(): void {
    setupDeploymentHandlers(ipcMain);
    setupTokenMonitorHandlers(ipcMain);
    setupOpenClawHandlers(ipcMain);
    setupSkillStoreHandlers(ipcMain);
    // 注册中枢调度器 + Python 服务桥接
    registerOrchestratorIPC(ipcMain);
    registerPythonServiceIPC(ipcMain);
}

app.whenReady().then(async () => {
    registerIpcHandlers();
    spawnPythonServices();
    await startSidecarIfConfigured();
    createWindow();
});

app.on('will-quit', () => {
    cleanupServices();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});