// client/src/renderer/components/Assistant/intent-detector.ts
// 关键词意图检测模块
// MVP：关键词匹配；V2.0 可升级为 TF-IDF + 朴素贝叶斯 或 Ollama 零样本分类

import type { IntentType } from './assistant-prompt';

interface IntentRule {
    intent: IntentType;
    keywords: string[];
    priority: number;
}

const INTENT_RULES: IntentRule[] = [
    { intent: 'collab', keywords: ['写报告', '分析', '协作', '生成', '整理', '总结', '创建', '制作', '帮我写'], priority: 3 },
    { intent: 'task_publish', keywords: ['发布任务', '创建任务', '发起任务', '发任务', '找人做', '外包'], priority: 3 },
    { intent: 'task_query', keywords: ['任务列表', '我的任务', '查看任务', '任务进度', '任务状态'], priority: 2 },
    { intent: 'agent_manage', keywords: ['agent', '智能体', '代理', '列出', '启动', '停止', '部署'], priority: 2 },
    { intent: 'cost_query', keywords: ['成本', '预算', '花费', 'token', '费用', '花了多少钱'], priority: 2 },
    { intent: 'deploy', keywords: ['部署', '安装', '配置'], priority: 1 },
    { intent: 'help', keywords: ['帮助', 'help', '命令', '功能', '能做什么', '你会什么'], priority: 1 },
];

/**
 * 检测用户输入意图
 * @param input 用户输入文本
 * @returns 检测到的意图，未匹配返回 'unknown'
 */
export function detectIntent(input: string): IntentType {
    if (!input.trim()) return 'unknown';

    const text = input.toLowerCase();

    // 先检查 / 命令
    const cmdMatch = text.match(/^\/(\w+)/);
    if (cmdMatch) {
        const map: Record<string, IntentType> = {
            help: 'help', collab: 'collab', task: 'task_query',
            agent: 'agent_manage', deploy: 'deploy', cost: 'cost_query',
        };
        return map[cmdMatch[1]] || 'unknown';
    }

    // 关键词匹配（按优先级排序）
    const sorted = [...INTENT_RULES].sort((a, b) => b.priority - a.priority);
    for (const rule of sorted) {
        for (const keyword of rule.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return rule.intent;
            }
        }
    }

    return 'unknown';
}

/**
 * 意图到路由的映射
 */
export function intentToRoute(intent: IntentType): string | null {
    const map: Partial<Record<IntentType, string>> = {
        collab: 'collaborationLab',
        task_query: 'taskMarketplace',
        task_publish: 'taskMarketplace',
        agent_manage: 'agents',
        deploy: 'agentDeploy',
        cost_query: 'costCenter',
    };
    return map[intent] ?? null;
}