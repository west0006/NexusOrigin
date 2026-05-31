// client/src/shared/types/environment.ts
export interface DeploymentConfig {
    framework: string;
    installPath?: string;
    modelProvider: string;
    apiKey: string;
    autoStart?: boolean;
    pythonPath?: string;
}

export interface EnvironmentCheckResult {
    node: boolean;
    nodeVersion?: string;
    npm: boolean;
    python: boolean;
    pythonVersion?: string;
    git: boolean;
    diskSpaceGB: number;
}