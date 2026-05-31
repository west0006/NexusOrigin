import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ModelInfo {
    id: string;
    name: string;
    contextWindow?: number;
    inputPrice?: number;
    outputPrice?: number;
    capabilities?: string[];
}

@Injectable()
export class ModelGatewayHelper {
    private readonly logger = new Logger(ModelGatewayHelper.name);

    /**
     * 测试连接：使用提供的 BaseURL 和 API Key 发送测试请求
     */
    async testConnection(baseUrl: string, apiKey: string): Promise<{ success: boolean; latency: number; message?: string; models?: ModelInfo[] }> {
        const startTime = Date.now();
        try {
            // 尝试调用 /v1/models 接口（OpenAI 兼容格式）
            const client = this.createAxiosClient(baseUrl, apiKey);
            const response = await client.get('/models', { timeout: 10000 });
            const latency = Date.now() - startTime;

            // 解析模型列表
            const models = this.parseModelsResponse(response.data);
            return {
                success: true,
                latency,
                models: models.slice(0, 10), // 仅返回前10个
            };
        } catch (error: any) {
            this.logger.error(`Connection test failed: ${error.message}`);
            const latency = Date.now() - startTime;
            return {
                success: false,
                latency,
                message: error.response?.data?.error?.message || error.message,
            };
        }
    }

    /**
     * 获取模型列表（从提供商API）
     */
    async fetchModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
        try {
            const client = this.createAxiosClient(baseUrl, apiKey);
            const response = await client.get('/models', { timeout: 10000 });
            return this.parseModelsResponse(response.data);
        } catch (error: any) {
            this.logger.error(`Fetch models failed: ${error.message}`);
            throw new BadRequestException('获取模型列表失败，请检查 API 密钥和 Base URL');
        }
    }

    private createAxiosClient(baseUrl: string, apiKey: string): AxiosInstance {
        // 标准化 BaseURL：确保以 /v1 结尾
        let normalizedUrl = baseUrl.trim().replace(/\/$/, '');
        if (!normalizedUrl.endsWith('/v1')) {
            normalizedUrl = `${normalizedUrl}/v1`;
        }
        return axios.create({
            baseURL: normalizedUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    private parseModelsResponse(data: any): ModelInfo[] {
        // 兼容 OpenAI 格式: { data: [{ id, ... }] }
        if (data?.data && Array.isArray(data.data)) {
            return data.data.map((m: any) => ({
                id: m.id,
                name: m.id,
                contextWindow: m.context_window,
                inputPrice: m.pricing?.input,
                outputPrice: m.pricing?.output,
                capabilities: m.capabilities,
            }));
        }
        // 备用：返回空数组
        return [];
    }
}