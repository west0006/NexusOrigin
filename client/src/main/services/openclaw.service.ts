// ─── client/src/main/services/openclaw.service.ts ──────────
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class OpenClawService {
    async getStatus(): Promise<{ running: boolean; version: string }> {
        try {
            const { stdout } = await execAsync('openclaw status --json');
            const status = JSON.parse(stdout);
            return { running: status.running ?? false, version: status.version ?? 'unknown' };
        } catch {
            return { running: false, version: 'unknown' };
        }
    }

    async start(): Promise<void> {
        await execAsync('openclaw start');
    }

    async stop(): Promise<void> {
        await execAsync('openclaw stop');
    }

    async getConfig(): Promise<Record<string, unknown>> {
        // 读取配置文件逻辑
        return {};
    }

    async updateConfig(config: Record<string, unknown>): Promise<void> {
        // 更新配置文件逻辑
        if (typeof config !== 'object' || config === null) {
            throw new Error('Invalid config');
        }
    }
}