// client/src/renderer/components/Agent/agent-prompt.ts
// Agent 能力描述常量

export interface AgentCapabilityDescriptor {
    id: string;
    name: string;
    description: string;
    icon: string;
}

/** 内置能力描述 */
export const BUILTIN_CAPABILITIES: AgentCapabilityDescriptor[] = [
    { id: 'code-review', name: '代码审查', description: '审查代码质量、安全性和性能问题', icon: '🔍' },
    { id: 'doc-write', name: '文档撰写', description: '生成技术文档和报告', icon: '📝' },
    { id: 'data-analyze', name: '数据分析', description: '分析结构化数据并生成洞察', icon: '📊' },
    { id: 'research', name: '调研分析', description: '收集和分析技术/市场信息', icon: '🔬' },
    { id: 'translate', name: '翻译服务', description: '多语言翻译和本地化', icon: '🌐' },
    { id: 'code-gen', name: '代码生成', description: '根据需求生成功能代码', icon: '⚡' },
];

/** 预设 Agent 模板 */
export const AGENT_TEMPLATES = [
    {
        name: '代码审查员',
        description: '专门审查代码质量、安全漏洞和性能瓶颈',
        capabilities: ['code-review', 'code-gen'],
    },
    {
        name: '文档写手',
        description: '擅长生成技术文档、API 文档和项目报告',
        capabilities: ['doc-write', 'research'],
    },
    {
        name: '数据分析师',
        description: '处理和分析结构化数据，生成可视化报告',
        capabilities: ['data-analyze', 'research'],
    },
];