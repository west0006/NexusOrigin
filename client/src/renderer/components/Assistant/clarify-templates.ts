// ── 澄清模板：当用户意图模糊时，用结构化模板引导明确需求

export interface ClarifyQuestion {
    id: string;
    label: string;
    options: { value: string; label: string }[];
}

export interface ClarifyTemplate {
    intent: string;
    title: string;
    description: string;
    questions: ClarifyQuestion[];
    assemble: (answers: Record<string, string>) => string;
}

const CONTENT_TEMPLATE: ClarifyTemplate = {
    intent: 'collab',
    title: '内容创作',
    description: '请告诉我更多细节，我会帮你生成高质量内容。',
    questions: [
        {
            id: 'format',
            label: '输出格式',
            options: [
                { value: 'report', label: '详细报告' },
                { value: 'article', label: '文章' },
                { value: 'summary', label: '摘要/总结' },
                { value: 'outline', label: '大纲' },
            ],
        },
        {
            id: 'length',
            label: '预期篇幅',
            options: [
                { value: 'short', label: '简短（500字以内）' },
                { value: 'medium', label: '中等（500-2000字）' },
                { value: 'long', label: '长篇（2000字以上）' },
            ],
        },
        {
            id: 'style',
            label: '写作风格',
            options: [
                { value: 'formal', label: '正式/专业' },
                { value: 'casual', label: '轻松/口语化' },
                { value: 'persuasive', label: '说服性/营销' },
            ],
        },
    ],
    assemble: (answers) => {
        const parts = ['请帮我生成内容'];
        if (answers.format) parts.push(`格式：${answers.format}`);
        if (answers.length) parts.push(`篇幅：${answers.length}`);
        if (answers.style) parts.push(`风格：${answers.style}`);
        return parts.join('，');
    },
};

const DEPLOY_TEMPLATE: ClarifyTemplate = {
    intent: 'deploy',
    title: 'Agent 部署',
    description: '请告诉我你想要部署什么样的 Agent。',
    questions: [
        {
            id: 'capability',
            label: '能力类型',
            options: [
                { value: 'analysis', label: '数据分析 Agent' },
                { value: 'writing', label: '内容创作 Agent' },
                { value: 'coding', label: '代码开发 Agent' },
                { value: 'research', label: '研究助手 Agent' },
            ],
        },
        {
            id: 'model',
            label: '模型选择',
            options: [
                { value: 'default', label: '默认模型' },
                { value: 'small', label: '轻量化模型（更快）' },
                { value: 'large', label: '高性能模型（更准确）' },
            ],
        },
    ],
    assemble: (answers) => {
        const parts = ['请帮我部署一个 Agent'];
        if (answers.capability) parts.push(`能力：${answers.capability}`);
        if (answers.model) parts.push(`模型：${answers.model}`);
        return parts.join('，');
    },
};

const TASK_TEMPLATE: ClarifyTemplate = {
    intent: 'task_publish',
    title: '发布任务',
    description: '请告诉我任务的关键信息。',
    questions: [
        {
            id: 'taskType',
            label: '任务类型',
            options: [
                { value: 'development', label: '开发任务' },
                { value: 'design', label: '设计任务' },
                { value: 'writing', label: '写作任务' },
                { value: 'analysis', label: '分析任务' },
            ],
        },
        {
            id: 'urgency',
            label: '紧急程度',
            options: [
                { value: 'low', label: '不紧急' },
                { value: 'medium', label: '一般' },
                { value: 'high', label: '紧急' },
            ],
        },
    ],
    assemble: (answers) => {
        const parts = ['请帮我发布一个任务'];
        if (answers.taskType) parts.push(`类型：${answers.taskType}`);
        if (answers.urgency) parts.push(`紧急程度：${answers.urgency}`);
        return parts.join('，');
    },
};

const CLARIFY_TEMPLATES: Record<string, ClarifyTemplate> = {
    collab:       CONTENT_TEMPLATE,
    deploy:       DEPLOY_TEMPLATE,
    task_publish: TASK_TEMPLATE,
};

export function getClarifyTemplate(intent: string): ClarifyTemplate | undefined {
    return CLARIFY_TEMPLATES[intent];
}

export function getAllClarifyTemplates(): ClarifyTemplate[] {
    return Object.values(CLARIFY_TEMPLATES);
}

export function needsClarification(intent: string): boolean {
    return intent in CLARIFY_TEMPLATES;
}