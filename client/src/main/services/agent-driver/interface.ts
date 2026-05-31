export interface InstallOptions {
    installPath?: string;
    modelProvider: string;
    apiKey: string;
    autoStart?: boolean;
    pythonPath?: string;
    extra?: Record<string, any>;
}

export interface InstallResult {
    success: boolean;
    path: string;
    message?: string;
}

export interface AgentStatus {
    running: boolean;
    version?: string;
    pid?: number;
    port?: number;
    error?: string;
}

export interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
}

export interface AgentDriver {
    install(options: InstallOptions): Promise<InstallResult>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<AgentStatus>;
    getLogs(lines?: number): Promise<string>;
    uninstall(): Promise<void>;
}

export type Framework = 'openclaw' | 'langgraph' | 'crewai';