export const IPC_CHANNELS = {
    // Deployment
    DEPLOYMENT_CHECK_ENV: 'deployment:checkEnv',
    DEPLOYMENT_INSTALL: 'deployment:install',
    DEPLOYMENT_PROGRESS: 'deployment:progress',
    DEPLOYMENT_CANCEL: 'deployment:cancel',

    // OpenClaw (deprecated, use framework-agnostic)
    OPENCLAW_STATUS: 'openclaw:status',
    OPENCLAW_START: 'openclaw:start',
    OPENCLAW_STOP: 'openclaw:stop',
    OPENCLAW_GET_CONFIG: 'openclaw:getConfig',
    OPENCLAW_UPDATE_CONFIG: 'openclaw:updateConfig',

    // Token / Cost
    TOKEN_USAGE: 'token:usage',
    TOKEN_REALTIME: 'token:realtime',
    TOKEN_SET_BUDGET: 'token:setBudget',

    // Skills / Capabilities
    SKILL_LIST: 'skill:list',
    SKILL_INSTALL: 'skill:install',
    SKILL_INSTALLED: 'skill:installed',
} as const;

/**
 * 从 IPC_CHANNELS 中提取值联合类型
 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];