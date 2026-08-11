/**
 * Agent 相关配置
 * 服务地址统一从 env.ts 读取，此处仅保留路径和模型常量。
 */

import { OLLAMA_URL, CREWAI_SERVICE_URL, LANGGRAPH_SERVICE_URL, DEPLOY_SERVICE_URL } from './env';

export const AGENT_CONFIG = {
    // Ollama
    ollama: {
        baseUrl: OLLAMA_URL,
        defaultModel: 'qwen2.5-coder:1.5b',
    },

    // Python 服务
    pythonServices: {
        crewai: {
            baseUrl: CREWAI_SERVICE_URL,
            healthEndpoint: '/api/crewai/health',
            pipelineEndpoint: '/api/crewai/pipeline',
            registerEndpoint: '/api/crewai/register',
        },
        langgraph: {
            baseUrl: LANGGRAPH_SERVICE_URL,
            healthEndpoint: '/api/langgraph/health',
            executeEndpoint: '/api/langgraph/execute',
        },
    },

    // Go 部署服务
    deployService: {
        baseUrl: DEPLOY_SERVICE_URL,
        crewaiEndpoint: '/api/v1/deploy/crewai',
        langgraphEndpoint: '/api/v1/deploy/langgraph',
    },

    // 后端 API
    backend: {
        baseUrl: '/api/v1',
    },

    // 成本费率 (元/千 token)
    costRatePer1k: 0.001,
} as const;