// ─── client/src/main/windows/main-window.ts ────────────────
import { BrowserWindow, app } from 'electron';
import { join } from 'path';

let win: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
    if (win) return win;

    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
    } else {
        win.loadFile(join(__dirname, '../renderer/index.html'));
    }

    win.on('closed', () => {
        win = null;
    });

    return win;
}