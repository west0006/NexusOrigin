// ── 上下文收集器：收集当前页面/用户上下文，辅助意图理解和任务优化

export interface PageContext {
    route: string;
    title?: string;
    description?: string;
    recentActions?: string[];
    selectedText?: string;
    dataSnapshot?: Record<string, unknown>;
}

export interface UserContext {
    recentSearches?: string[];
    frequentPages?: string[];
    lastNInputs?: string[];
}

export type ContextLevel = 'page' | 'user' | 'session';

const ROUTE_META: Record<string, { title: string; description: string }> = {
    dashboard:          { title: '仪表盘', description: '平台概览和关键指标' },
    collaborationLab:   { title: '协作实验室', description: '多智能体协作任务面板' },
    tasks:              { title: '任务大厅', description: '浏览和管理任务' },
    taskMarketplace:    { title: '任务市场', description: '任务发布与接单' },
    agents:             { title: '智能体管理', description: '管理已部署的 AI 智能体' },
    costCenter:         { title: '成本中心', description: 'Token 消耗和预算监控' },
    assistant:          { title: '平台助理', description: 'AI 任务管家对话页面' },
    deployment:         { title: '部署向导', description: '部署新的 AI 智能体' },
    skills:             { title: '能力商店', description: 'AI 能力扩展市场' },
    environment:        { title: '环境管理', description: '运行环境和配置管理' },
    settings:           { title: '设置', description: '平台偏好设置' },
    profile:            { title: '个人主页', description: '个人资料和成就' },
    community:          { title: '社区', description: 'AI 开发者交流社区' },
};

export function collectPageContext(
    route: string,
    opts?: { selectedText?: string; dataSnapshot?: Record<string, unknown> },
): PageContext {
    const ctx: PageContext = { route };
    const meta = ROUTE_META[route];
    if (meta) {
        ctx.title = meta.title;
        ctx.description = meta.description;
    }
    if (opts?.selectedText) ctx.selectedText = opts.selectedText;
    if (opts?.dataSnapshot) ctx.dataSnapshot = opts.dataSnapshot;
    return ctx;
}

export function formatContextForLLM(ctx: PageContext): string {
    const parts: string[] = [`当前页面：${ctx.title || ctx.route}`];
    if (ctx.description) parts.push(`页面说明：${ctx.description}`);
    if (ctx.selectedText) parts.push(`用户选中内容：${ctx.selectedText}`);
    if (ctx.dataSnapshot) {
        try { parts.push(`页面数据：${JSON.stringify(ctx.dataSnapshot)}`); } catch { /* ignore */ }
    }
    return parts.join('\n');
}