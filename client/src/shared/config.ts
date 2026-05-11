// ─── client/src/shared/config.ts ──────────────────────────
/**
 * IPC 通道常量定义
 * 所有主进程与渲染进程通信均通过这些通道进行
 * 使用 as const 确保类型窄化
 */
export const IPC_CHANNELS = {
    // 部署相关
    DEPLOYMENT_CHECK_ENV: 'deployment:check-env',
    DEPLOYMENT_INSTALL: 'deployment:install',
    DEPLOYMENT_PROGRESS: 'deployment:progress',
    DEPLOYMENT_CANCEL: 'deployment:cancel',

    // OpenClaw 生命周期管理
    OPENCLAW_STATUS: 'openclaw:status',
    OPENCLAW_START: 'openclaw:start',
    OPENCLAW_STOP: 'openclaw:stop',
    OPENCLAW_GET_CONFIG: 'openclaw:get-config',
    OPENCLAW_UPDATE_CONFIG: 'openclaw:update-config',

    // Token 监测
    TOKEN_USAGE: 'token:usage',
    TOKEN_REALTIME: 'token:update',
    TOKEN_SET_BUDGET: 'token:set-budget',

    // 技能商店
    SKILL_LIST: 'skill:list',
    SKILL_INSTALL: 'skill:install',
    SKILL_INSTALLED: 'skill:installed',
} as const;

/**
 * 从 IPC_CHANNELS 中提取值联合类型
 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];