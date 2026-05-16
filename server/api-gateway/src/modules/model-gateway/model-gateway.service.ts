import { Injectable } from '@nestjs/common';

export interface ModelProvider {
    id: string;
    name: string;
    baseURL: string;
    type: 'official' | 'third_party' | 'custom';
    defaultApiKey?: string; // 平台预设的默认 Key（不推荐，应让用户自己填）
}

@Injectable()
export class ModelGatewayService {
    private builtInProviders: ModelProvider[] = [
        {
            id: 'siliconflow',
            name: '硅基流动',
            baseURL: 'https://api.siliconflow.cn/v1',
            type: 'third_party',
        },
        {
            id: 'openai',
            name: 'OpenAI',
            baseURL: 'https://api.openai.com/v1',
            type: 'official',
        },
        {
            id: 'ofox',
            name: 'OfoxAI',
            baseURL: 'https://api.ofox.com/v1',
            type: 'third_party',
        },
        {
            id: '302ai',
            name: '302.AI',
            baseURL: 'https://api.302.ai/v1',
            type: 'third_party',
        },
    ];

    constructor() {}

    async getProviders(userId: string): Promise<ModelProvider[]> {
        // 实际项目可从数据库加载用户自定义供应商，这里仅返回内置列表 + 自定义占位
        return [
            ...this.builtInProviders,
            { id: 'custom', name: '自定义', baseURL: '', type: 'custom' },
        ];
    }

    async addCustomProvider(
        userId: string,
        name: string,
        baseURL: string,
        apiKey: string,
    ): Promise<ModelProvider> {
        // 简化实现：直接返回新供应商信息（实际应存数据库）
        const newProvider: ModelProvider = {
            id: 'custom_' + Date.now(),
            name,
            baseURL,
            type: 'custom',
        };
        return newProvider;
    }
}