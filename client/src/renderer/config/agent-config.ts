/**
 * Agent 相关配置
 * 所有地址、模型名等外部依赖集中管理
 */

export const AGENT_CONFIG = {
    // Ollama
    ollama: {
        baseUrl: 'http://127.0.0.1:11434',
        defaultModel: 'qwen2.5-coder:1.5b',
    },

    // Python 服务
    pythonServices: {
        crewai: {
            baseUrl: 'http://localhost:8001',
            healthEndpoint: '/api/crewai/health',
            pipelineEndpoint: '/api/crewai/pipeline',
            registerEndpoint: '/api/crewai/register',
        },
        langgraph: {
            baseUrl: 'http://localhost:8002',
            healthEndpoint: '/api/langgraph/health',
            executeEndpoint: '/api/langgraph/execute',
        },
    },

    // Go 部署服务
    deployService: {
        baseUrl: 'http://localhost:8082',
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