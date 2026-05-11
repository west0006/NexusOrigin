// ─── client/src/shared/types.ts ───────────────────────────
/**
 * 部署相关类型定义
 * 用于主进程与渲染进程间 IPC 通信
 */
export interface DeploymentConfig {
    /** OpenClaw 安装目标路径，默认 ~/.openclaw */
    installPath: string;
    /** 自定义 Python 解释器路径 */
    pythonPath?: string;
    /** 模型提供商 */
    modelProvider: 'openai' | 'anthropic' | 'siliconflow';
    /** 模型提供商 API 密钥（本地加密存储，不上传服务端） */
    apiKey: string;
    /** 是否随系统自启动 OpenClaw 服务 */
    autoStart: boolean;
}

export interface EnvironmentCheckResult {
    node: boolean;
    npm: boolean;
    python: boolean;
    /** Python 版本号字符串，如 "3.11.9" */
    pythonVersion?: string;
    git: boolean;
    /** 可用磁盘空间，单位 GB */
    diskSpace: number;
}

export interface TokenData {
    /** UTC 时间戳 */
    timestamp: number;
    model: string;
    /** 输入 Token 数 */
    inputTokens: number;
    /** 输出 Token 数 */
    outputTokens: number;
    /** 预估费用，单位 USD */
    costUsd: number;
    /** 关联技能 ID，可空 */
    skillId?: string;
}

export interface BudgetConfig {
    /** 月度预算上限，单位 USD */
    monthlyBudget: number;
    /** 告警阈值，0-1，如 0.85 表示达 85% 时告警 */
    alertThreshold: number;
}

export interface SkillListParams {
    page: number;
    pageSize: number;
    keyword?: string;
    category?: string;
    sortBy?: 'downloads' | 'rating' | 'newest';
}

export interface SkillItem {
    id: string;
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
    downloads: number;
    rating: number;
    authorName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}