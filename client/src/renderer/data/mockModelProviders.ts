// client/src/renderer/data/mockModelProviders.ts
export interface MockModelProvider {
    id: string;
    name: string;
    baseURL: string;
    type: 'official' | 'third_party' | 'custom';
    apiKeyPreview?: string;
    isDefault?: boolean;
    status?: 'online' | 'offline' | 'unknown';
    latency?: number;
}

export const MOCK_PROVIDERS: MockModelProvider[] = [
    {
        id: 'prov-01',
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        type: 'official',
        apiKeyPreview: 'sk-...abc1',
        isDefault: true,
        status: 'online',
        latency: 320,
    },
    {
        id: 'prov-02',
        name: '硅基流动 (SiliconFlow)',
        baseURL: 'https://api.siliconflow.cn/v1',
        type: 'third_party',
        apiKeyPreview: 'sf-...xyz2',
        isDefault: false,
        status: 'online',
        latency: 180,
    },
    {
        id: 'prov-03',
        name: 'DeepSeek',
        baseURL: 'https://api.deepseek.com/v1',
        type: 'third_party',
        apiKeyPreview: 'ds-...pqr3',
        isDefault: false,
        status: 'online',
        latency: 250,
    },
    {
        id: 'prov-04',
        name: 'Azure OpenAI',
        baseURL: 'https://xxx.openai.azure.com',
        type: 'official',
        apiKeyPreview: 'az-...def4',
        isDefault: false,
        status: 'online',
        latency: 410,
    },
    {
        id: 'prov-05',
        name: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        type: 'third_party',
        apiKeyPreview: 'AIza...ghi5',
        isDefault: false,
        status: 'offline',
        latency: 0,
    },
    {
        id: 'prov-06',
        name: 'Anthropic',
        baseURL: 'https://api.anthropic.com/v1',
        type: 'official',
        apiKeyPreview: 'sk-ant...jkl6',
        isDefault: false,
        status: 'online',
        latency: 380,
    },
    {
        id: 'prov-07',
        name: '本地 Ollama',
        baseURL: 'http://localhost:11434/v1',
        type: 'custom',
        apiKeyPreview: 'ollama',
        isDefault: false,
        status: 'unknown',
        latency: 0,
    },
    {
        id: 'prov-08',
        name: 'Groq',
        baseURL: 'https://api.groq.com/openai/v1',
        type: 'third_party',
        apiKeyPreview: 'gsk_...mno7',
        isDefault: false,
        status: 'online',
        latency: 95,
    },
];