// ─── client/src/main/services/deployment.service.ts ────────
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { homedir } from 'os';
import { promises as fs } from 'fs';
import type { DeploymentConfig } from '../../shared/types';

const execAsync = promisify(exec);

export class DeploymentService {
    /**
     * 执行完整部署流程，返回安装路径
     */
    async deploy(config: DeploymentConfig): Promise<string> {
        const homeDir = homedir();
        const installPath = config.installPath || join(homeDir, '.openclaw');

        // 1. 创建目录
        await fs.mkdir(installPath, { recursive: true });

        // 2. 检查必要工具
        await this.assertCommand('node', 'Node.js 未安装');
        await this.assertCommand('npm', 'npm 未安装');

        // 3. 安装 OpenClaw
        await execAsync('npm install -g @anthropic-ai/claude-code', { cwd: installPath });

        // 4. 生成配置
        const configData = {
            models: {
                providers: {
                    [config.modelProvider]: {
                        baseUrl: this.getBaseUrl(config.modelProvider),
                        apiKey: config.apiKey,
                        api: 'openai-completions',
                        models: this.getDefaultModels(config.modelProvider),
                    },
                },
            },
        };
        await fs.writeFile(
            join(installPath, 'openclaw.json'),
            JSON.stringify(configData, null, 2),
            'utf-8'
        );

        // 5. 设置自启动（可选）
        if (config.autoStart) {
            await this.setupAutoStart(installPath);
        }
        return installPath;
    }

    private async assertCommand(cmd: string, errorMsg: string): Promise<void> {
        try {
            await execAsync(`${cmd} --version`);
        } catch {
            throw new Error(errorMsg);
        }
    }

    private getBaseUrl(provider: string): string {
        const urls: Record<string, string> = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            siliconflow: 'https://api.siliconflow.cn/v1',
        };
        return urls[provider] || urls.openai;
    }

    private getDefaultModels(provider: string): string[] {
        const models: Record<string, string[]> = {
            openai: ['gpt-4o', 'gpt-4o-mini'],
            anthropic: ['claude-sonnet-4-20250514'],
            siliconflow: ['Qwen/Qwen3-235B-A22B'],
        };
        return models[provider] || [];
    }

    private async setupAutoStart(installPath: string): Promise<void> {
        // 占位：各平台自启动实现已在 openclaw driver 中覆盖
    }
}