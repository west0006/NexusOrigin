// ─── client/src/main/ipc/skill-store.ipc.ts ───────────────
import { IpcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/config';
import type { SkillListResponse, Skill } from '@shared/types';

export function setupSkillStoreHandlers(ipcMain: IpcMain): void {
    ipcMain.handle(
        IPC_CHANNELS.SKILL_LIST,
        async (_event, params: SkillListResponse): Promise<{ items: Skill[]; total: number }> => {
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

    ipcMain.handle(IPC_CHANNELS.SKILL_INSTALLED, async (): Promise<Skill[]> => {
        return [];
    });
}