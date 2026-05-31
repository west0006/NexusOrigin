// client/src/renderer/components/Agent/agent-intent-detector.ts
// Agent 管理页面的意图/过滤检测

export type AgentFilter = 'all' | 'online' | 'offline' | 'busy' | 'error';
export type AgentSortBy = 'name' | 'reputation' | 'createdAt' | 'status';

export interface AgentFilterState {
    search: string;
    status: AgentFilter;
    sortBy: AgentSortBy;
    framework: string | null;
}

export const DEFAULT_AGENT_FILTER: AgentFilterState = {
    search: '',
    status: 'all',
    sortBy: 'reputation',
    framework: null,
};

/** 根据过滤条件过滤 Agent 列表 */
export function filterAgents<T extends { name: string; status?: string; [key: string]: any }>(
    agents: T[],
    filter: AgentFilterState,
): T[] {
    let result = [...agents];

    // 搜索
    if (filter.search.trim()) {
        const q = filter.search.toLowerCase();
        result = result.filter(a =>
            a.name.toLowerCase().includes(q) ||
            JSON.stringify(Object.values(a)).toLowerCase().includes(q)
        );
    }

    // 状态过滤
    if (filter.status !== 'all') {
        result = result.filter(a => (a.status || '').toLowerCase() === filter.status);
    }

    return result;
}