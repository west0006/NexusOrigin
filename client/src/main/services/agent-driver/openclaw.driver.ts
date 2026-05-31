import axios, { AxiosInstance } from 'axios';
import { AgentDriver, InstallOptions, InstallResult, AgentStatus } from './interface';

const DEPLOY_SERVICE_URL = 'http://localhost:8082/api/v1/deploy/openclaw';

export class OpenClawDriver implements AgentDriver {
    private axiosClient: AxiosInstance;
    private installPath: string = '';

    constructor() {
        this.axiosClient = axios.create({
            baseURL: DEPLOY_SERVICE_URL,
            timeout: 300000,
        });
    }

    async install(options: InstallOptions): Promise<InstallResult> {
        try {
            const response = await this.axiosClient.post('/install', {
                installPath: options.installPath,
                modelProvider: options.modelProvider,
                apiKey: options.apiKey,
                autoStart: options.autoStart ?? false,
                pythonPath: options.pythonPath,
            });
            this.installPath = response.data.path;
            return {
                success: true,
                path: this.installPath,
                message: response.data.message,
            };
        } catch (error: any) {
            const message = error.response?.data?.error || error.message || 'Installation failed';
            throw new Error(message);
        }
    }

    async start(): Promise<void> {
        await this.axiosClient.post('/start');
    }

    async stop(): Promise<void> {
        await this.axiosClient.post('/stop');
    }

    async getStatus(): Promise<AgentStatus> {
        try {
            const response = await this.axiosClient.get('/status');
            return response.data;
        } catch {
            return { running: false, error: 'Service unreachable' };
        }
    }

    async getLogs(lines: number = 100): Promise<string> {
        try {
            const response = await this.axiosClient.get('/logs', { params: { lines } });
            return response.data;
        } catch (error: any) {
            return `Failed to fetch logs: ${error.message}`;
        }
    }

    async uninstall(): Promise<void> {
        await this.axiosClient.post('/uninstall');
    }
}