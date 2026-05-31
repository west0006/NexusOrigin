// client/src/renderer/components/Assistant/assistant-prompt.ts
// 平台助理系统提示词常量

export type IntentType = 'help' | 'collab' | 'task_publish' | 'task_query' | 'agent_manage' | 'cost_query' | 'deploy' | 'unknown';

export const SYSTEM_PROMPT = `你是枢元 NexusOrigin 平台的智能助手。你可以帮助用户：

1. 回答平台使用问题（如何部署 Agent、如何发布任务等）
2. 创建协作任务（用户说"帮我写报告"等，自动跳转到协作实验室）
3. 管理 Agent（列出、启动、停止）
4. 查询成本、预算信息

请用简洁专业的中文回答，不要编造不存在的功能。`;

export const ASSISTANT_SYSTEM_PROMPT = SYSTEM_PROMPT;

export const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant' as const,
    content: '你好！我是枢元平台助理。我可以帮助你：\n\n- 🤖 管理 Agent\n- 📋 创建协作任务\n- 🔍 回答平台使用问题\n- 💰 查询成本信息\n\n请告诉我你需要什么帮助？',
    timestamp: Date.now(),
};

// 快捷命令列表
export const COMMANDS = [
    { cmd: '/help', label: '显示帮助', intent: 'help' as IntentType },
    { cmd: '/collab', label: '打开协作实验室', intent: 'collab' as IntentType },
    { cmd: '/task', label: '打开任务大厅', intent: 'task_query' as IntentType },
    { cmd: '/agent', label: '打开智能体管理', intent: 'agent_manage' as IntentType },
    { cmd: '/deploy', label: '打开部署向导', intent: 'deploy' as IntentType },
    { cmd: '/cost', label: '查询成本信息', intent: 'cost_query' as IntentType },
];

export const HELP_TEXT = `可用命令：\n${COMMANDS.map(c => `- \`${c.cmd}\` ${c.label}`).join('\n')}`;