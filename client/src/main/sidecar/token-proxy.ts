// ─── client/src/main/sidecar/token-proxy.ts ────────────────
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import { EventEmitter } from 'events';
import { TokenCounter } from './token-counter';
import { CostCalculator } from './cost-calculator';

export interface TokenMetrics {
    timestamp: number;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    skillId?: string;
}

export class TokenProxyServer extends EventEmitter {
    private server: ReturnType<typeof createServer> | null = null;
    private targetUrl: string;
    private apiKey: string;
    private port = 18790;
    private counter: TokenCounter;
    private calculator: CostCalculator;

    constructor(targetUrl: string, apiKey: string) {
        super();
        this.targetUrl = targetUrl;
        this.apiKey = apiKey;
        this.counter = new TokenCounter();
        this.calculator = new CostCalculator();
    }

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = createServer(this.handleRequest.bind(this));
            this.server.listen(this.port, '127.0.0.1', () => resolve());
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            } else {
                resolve();
            }
        });
    }

    private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        // 仅处理 chat completions 请求
        if (!req.url?.includes('/chat/completions') || req.method !== 'POST') {
            this.passThrough(req, res);
            return;
        }

        const body = await this.readBody(req);
        let requestData: any;
        try {
            requestData = JSON.parse(body);
        } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            return;
        }

        const model = requestData.model || 'unknown';
        const messages = requestData.messages || [];
        const inputTokens = this.counter.countTokens(messages);

        // 转发请求
        const proxyReq = this.createProxyRequest(req, body);
        let responseBody = '';
        proxyReq.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
        proxyReq.on('end', () => {
            res.end(responseBody);

            // 解析响应，计算输出 token
            let outputTokens = 0;
            try {
                const respData = JSON.parse(responseBody);
                const content = respData.choices?.[0]?.message?.content || '';
                outputTokens = this.counter.countTokens(content);
            } catch { /* ignore */ }

            const costUsd = this.calculator.calculate(model, inputTokens, outputTokens);

            const metrics: TokenMetrics = {
                timestamp: Date.now(),
                model,
                inputTokens,
                outputTokens,
                costUsd,
                skillId: (req.headers['x-skill-id'] as string) || undefined,
            };

            this.emit('metrics', metrics);
        });

        proxyReq.on('error', (err) => {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        });

        // 转发请求体
        proxyReq.write(body);
        proxyReq.end();
    }

    private createProxyRequest(req: IncomingMessage, body: string) {
        const target = new URL(this.targetUrl + (req.url || ''));
        const options = {
            hostname: target.hostname,
            port: target.port || 443,
            path: target.pathname + target.search,
            method: req.method,
            headers: {
                ...req.headers,
                'Authorization': `Bearer ${this.apiKey}`,
                'host': target.hostname,
            },
        };
        return httpsRequest(options);
    }

    private readBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => resolve(body));
        });
    }

    private passThrough(req: IncomingMessage, res: ServerResponse): void {
        const proxyReq = this.createProxyRequest(req, '');
        req.pipe(proxyReq);
        proxyReq.pipe(res);
    }
}