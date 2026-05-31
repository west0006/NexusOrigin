import { execSync } from 'child_process';
import checkDiskSpace from 'check-disk-space';

export interface EnvCheck {
    node: boolean;
    nodeVersion?: string;
    npm: boolean;
    python: boolean;
    pythonVersion?: string;
    git: boolean;
    diskSpaceGB: number;
}

export async function checkEnvironment(): Promise<EnvCheck> {
    const result: EnvCheck = {
        node: false,
        npm: false,
        python: false,
        git: false,
        diskSpaceGB: 0,
    };

    // Node.js
    try {
        const nodeVer = execSync('node --version', { encoding: 'utf-8' }).trim();
        result.node = true;
        result.nodeVersion = nodeVer;
    } catch {}

    // npm
    try {
        execSync('npm --version', { stdio: 'ignore' });
        result.npm = true;
    } catch {}

    // Python
    try {
        const pythonVer = execSync('python3 --version', { encoding: 'utf-8' }).trim();
        result.python = true;
        result.pythonVersion = pythonVer;
    } catch {
        try {
            const pythonVer = execSync('python --version', { encoding: 'utf-8' }).trim();
            result.python = true;
            result.pythonVersion = pythonVer;
        } catch {}
    }

    // git
    try {
        execSync('git --version', { stdio: 'ignore' });
        result.git = true;
    } catch {}

    // 磁盘空间
    try {
        const disk = await checkDiskSpace(process.platform === 'win32' ? 'C:' : '/');
        result.diskSpaceGB = Math.floor(disk.free / (1024 ** 3));
    } catch {
        result.diskSpaceGB = 10;
    }

    return result;
}