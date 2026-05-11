// ─── client/src/main/utils/env-checker.ts ─────────────────
import { execSync } from 'child_process';

export interface EnvCheck {
    node: boolean;
    npm: boolean;
    python: boolean;
    pythonVersion?: string;
    git: boolean;
    diskSpace: number;
}

export function checkEnvironment(): EnvCheck {
    const result: EnvCheck = {
        node: false,
        npm: false,
        python: false,
        git: false,
        diskSpace: 10, // 假设有10GB，实际应检测
    };

    try {
        execSync('node --version', { stdio: 'ignore' });
        result.node = true;
    } catch {}

    try {
        execSync('npm --version', { stdio: 'ignore' });
        result.npm = true;
    } catch {}

    try {
        const out = execSync('python3 --version', { encoding: 'utf-8' });
        result.python = true;
        result.pythonVersion = out.trim();
    } catch {}

    try {
        execSync('git --version', { stdio: 'ignore' });
        result.git = true;
    } catch {}

    return result;
}