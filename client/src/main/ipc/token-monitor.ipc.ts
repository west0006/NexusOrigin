// ─── client/src/main/ipc/token-monitor.ipc.ts ─────────────
import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/config';
import type { TokenData, BudgetConfig } from '../../shared/types';

export function setupTokenMonitorHandlers(ipcMain: IpcMain): void {
    ipcMain.handle(
        IPC_CHANNELS.TOKEN_USAGE,
        async (_event, period: 'day' | 'week' | 'month'): Promise<TokenData[]> => {
            // 从本地 SQLite 查询 token 使用记录
            return [];
        },
    );

    ipcMain.handle(
        IPC_CHANNELS.TOKEN_SET_BUDGET,
        async (_event, budget: BudgetConfig): Promise<void> => {
            if (budget.monthlyBudget <= 0) {
                throw new Error('Monthly budget must be positive');
            }
            // 持久化预算配置
        },
    );
}