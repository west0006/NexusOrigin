import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/config';
import type { TokenData, BudgetConfig } from '@shared/types';
import { TokenProxyService } from '../services/token-proxy.service';
import db from '../database';

const tokenProxyService = new TokenProxyService();

export function setupTokenMonitorHandlers(ipcMain: IpcMain): void {
    ipcMain.handle('token:startProxy', async (_event, targetUrl: string, apiKey: string) => {
        await tokenProxyService.start(targetUrl, apiKey);
        return { success: true };
    });

    ipcMain.handle('token:stopProxy', async () => {
        await tokenProxyService.stop();
        return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.TOKEN_USAGE, async (_event, period: 'day' | 'week' | 'month') => {
        const now = Date.now();
        let startTime: number;
        switch (period) {
            case 'day': startTime = now - 24 * 3600 * 1000; break;
            case 'week': startTime = now - 7 * 24 * 3600 * 1000; break;
            case 'month': startTime = now - 30 * 24 * 3600 * 1000; break;
            default: startTime = now - 24 * 3600 * 1000;
        }
        const stmt = db.prepare(`
            SELECT id, timestamp, model, input_tokens as inputTokens, output_tokens as outputTokens, cost_usd as costUsd, skill_id as skillId
            FROM token_usage WHERE timestamp >= ? ORDER BY timestamp DESC
        `);
        const rows = stmt.all(startTime);
        return rows as TokenData[];
    });

    ipcMain.handle('token:saveUsage', async (_event, data: TokenData) => {
        const stmt = db.prepare(`
            INSERT INTO token_usage (id, timestamp, model, input_tokens, output_tokens, cost_usd, skill_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const id = data.id || `tok_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        stmt.run(id, data.timestamp, data.model, data.inputTokens, data.outputTokens, data.costUsd, data.skillId || null);
        return { success: true };
    });

    ipcMain.handle(IPC_CHANNELS.TOKEN_SET_BUDGET, async (_event, budget: BudgetConfig) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO budget (id, monthly_budget, alert_threshold)
            VALUES ('default', ?, ?)
        `);
        stmt.run(budget.monthlyBudget, budget.alertThreshold ?? 80);
        return { success: true };
    });

    ipcMain.handle('token:getBudget', async () => {
        const stmt = db.prepare(`SELECT monthly_budget, alert_threshold FROM budget WHERE id = 'default'`);
        const row = stmt.get() as any;
        if (!row) return { monthlyBudget: 0, alertThreshold: 80 };
        return { monthlyBudget: row.monthly_budget, alertThreshold: row.alert_threshold };
    });
}