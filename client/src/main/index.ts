// ─── client/src/main/index.ts ─────────────────────────────
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { setupDeploymentHandlers } from './ipc/deployment.ipc';
import { setupTokenMonitorHandlers } from './ipc/token-monitor.ipc';
import { setupOpenClawHandlers } from './ipc/openclaw.ipc';
import { setupSkillStoreHandlers } from './ipc/skill-store.ipc';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

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
    // 类型断言：assert 非空（上面 createWindow 对此无直接依赖）
    setupDeploymentHandlers(ipcMain);
    setupTokenMonitorHandlers(ipcMain);
    setupOpenClawHandlers(ipcMain);
    setupSkillStoreHandlers(ipcMain);
}

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();
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