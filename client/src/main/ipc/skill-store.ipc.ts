// ─── client/src/main/ipc/skill-store.ipc.ts ───────────────
import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/config';
import type { SkillListParams, SkillItem } from '../../shared/types';

export function setupSkillStoreHandlers(ipcMain: IpcMain): void {
    ipcMain.handle(
        IPC_CHANNELS.SKILL_LIST,
        async (_event, params: SkillListParams): Promise<{ items: SkillItem[]; total: number }> => {
            if (params.pageSize <= 0) {
                throw new Error('pageSize must be positive');
            }
            return { items: [], total: 0 };
        },
    );

    ipcMain.handle(IPC_CHANNELS.SKILL_INSTALL, async (_event, skillId: string): Promise<void> => {
        if (!skillId) {
            throw new Error('skillId is required');
        }
    });

    ipcMain.handle(IPC_CHANNELS.SKILL_INSTALLED, async (): Promise<SkillItem[]> => {
        return [];
    });
}