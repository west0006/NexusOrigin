// ─── client/src/renderer/hooks/useDeployment.ts ───────────
import { useState } from 'react';
import type { DeploymentConfig, EnvironmentCheckResult } from '@shared/types';

export function useDeployment() {
    const [envCheck, setEnvCheck] = useState<EnvironmentCheckResult | null>(null);
    const [progress, setProgress] = useState(0);
    const [installing, setInstalling] = useState(false);

    const checkEnv = async () => {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.deployment.checkEnv();
        setEnvCheck(result as EnvironmentCheckResult);
    };

    const install = async (config: DeploymentConfig) => {
        if (!window.electronAPI) return;
        setInstalling(true);
        try {
            const cleanup = window.electronAPI.deployment.onProgress((p) => setProgress(p));

            await window.electronAPI.deployment.install(config);
            cleanup();
        } finally {
            setInstalling(false);
        }
    };

    return { envCheck, progress, installing, checkEnv, install };
}