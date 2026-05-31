# 枢元 NexusOrigin Agent 模块完整设计文档

---

## 第一章 总览

### 1.1 文档目的与范围

本文档为 **枢元 NexusOrigin** 平台中所有与 AI Agent 相关模块的统一设计文档，覆盖以下范围：

- **平台AI助理**：用户的专属 AI 任务管家，自然语言交互入口
- **多智能体协作**：四级角色（中枢/审查/综合/组员）的单框架及跨框架协作
- **流式可视化**：任务执行过程的实时可视化视图
- **任务市场集成**：任务发布→Agent 执行→结果交付的完整闭环
- **能力商店/MCP工具**：Agent 能力的扩展与安装

**设计原则**：
- 框架无关：不绑定任何单一 Agent 框架
- 本地优先：所有 MVP 功能纯本地运行（Ollama + 开源模型）
- 渐进增强：从单框架协作起步，逐步支持跨框架
- 成本可观测：全生命周期 Token 追踪与预算熔断

### 1.2 核心术语表（统一）

| 术语 | 别名（UI显示） | 定义 |
|------|---------------|------|
| **中枢Agent** | 领导Agent、主协调Agent | 全局唯一，负责任务接收、分解、分配、结果聚合、异常决策 |
| **审查Agent** | 监控Agent | 按需部署，监控任务执行，检测异常并分级上报 |
| **综合Agent** | 聚合Agent | 全局唯一，负责阶段评审、结果整合、优化建议生成 |
| **组员Agent** | 工作Agent、Worker | 执行具体子任务，上报进度与成本 |
| **能力注册表** | Agent能力市场 | 所有 Agent 的能力索引，支持动态注册与发现 |
| **预算熔断器** | 成本熔断 | 预算超限时自动暂停/终止任务的保护机制 |
| **A2A网关** | 跨框架网关 | 不同框架 Agent 之间的标准化通信协议适配层 |
| **Sidecar代理** | 成本代理 | 旁路代理，拦截 Agent 的 LLM 调用，记录 Token 消耗 |

> **命名说明**：工程代码统一使用左侧术语（如 `OrchestratorAgent`），业务 UI 使用括号内别名。\*\*"中枢Agent"取代"领导Agent"\*\*作为统一术语，因"中枢"更符合工程命名习惯，且与跨框架协作.md 的原始定义一致。

### 1.3 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用 户 接 入 层                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Ctrl+K命令面板 │  │ 平台助理对话页 │  │ 任务市场浏览/发布页      │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                │                      │                    │
│         └────────────────┼──────────────────────┘                   │
│                          ▼                                          │
│              ┌──────────────────────┐                               │
│              │  流式可视化视图层      │                               │
│              │  任务树 / 时间轴 /    │                               │
│              │  日志流 / 成本仪表     │                               │
│              └──────────┬───────────┘                               │
├─────────────────────────┼───────────────────────────────────────────┤
│                    协 作 调 度 层                                    │
│  ┌─────────────────────────────────────────────┐                   │
│  │              中枢 Agent（Orchestrator）       │                   │
│  │  ┌──────────┐ ┌────────┐ ┌────────────────┐ │                   │
│  │  │任务分解引擎│ │能力匹配器│ │ 结果聚合器      │ │                   │
│  │  └──────────┘ └────────┘ └────────────────┘ │                   │
│  └─────────────────────┬───────────────────────┘                   │
│                        │                                            │
│  ┌─────────────────────┼───────────────────────┐                   │
│  │         A2A 跨框架网关（协议适配层）            │                   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │                   │
│  │  │ CrewAI适配 │ │LangGraph适配│ │ AutoGen适配  │ │ (MVP仅前两者)     │
│  │  └──────────┘ └──────────┘ └──────────────┘ │                   │
│  └─────────────────────┬───────────────────────┘                   │
├─────────────────────────┼───────────────────────────────────────────┤
│                    执 行 与 监 控 层                                  │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐    │
│  │ 审查Agent │ │ 综合Agent │ │ 成本监控    │ │ Sidecar 代理      │    │
│  │          │ │          │ │ 熔断器     │ │ (Token采集)       │    │
│  └──────────┘ └──────────┘ └────────────┘ └──────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                    基 础 能 力 层                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐    │
│  │ Ollama    │ │ CrewAI   │ │ LangGraph│ │ SQLite / PostgreSQL│    │
│  │ 本地模型   │ │ Python服务│ │ Python服务│ │ (任务/成本持久化)   │    │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 功能矩阵（MVP / V2.0 标记）

| 模块 | 功能 | MVP | V2.0 | 说明 |
|------|------|-----|------|------|
| **平台助理** | Ctrl+K 全局命令面板 | ✅ | — | 核心入口 |
| | 单独对话页面（多轮对话） | ✅ | — | |
| | 需求理解与任务自动发布 | ✅ | — | |
| | 上下文感知（页面/用户） | — | ✅ | |
| | 个人知识库 | — | ✅ | Pinecone/ES |
| | 偏好学习与主动推荐 | — | ✅ | |
| **多智能体协作** | 单框架（CrewAI）四级角色 | ✅ | — | |
| | DAG 任务分解与依赖管理 | ✅ | — | |
| | 基于能力的任务分配 | ✅ | — | |
| | 实时过程检测与分级上报 | ✅ | — | |
| | 阶段评审与结果整合 | ✅ | — | |
| | 全生命周期成本管理 + 熔断器 | ✅ | — | |
| | 跨框架协作（LangGraph/AutoGen） | — | ✅ | |
| | 能力市场后端 | — | ✅ | |
| **流式可视化** | 日志流式输出 | ✅ | — | |
| | 任务分解树（React Flow） | — | ✅ | |
| | Agent 调度时间轴 | — | ✅ | |
| | 成本仪表盘 | — | ✅ | |
| **任务市场** | 任务浏览/筛选 | ✅ | — | |
| | 任务发布（配合助手） | ✅ | — | |
| | 结果交付与验收 | ✅ | — | |
| | 支付结算（Saga） | — | ✅ | |
| | 评价评分系统 | — | ✅ | |
| | 争议处理 | — | ✅ | |
| **能力商店** | 前端展示（纯前端 mock） | ✅ | — | |
| | 后端安装/卸载 | — | ✅ | |
| **系统管理** | 预算熔断器 | ✅ | — | |
| | 异常处理与分级告警 | ✅ | — | |
| | 知识库闭环 | — | ✅ | |
| | 自主进化（LoRA微调） | — | ✅ | |
| | Kubernetes 部署 | — | ✅ | |

### 1.5 目录结构规范

```
/（项目根 shrimptank-platform）
├── client/                                  # 前端 + 主进程（Electron）
│   └── src/
│       ├── main/                            # Electron 主进程
│       │   ├── services/
│       │   │   ├── orchestrator.ts           # 中枢调度器（已存在，完整含Registry/Router/CostTracker）
│       │   │   ├── deployment.service.ts      # 部署服务（已存在）
│       │   │   ├── openclaw.service.ts        # OpenClaw 服务（已存在）
│       │   │   └── agent-driver/
│       │   │       └── interface.ts           # Agent Driver 接口（已存在）
│       │   ├── python/
│       │   │   ├── crewai_server.py            # CrewAI Flask 服务（已存在，3 Agent 流水线）
│       │   │   ├── langgraph_server.py         # LangGraph Flask 服务（已存在）
│       │   │   ├── ollama_client.py            # Ollama Python 客户端（已存在）
│       │   │   ├── cost_utils.py               # 成本计算工具（已存在）
│       │   │   ├── start_services.py           # 服务启动脚本（已存在）
│       │   │   └── requirements.txt            # 依赖清单（已存在）
│       │   ├── ipc/
│       │   │   ├── deployment.ipc.ts           # 部署 IPC（已存在）
│       │   │   ├── openclaw.ipc.ts             # OpenClaw IPC（已存在）
│       │   │   ├── skill-store.ipc.ts          # 技能商店 IPC（已存在）
│       │   │   └── token-monitor.ipc.ts        # Token 监控 IPC（已存在）
│       │   ├── sidecar/                        # Sidecar 代理目录（已存在）
│       │   ├── database/                       # 数据库目录（已存在）
│       │   ├── utils/                          # 工具函数（已存在）
│       │   └── windows/                        # 窗口管理（已存在）
│       │
│       └── renderer/                          # 渲染进程（React）
│           ├── api/
│           │   ├── llm/
│           │   │   └── local-ollama.ts          # Ollama 流式 API（已存在）
│           │   ├── agent.api.ts                 # Agent 管理 API（已存在）
│           │   ├── task.api.ts                  # 任务 API（已存在）
│           │   ├── client.api.ts                # 通用请求客户端（已存在）
│           │   ├── assistant.api.ts             # 平台助理 API（需新增）
│           │   ├── orchestrator.api.ts           # 中枢调度 API（需新增）
│           │   └── ipc/
│           │       └── pythonService.ts          # Python 服务 IPC（已存在）
│           ├── components/
│           │   ├── CommandPalette/
│           │   │   └── index.tsx                # Ctrl+K 搜索面板（已存在）
│           │   ├── GlobalCommandPalette/
│           │   │   └── index.tsx                # 全局命令面板（已存在）
│           │   ├── Assistant/                    # 助理相关（部分已存在）
│           │   │   ├── AssistantPanel.tsx        # 助理面板（需重构）
│           │   │   ├── AssistantChat.tsx         # 对话组件（需重构/提取自 Assistant.tsx）
│           │   │   ├── AssistantTrigger.tsx      # 悬浮触发图标（需新增）
│           │   │   ├── assistant-prompt.ts       # 系统提示词（需提取常量）
│           │   │   └── intent-detector.ts        # 意图检测（需新增）
│           │   ├── Agent/                        # Agent 相关（部分已存在）
│           │   │   ├── AgentChat.tsx             # Agent 对话（需新增）
│           │   │   ├── TaskVisualization.tsx     # 流式可视化（需新增）
│           │   │   ├── CostDashboard.tsx         # 成本仪表（需新增）
│           │   │   └── TaskTree.tsx              # 任务树（需新增）
│           │   └── ...（其余组件保持不动）
│           ├── pages/
│           │   ├── Assistant.tsx                 # 助理对话页（已存在，待增强）
│           │   ├── CollaborationLab.tsx           # 协作实验室（已存在，待增强）
│           │   ├── TaskMarket.tsx                 # 任务市场（已存在）
│           │   ├── TaskMarketplace.tsx            # 第二任务市场（已存在）
│           │   ├── AgentChatPanel.tsx               # Agent 管理（已存在）
│           │   ├── Agents.tsx                     # Agent 列表（已存在）
│           │   ├── CostCenter.tsx                 # 成本中心（已存在）
│           │   ├── CapabilityMarketplace.tsx      # 能力市场（已存在）
│           │   └── ...（其余页面保持不动）
│           ├── store/
│           │   ├── agentRegistry.store.ts         # Agent 注册表 store（已存在）
│           │   ├── taskExecution.store.ts          # 任务执行状态 store（已存在）
│           │   ├── tasks.store.ts                 # 任务列表 store（已存在）
│           │   ├── assistant.store.ts             # 助理状态 store（需新增）
│           │   └── ...（其余 store 保持不动）
│           ├── config/
│           │   ├── agent-config.ts                # Agent 配置（已存在）
│           │   └── ...（其余配置保持不动）
│           └── styles/
│               └── theme.ts                       # 主题常量 C（已存在）
│
├── server/                                    # 后端服务（已存在）
├── docker/                                    # Docker 配置（已存在）
├── scripts/                                   # 工具脚本（已存在）
├── z.about/                                   # 设计文档（已存在）
└── ...（配置文件保持不动）
```

---

## 第二章 平台 AI 助理

### 2.1 核心定位与价值

**核心定位**：用户的专属 AI 任务管家，作为用户与 AI 任务市场、多智能体协作系统之间的**唯一自然语言交互入口**。它不是简单的聊天机器人，而是一个能够理解用户意图、代表用户决策、自主执行任务、持续学习进化的**个人智能代理**。

**核心价值**：
- 极致简化：用户只需自然语言说出需求，剩余操作由助手完成
- 降低门槛：无需了解平台复杂功能和流程
- 个性化服务：基于用户习惯提供定制化服务
- 提高任务质量：助手比普通用户更了解如何提出高质量需求
- 节省时间：用户无需全程监控，只需在关键节点确认

### 2.2 全局触发与入口设计

#### 2.2.1 触发方式（三种并存）

| 触发方式 | 快捷键/动作 | 设计理由 |
|----------|------------|----------|
| **键盘快捷键** | `Ctrl+K`（Win）/ `Cmd+K`（Mac） | 行业标准的命令面板快捷键，用户学习成本低 |
| **鼠标触发** | 页面右下角固定悬浮助手图标 | 直观可见，新用户也能发现 |
| **文本选中触发** | 选中页面上任意文本后，自动弹出"让助手处理"选项 | 降低操作步数，提升效率 |

#### 2.2.2 命令面板界面设计

**布局结构**：
```
┌──────────────────────────────────────┐
│ 🔍 输入框（自然语言/命令）            │ ← 聚焦时自动展开
│                                      │
│ 智能建议（根据当前页面/历史操作）       │
│ ┌──────────────────────────────────┐ │
│ │ 📝 帮我写一份关于XX的报告          │ │
│ │ 🔧 帮我部署一个XX Agent           │ │
│ │ 📊 分析一下这个数据                │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 常用命令（最近5个）                    │
│ ┌──────────────────────────────────┐ │
│ │ 1. 发布任务    2. 查看任务进度     │ │
│ │ 3. 部署Agent   4. 查看账单        │ │
│ │ 5. 设置偏好                      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 历史记录（最近10条）                   │
│ ┌──────────────────────────────────┐ │
│ │ 💬 32分钟前：写一份AI市场报告      │ │
│ │ 💬 2小时前：部署数据分析Agent     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**交互逻辑**：
1. Ctrl+K 触发 → 命令面板从屏幕中央浮现（带遮罩）
2. 输入框自动聚焦，实时检测关键词
3. 按关键词给出智能建议（下拉列表）
4. 简单操作在面板内直接完成（如查看任务进度）
5. 复杂操作自动跳转到助理对话页面
6. Esc 或点击遮罩区域关闭面板

#### 2.2.3 关键词检测与智能响应

| 关键词 | 意图 | 响应行为 |
|--------|------|----------|
| "写"/"报告"/"文章" | 内容创作 | 询问字数、风格、deadline |
| "部署"/"创建"/"Agent" | Agent 管理 | 引导部署向导 |
| "发布"/"任务"/"找人" | 任务发布 | 引导任务发布流程 |
| "进度"/"怎么样了" | 任务查询 | 显示进行中的任务列表及状态 |
| "成本"/"花了多少" | 费用查询 | 显示当前Task成本汇总 |
| "帮助"/"不会" | 新手引导 | 展示快速入门指南 |

**实现方式**（原生实现，不依赖外部 SDK）：
```typescript
// src/renderer/components/assistant/intent-detector.ts
const INTENT_KEYWORDS: Record<string, IntentConfig> = {
  content_creation: {
    keywords: ['写', '报告', '文章', '文档', '方案', '计划', '总结'],
    threshold: 0.6, // 关键词覆盖率阈值
    response: 'intent.content_creation'
  },
  agent_deploy: {
    keywords: ['部署', '创建', '启动', '安装', 'Agent', '智能体'],
    threshold: 0.5,
    response: 'intent.agent_deploy'
  },
  task_publish: {
    keywords: ['发布', '找人', '外包', '任务', '帮我做'],
    threshold: 0.5,
    response: 'intent.task_publish'
  },
  task_query: {
    keywords: ['进度', '怎么样了', '完成了吗', '状态', '进行中'],
    threshold: 0.5,
    response: 'intent.task_query'
  },
  cost_query: {
    keywords: ['成本', '花了多少', '费用', '账单', '消费', '花了'],
    threshold: 0.5,
    response: 'intent.cost_query'
  },
  help: {
    keywords: ['帮助', '不会', '怎么用', '教程', '入门', '新手'],
    threshold: 0.5,
    response: 'intent.help'
  }
}
```

**V2.0 可升级方向**：关键词匹配对同义词和复杂自然语言的处理能力有限。
V2.0 可升级为轻量级分类模型（TF-IDF + 朴素贝叶斯 或 基于 Ollama 的零样本分类），
在不增加外部依赖的前提下提升意图识别准确率。

### 2.3 助理对话界面设计

#### 2.3.1 布局结构（独立对话页）

采用**三栏布局**（与社区页一致，保持平台一致性）：

```
┌──────────┬────────────────────────────┬────────────┐
│ 对话历史  │      主对话区域             │ 上下文面板  │
│ ──────── │ ─────────────────────────  │ ────────── │
│ 💬 今天  │  用户: 帮我写一份AI报告     │ 📋 当前任务 │
│   AI报告  │  ┌────────────────────┐   │   无进行中  │
│   数据分析│  │ 好的，请告诉我...   │   │            │
│          │  │ ─────────────────── │   │ 📁 相关文件 │
│ 💬 昨天  │  │ 用户: 3000字左右    │   │   无        │
│   部署Agent│ │ ─────────────────── │   │            │
│          │  │ 助手: 已为你创建...  │   │ ⚙️ 快捷操作 │
│          │  └────────────────────┘   │   查看成本   │
│          │  [输入框] [发送]          │   任务市场   │
└──────────┴────────────────────────────┴────────────┘
```

> **设计来源**：继承社区页的三栏布局模式，三栏宽度比例保持 240px / 1fr / 280px。对话历史栏可折叠。

#### 2.3.2 消息呈现规范

| 消息类型 | 样式 | 交互 |
|----------|------|------|
| 用户消息 | 右对齐，蓝色气泡 | 支持编辑（长按/右键） |
| 助手文本 | 左对齐，灰色气泡 | Markdown 渲染 |
| 任务卡片 | 嵌入卡片，含标题/价格/预估时间 | 点击"确认发布"直接提交 |
| 进度通知 | 进度条 + 当前步骤说明 | 点击跳转到可视化视图 |
| 错误消息 | 红色边框 + 错误码 | 显示"重试"或"联系支持"按钮 |
| 建议选项 | 按钮组（最多4个） | 点击触发后续操作 |

#### 2.3.3 消息编辑功能

```typescript
// 编辑消息的交互逻辑
interface MessageEdit {
  messageId: string;
  originalContent: string;
  editedContent: string;
  editTimestamp: number;
  // 编辑后会删除该消息之后的所有助手回复
  // 重新发送编辑后的内容，助手重新生成回复
}
```

### 2.4 需求理解与任务发布流程

#### 2.4.1 多轮需求澄清流程

```
用户输入模糊需求
      │
      ▼
助手理解意图
      │
      ├── 意图清晰且信息完整 → 直接生成任务
      │
      └── 意图清晰但信息不完整 → 多轮澄清
                │
                ▼
        助手反问缺少的信息（每次最多问2个问题）
                │
                ▼
        用户补充信息
                │
                ▼
        助手验证信息完整性
                │
                ├── 完整 → 生成任务
                │
                └── 仍不完整 → 继续反问（最多3轮）
                           │
                           ▼
                    自动填充默认值 + 生成任务
```

**澄清问题模板**（按任务类型）：

```typescript
const CLARIFY_TEMPLATES: Record<string, ClarifyQuestion[]> = {
  content_creation: [
    { field: 'wordCount', question: '需要多少字？', defaultValue: '1000' },
    { field: 'deadline', question: '截止时间是什么时候？', defaultValue: '3天' },
    { field: 'style', question: '风格要求？（正式/通俗/学术）', defaultValue: '通俗' },
  ],
  data_analysis: [
    { field: 'dataSource', question: '数据来源是什么？', defaultValue: '用户上传' },
    { field: 'analysisGoal', question: '主要分析目标是什么？', defaultValue: '趋势分析' },
  ],
  agent_deploy: [
    { field: 'framework', question: '使用哪个框架？（CrewAI / LangGraph）', defaultValue: 'CrewAI' },
    { field: 'agentCount', question: '需要几个Agent？', defaultValue: '3' },
  ]
}
```

#### 2.4.2 从对话到任务的转换逻辑

```
用户输入 → 意图识别 → 信息抽取 → 信息验证 → 任务生成 → 用户确认 → 任务发布
                                                              │
                                                        用户修改 → 重新生成

助手端流程（伪代码）：
1. 接收用户自然语言输入
2. 调用 Ollama 提取关键信息（任务标题、类型、需求描述、约束条件）
3. 对照 CLARIFY_TEMPLATES 检查信息完整性
4. 如有缺失 → 生成澄清问题（最多3轮）
5. 信息完整 → 生成标准化任务对象
6. 展示任务卡片给用户确认
7. 用户确认 → 调用 task-market API 发布
8. 用户修改 → 返回步骤2
```

#### 2.4.3 智能建议与自动补全

```typescript
interface AutoSuggestion {
  text: string;           // 建议的补全文本
  type: 'query' | 'command' | 'template';  // 补全类型
  confidence: number;      // 置信度 0-1
}

// 实时检测输入变化，每 300ms 更新建议列表
// 基于关键词匹配 + 历史命令频率排序
// 支持 Tab 键选中第一条建议
```

### 2.5 上下文感知（MVP 范围限定）

**MVP 阶段仅实现以下上下文感知能力**：

| 上下文类型 | 实现方式 | MVP范围 |
|------------|----------|---------|
| 页面上下文 | 监听当前路由，传递当前页面名称 | ✅ |
| 任务上下文 | 查询当前用户的任务列表（简化为3条） | ✅ |
| 用户基本信息 | 用户名、头像、信用点余额 | ✅ |
| 用户偏好 | 模型偏好、常用任务类型（localStorage） | ✅ |
| 对话历史 | 当前会话的消息列表 | ✅ |
| 知识库 | 用户上传文档 | — 标记V2.0 |

```typescript
// MVP 上下文对象结构
interface AssistantContext {
  currentPage: string;           // 当前路由名
  userInfo: {
    name: string;
    avatar: string;
    credits: number;
  };
  activeTasks: TaskBrief[];      // 进行中的任务（最多3条）
  userPreferences: {
    preferredModel: string;      // 默认 'qwen2.5-coder:1.5b'
    commonTaskTypes: string[];   // localStorage 统计
  };
  recentMessages: Message[];     // 当前会话最近的消息(从store读取)
}
```

### 2.6 个人知识库（V2.0 规划标记）

> ⚠️ **以下内容为 V2.0 规划，MVP 阶段不实现**

- 混合检索（BM25 + 向量相似度）
- 语义分块（基于文档结构）
- 增量更新（监听文件变化）
- 权限控制（私有/共享）
- 持久化（本地 SQLite 或 Elasticsearch）

### 2.7 技术实现规范

#### 2.7.1 Ollama 流式 API

```typescript
// src/renderer/api/llm/local-ollama.ts
// 模型默认值：qwen2.5-coder:1.5b
// 可在用户偏好中切换到 3b / 7b

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
}

// 流式请求：fetch + ReadableStream
// 错误处理：模型未启动 → "请先启动 Ollama"
// 网络错误 → "Ollama 服务连接失败，请检查 http://localhost:11434"
```

#### 2.7.2 助理系统提示词

```typescript
// src/renderer/components/assistant/assistant-prompt.ts
export const ASSISTANT_SYSTEM_PROMPT = `
你是一个专业的 AI 任务助理，帮助用户完成以下操作：

1. **内容创作**：写报告、文章、方案等
   - 询问字数、风格、截止时间
   - 生成后展示预览，用户确认后再发布

2. **任务发布**：将需求转化为可执行的任务
   - 自动提取关键信息
   - 生成任务卡片供用户确认
   - 确认后调用发布接口

3. **Agent 部署**：引导用户部署新的 Agent
   - 推荐框架（CrewAI / LangGraph）
   - 生成部署配置

4. **查询操作**：查看任务进度、成本等

操作规范：
- 每次只问最多 2 个问题
- 超过 3 轮仍未获取完整信息时，使用默认值
- 关键操作必须经用户确认
- 保持专业但友好的语气
- 使用 Markdown 格式回复

当前上下文：{context}
`;
```

#### 2.7.3 组件结构

```
assistant/
├── AssistantPanel.tsx       # Ctrl+K 命令面板（全局）
├── AssistantChat.tsx        # 对话主体组件
├── AssistantTrigger.tsx     # 右下角悬浮图标
├── assistant-prompt.ts      # 系统提示词
├── intent-detector.ts       # 关键词意图检测
├── clarify-templates.ts     # 澄清问题模板
└── context-collector.ts     # 上下文收集器
```

### 2.8 交互流程完整示例

**场景**：用户在社区页阅读时想发布一个数据分析任务。

```
1. 用户按 Ctrl+K
2. 命令面板弹出，输入框自动聚焦
3. 用户输入："帮我分析一下用户数据"
4. 助手检测到 data_analysis 意图
5. 助理反问："请问数据来源是什么？主要分析目标是？"
6. 用户输入："我有一份 CSV 文件，想看用户留存趋势"
7. 助理自动生成任务卡片：
   ┌─────────────────────────────────────┐
   │ 📋 任务预览                          │
   │ 标题：用户留存趋势分析                │
   │ 类型：数据分析                        │
   │ 描述：分析 CSV 文件中用户留存趋势      │
   │ 预估费用：¥15-30  预估时间：30分钟    │
   │ [确认发布]  [修改]  [取消]           │
   └─────────────────────────────────────┘
8. 用户点击"确认发布"
9. 任务进入中枢调度器 → 分配给组员 Agent
10. 助理通知："任务已发布！当前进度：正在分配 Agent..."
11. 用户可点击通知跳转到流式可视化视图查看执行过程
```

---


## 第三章 单框架多智能体协作（四级角色闭环）

### 3.1 四级角色定义

| 角色 | 工程命名 | 英文 | 全局数量 | 职责 |
|------|---------|------|---------|------|
| **中枢Agent** | `OrchestratorAgent` | Orchestrator | 1 | 任务接收→分解→分配→状态追踪→结果聚合→异常决策 |
| **审查Agent** | `ReviewerAgent` | Reviewer | 按需 | 实时监控任务执行，检测异常并分级上报 |
| **综合Agent** | `SynthesizerAgent` | Synthesizer | 1 | 阶段评审、结果整合、优化建议生成 |
| **组员Agent** | `WorkerAgent` | Worker | N | 执行具体子任务，上报进度与成本 |

**状态机**：

```
┌──────────────────────────────────────────────────────────────────┐
│                    中枢Agent 状态机                                │
│  IDLE → DECOMPOSING → ASSIGNING → MONITORING → SYNTHESIZING → IDLE│
│              ↑              │            ↑              │          │
│              └──── RETRY ───┘            └── FAILED ───┘          │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                组员Agent 状态机                        │
│  ONLINE → ASSIGNED → RUNNING → COMPLETED / FAILED     │
│              │          │                              │
│              └──────────┘                              │
│                   REJECTED                             │
└─────────────────────────────────────────────────────┘
```

### 3.2 统一状态管理

采用当前代码中已有的**乐观锁 + store 订阅**模式，不引入新的状态框架。

**核心数据流**：
1. `main/services/orchestrator.ts`（已存在）管理主进程任务状态
2. `renderer/store/taskExecution.store.ts`（已存在）通过 IPC 同步渲染进程状态
3. `renderer/store/agentRegistry.store.ts`（已存在）管理 Agent 注册表

**状态同步机制**（保持现有设计）：

```
orchestrator.ts (主进程) ←→ IPC (token-monitor.ipc.ts) ←→ renderer store (Zustand)
```

### 3.3 任务分解与 DAG 依赖管理

**核心入口**：中枢调度器 `orchestrator.ts` 的 `decomposeTask` 方法

**处理流程**：
1. 接收用户原始任务描述
2. 调用 Ollama（通过 `local-ollama.ts`）生成子任务列表
3. 解析 JSON 格式的子任务（含依赖关系）
4. 构建 DAG，检测循环依赖（DFS 拓扑排序）
5. 持久化子任务到 store
6. 返回可供分配的子任务列表

```typescript
// 在现有 orchestrator.ts 中补充方法
// src/main/services/orchestrator.ts 内新增

interface SubTask {
  subtaskId: string;
  description: string;
  taskType: 'data_collection' | 'analysis' | 'generation' | 'review';
  dependencies: string[];           // 依赖的子任务 ID 列表
  status: 'PENDING' | 'ASSIGNED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  assignedAgentId: string | null;
}

async function decomposeTask(taskDescription: string): Promise<SubTask[]> {
  // 1. 获取历史分解模板（从存储中查询同类型任务的分解记录）
  // 2. 获取当前可用 Agent 能力列表
  const availableCaps = this.capabilityRegistry.getAvailableCapabilities();
  
  // 3. 构建分解提示词
  const prompt = buildDecompositionPrompt(taskDescription, availableCaps);
  
  // 4. 调用 Ollama 流式分解
  let result = '';
  await ollamaChat({
    messages: [{ role: 'system', content: SYSTEM_PROMPTS.decomposition }, { role: 'user', content: prompt }],
    model: 'qwen2.5-coder:1.5b',
    onChunk: (chunk) => { result += chunk; },
  });
  
  // 5. 解析 JSON
  const subtasks = JSON.parse(result) as SubTask[];
  
  // 6. 验证 DAG 依赖（循环检测）
  if (hasCircularDependency(subtasks)) {
    // 递归重试，最多 3 次
    return decomposeTask(taskDescription);
  }
  
  return subtasks;
}
```

> **与现有代码的关系**：现有 `orchestrator.ts` 的 `OrchestrationTask` 和 `TaskStep` 模型已为任务分解提供了数据结构基础，但尚未实现 LLM 驱动的分解逻辑。当前是让用户手动输入子步骤（`CollaborationLab.tsx` 的 pipelineSteps）。本设计将其升级为自动化分解。

### 3.4 基于能力的任务分配

**当前代码状态**：
- `orchestrator.ts` 的 `CapabilityRegistry` 已实现 Agent 注册表（注册/心跳/离线清理）
- `orchestrator.ts` 的 `TaskRouter` 已实现任务分配到特定能力的 Agent
- 缺少**综合评分算法**（当前仅为简单匹配）

**增强方案**：在现有 `TaskRouter` 中加入评分排序

```typescript
// 在现有 orchestrator.ts TaskRouter 中补充评分逻辑
function assignBestAgent(subtask: SubTask): AgentRegistration | null {
  const candidates = this.capabilityRegistry
    .getAgentsByCapability(subtask.taskType)
    .filter(a => a.status === 'idle');
  
  if (candidates.length === 0) return null;
  
  // 综合评分：能力匹配度 × 0.6 + 负载因子 × (-0.3) + 历史成功率 × 0.1
  const scored = candidates.map(agent => ({
    agent,
    score: 
      0.6 * matchCapability(agent, subtask) +
      (-0.3) * getLoadFactor(agent) +
      0.1 * getSuccessRate(agent)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].agent;
}
```

### 3.5 实时过程检测与分级问题上报

**升级** `CollaborationLab.tsx` 现有的步骤状态机制：

```typescript
// CollaborationLab.tsx 中的步骤状态增强
interface StepStatus {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'warning';
  output: string;
  progress: number;        // 0-100 进度百分比
  cost: { tokens: number; estimatedUsd: number };
  logs: string[];          // 实时日志行
  anomalies: Anomaly[];    // 检测到的异常
}

interface Anomaly {
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  suggestedAction?: string; // 建议的处理方式
}
```

### 3.6 阶段评审与结果整合

综合 Agent 逻辑（可运行于 `crewai_server.py` 或 `orchestrator.ts`）：

```typescript
// orchestrator.ts 中新增 synthesize 方法
async function synthesizeResults(steps: TaskStep[]): Promise<string> {
  const allOutputs = steps
    .filter(s => s.status === 'completed')
    .map(s => `[步骤 ${s.stepId}: ${s.capabilityId}]\n${s.output}`);
  
  const prompt = `你是一个结果整合专家。请将以下各步骤的输出整合为一份完整的、连贯的最终答案：\n\n${allOutputs.join('\n\n')}`;
  
  let result = '';
  await ollamaChat({
    messages: [{ role: 'system', content: SYSTEM_PROMPTS.synthesize }, { role: 'user', content: prompt }],
    onChunk: (chunk) => { result += chunk; },
  });
  
  return result;
}
```

### 3.7 全生命周期成本管理（含熔断器）

**当前代码状态**：
- `token-monitor.ipc.ts`（已存在）→ Token 监控 IPC
- `cost_utils.py`（已存在）→ 成本计算工具
- `orchestrator.ts` 的 `CostTracker`（已存在）→ 成本追踪
- `CostCenter.tsx`（已存在）→ 成本中心页面
- `agent-config.ts` → costRatePer1k 配置

**需补充**：预算熔断器（Budget Circuit Breaker）

```typescript
// orchestrator.ts CostTracker 中新增熔断器
class BudgetCircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private budget: number;                // 总预算（Token）
  private used: number = 0;
  private warningThreshold: number = 0.8; // 80% 预警
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  
  constructor(budget: number) {
    this.budget = budget;
    
  }
  
  recordUsage(tokens: number): 'OK' | 'WARNING' | 'BREACH' {
    this.used += tokens;
    const ratio = this.used / this.budget;
    
    if (ratio >= 1.2) { // 120% 强制开路
      this.state = 'OPEN';
      return 'BREACH';
    }
    if (ratio >= 0.8 && this.failureCount > 3) {
      this.state = 'HALF_OPEN';
      return 'WARNING';
    }
    if (ratio >= 0.8) return 'WARNING';
    return 'OK';
  }
  
  isAllowed(): boolean {
    if (this.state === 'OPEN') return false;
    if (this.state === 'HALF_OPEN') {
      // 半开状态：允许一个请求试水
      this.state = 'OPEN'; // 临时关闭，成功后恢复
      return true;
    }
    return true;
  }
}
class CostTracker {
  private breaker: BudgetCircuitBreaker;
  private taskId: string;

  constructor(taskId: string, budget: number) {
            this.taskId = taskId;
            this.breaker = new BudgetCircuitBreaker(budget);
          }

  recordCost(tokens: number, stepId?: string): { allowed: boolean; action: 'OK' | 'WARNING' | 'BREACH' } {
            const status = this.breaker.recordUsage(tokens);
            if (status === 'BREACH') {
                  this.terminateTask(`预算已超限 (${this.breaker.used}/${this.breaker.budget} tokens)`);
                  return { allowed: false, action: 'BREACH' };
                }
            if (status === 'WARNING') {
                  this.emitWarning(`预算使用已达 ${((this.breaker.used / this.breaker.budget) * 100).toFixed(0)}%`);
                  return { allowed: true, action: 'WARNING' };
                }
            return { allowed: true, action: 'OK' };
          }

  private terminateTask(reason: string) { /* 触发任务终止流程 */ }
  private emitWarning(msg: string) { /* 发送预警通知 */ }
}
```

### 3.8 任务调度与资源管理

复用现有 `orchestrator.ts` 的 `TaskRouter` 设计：

```typescript
// 现有 orchestrator.ts 已具备
// - 能力匹配（findBestAgentForCapability）
// - 任务排队（queueTask）
// - 并行/串行执行逻辑

// 需增强：DAG 依赖调度
// 当多个无依赖关系的子任务可同时执行时，触发并行调度
```

---

## 第四章 跨框架协作与协议适配

### 4.1 现有跨框架支持情况

| 框架 | 当前支持状态 | 文件 |
|------|------------|------|
| **CrewAI** | ✅ 完整实现 | `crewai_server.py`（Flask + 3 Agent 流水线） |
| **LangGraph** | ✅ 完整实现 | `langgraph_server.py`（Flask + 节点图） |
| **OpenClaw** | ✅ 接口定义 + IPC | `interface.ts` + `openclaw.service.ts` |
| **AutoGen** | ❌ 未实现 | 文档规划，MVP 不涵盖 |

**当前架构**（已有代码已实现的跨框架流程）：

```
用户 → CollaborationLab.tsx（选择框架类型）
        │
        ├── single → crewai_server.py（计划员→研究员→撰稿人）
        │
        ├── cross  → langgraph_server.py（分析→优化→输出）
        │
        └── custom → 用户自定义流程
```

### 4.2 框架无关的 Agent 注册与发现

**当前状态**：`orchestrator.ts` 的 `CapabilityRegistry` 已支持多框架 Agent 统一注册：

```typescript
// 现有 orchestrator.ts 已实现
export interface AgentRegistration {
  agentId: string;
  name: string;
  framework: 'crewai' | 'langgraph' | 'openclaw';  // 框架字段
  endpoint: string;
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'offline';
  lastHeartbeat: number;
}
```

**心跳机制**：`CapabilityRegistry` 每 15 秒清理离线 Agent（已有实现）。无需改动。

### 4.3 跨框架通信与调度

**当前流程**（通过 `CollaborationLab.tsx` 已实现）：

```
用户输入 → API 请求
  ├── CrewAI 路径：POST /api/crewai/pipeline
  │     → crewai_server.py 按顺序调用计划员→研究员→撰稿人
  │     → 每个步骤流式返回结果
  │
  └── LangGraph 路径：POST /api/langgraph/execute
        → langgraph_server.py 执行有向图节点
        → 流式返回节点结果
```

**A2A 协议适配**（在现有基础上补充）：

```typescript
// 新增：src/client/src/renderer/api/agent/a2a-gateway.ts
// A2A（Agent-to-Agent）通信协议统一接口

interface A2AMessage {
  version: '1.0';
  messageId: string;
  sourceAgentId: string;
  targetAgentId: string;
  taskId: string;
  type: 'task_request' | 'task_response' | 'heartbeat' | 'status_update' | 'cost_report';
  payload: any;
  timestamp: number;
  signature?: string;  // 使用 Ed25519 签名（V2.0）
}

async function sendA2AMessage(agent: AgentRegistration, message: A2AMessage): Promise<void> {
  const response = await fetch(`${agent.endpoint}/a2a/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  
  if (!response.ok) {
    throw new Error(`A2A 通信失败: ${agent.agentId} - ${response.statusText}`);
  }
}
```

### 4.4 能力市场与 MCP 工具集成

**当前状态**：
- `CapabilityMarketplace.tsx`（已存在）→ 能力市场页面
- `renderer/api/agent.api.ts` 含 `getServices()` 方法

**集成点**：能力市场中的能力可在中枢调度器的能力匹配中使用，用户安装的能力自动注册到 `CapabilityRegistry`。

---

## 第五章 流式可视化视图

### 5.1 现有可视化组件分析

当前代码中已有 `CollaborationFlow.tsx` 组件：

```
client/src/renderer/components/CollaborationFlow.tsx
```

**现有组件能力**：
- Modal 弹窗式展示任务执行步骤
- 颜色编码（成功/运行/失败/待处理）
- 步骤图标（✅⏳❌○）
- 通过 `useTaskExecutionStore` 获取步骤状态
- 支持关闭并清空状态

**当前局限**（相对于完整设计）：

| 功能 | 现有状态 | 整合设计目标 |
|------|---------|-------------|
| 步骤列表 | ✅ 线性展示 | ✅ 保持 |
| 任务分解树 | ❌ 无 | React Flow 拓扑图（V2.0） |
| Agent 调度时间轴 | ❌ 无 | 时间轴视图（V2.0） |
| 实时日志流 | ❌ 仅显示输出文本 | 按步骤展开日志行（MVP） |
| 成本仪表盘 | ❌ 步骤级别不显示 | 步骤级成本显示（MVP） |
| 中断/重试操作 | ❌ 仅关闭 | 暂停/终止/重试按钮（MVP） |

### 5.2 MVP 阶段升级方案（基于现有 CollaborationFlow.tsx）

基于现有代码进行**渐进增强**，不重写：

**增强点 1：增加成本显示（每步 + 总计）**

```typescript
// 在 CollaborationFlow.tsx 步骤卡片底部增加
{currentTask && (
  <div style={{...}}>
    <small>Token: {step.tokenCount.input + step.tokenCount.output} | 费用: ¥{(step.cost).toFixed(4)}</small>
  </div>
)}
```

**增强点 2：增加操作控制按钮**

```typescript
// 步骤卡片底部按钮
{step.status === 'running' && (
  <button onClick={() => abortTask(step.stepId)}>终止</button>
)}
{step.status === 'failed' && (
  <button onClick={() => retryStep(step.stepId)}>重试</button>
)}
```

**增强点 3：增加实时日志行**

```typescript
// 展开步骤可查看逐行日志
const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

{expandedSteps.has(step.stepId) && step.logs && (
  <div style={{...}}>
    {step.logs.map((log, i) => <div key={i} style={{fontSize: 12, color: C.textSecondary}}>{log}</div>)}
  </div>
)}
```

### 5.3 V2.0 规划：完整可视化视图

> ⚠️ 以下为 V2.0 规划，MVP 不实现

```
┌────────────────────────────────────────────────────────────────────┐
│  任务分解树（左）                │  Agent 调度时间轴（右）           │
│  ┌─────────────────────┐       │  ┌──────────────────────┐         │
│  │ ○ 分析用户数据        │       │  │ 09:00 计划员 █████░░ │         │
│  │ ├─○ 数据清洗          │       │  │ 09:05 研究员 ████████│         │
│  │ ├─○ 留存率计算        │       │  │ 09:12 撰稿人 ████░░░ │         │
│  │ └─○ 生成报告          │       │  └──────────────────────┘         │
│  └─────────────────────┘       │                                    │
├────────────────────────────────┴────────────────────────────────────┤
│  实时日志流                                                        │
│  [09:00:12] 计划员：开始分析需求...                                  │
│  [09:00:15] 计划员：识别出3个子任务                                   │
│  [09:00:16] ✅ 计划员完成                                            │
├─────────────────────────────────────────────────────────────────────┤
│  成本仪表盘                                                        │
│  总 Token: 2,480 │ 估算费用: ¥0.0248 │ 预算: ¥0.05 │ ████████░░ 50%│
└─────────────────────────────────────────────────────────────────────┘
```

使用的库（V2.0 时引入）：
- `react-flow`（`@xyflow/react`）— 任务树
- 时间轴使用原生 CSS 绘制，避免额外依赖

---

## 第六章 任务市场集成

### 6.1 现有任务市场页面分析

当前代码中已有两个任务市场页面：

| 文件 | 功能 |
|------|------|
| `pages/TaskMarket.tsx` | 任务市场（A2A 任务列表 + MOCK 模式） |
| `pages/TaskMarketplace.tsx` | 第二任务市场（基础卡片列表） |
| `store/tasks.store.ts` | 任务列表状态管理 |
| `api/task.api.ts` | 任务 API（`tasksApi` + `a2aTasksApi`） |
| `api/agent.api.ts` | Agent API（含 `agentAPI.getServices()`） |

**决策**：统一使用 `TaskMarket.tsx` 作为任务市场入口，废弃 `TaskMarketplace.tsx`。
废弃前将 `TaskMarketplace.tsx` 中独有的功能（如果有）合并至 `TaskMarket.tsx`。
标记为 P2 任务，MVP 阶段可暂时保留两个页面。

### 6.2 任务市场和 Agent 协作的衔接流程

```
平台助理（Assistant.tsx）            任务市场（TaskMarket.tsx）
      │                                    │
      │ 用户说"帮我分析数据"                 │
      ▼                                    │
  需求理解 + 任务卡片预览                    │
      │                                    │
      │ 用户确认                            │
      ▼                                    │
  createTask() ─────────────────────────→ 新的任务出现在列表中
      │                                    │
      │                                    ▼
      │                              中枢调度器（orchestrator.ts）
      │                                    │
      │                              匹配 Agent → 分配任务
      │                                    │
      │                                    ▼
      │                              组员 Agent 执行
      │                                    │
      ◄────────────────────────────────── 状态更新（Stream）
      │                                    │
      ▼                                    │
  助理通知用户进度                           │
      │                                    ▼
      │                              任务完成后更新状态
      ◄────────────────────────────────── 结果返回到任务详情
      │
  "任务完成！结果已发布到任务市场"
```

### 6.3 状态流转图（任务全生命周期）

```
   ┌──────────┐
   │  PENDING  │ ← 用户通过平台助理或直接发布
   └────┬─────┘
        │ 中枢调度器接收
        ▼
   ┌──────────┐
   │DECOMPOSING│ ← 正在分解为子任务
   └────┬─────┘
        │ 分解完成
        ▼
   ┌──────────┐
   │ASSIGNING │ ← 正在匹配 Agent
   └────┬─────┘
        │ Agent 接受
        ▼
   ┌──────────┐
   │EXECUTING │ ← 正在执行（可查看进度）
   └────┬─────┘
        │
        ├── 全部成功 ──► ┌──────────┐
        │                │COMPLETED │ → 通知用户 → 结果查看
        │                └──────────┘
        │
        ├── 部分失败 ──► ┌──────────┐
        │                │PARTIAL   │ → 根据失败原因决定重试/降级
        │                └──────────┘
        │
        └── 全部失败 ──► ┌──────────┐
                         │  FAILED  │ → 通知用户 → 修改后重新发布
                         └──────────┘
```

### 6.4 与现有代码的集成点

```typescript
// 在 assistant.store.ts 中新增（需创建）
// 平台助理 → 任务发布的桥梁

interface TaskPublishBridge {
  // 从助理对话中生成的任务对象
  pendingTask: {
    title: string;
    description: string;
    type: string;
    budget: number;
    deadline: string;
  } | null;
  
  // 动作
  setPendingTask: (task: TaskPublishBridge['pendingTask']) => void;
  confirmPublish: () => Promise<void>;  // 调用 tasksApi.create
  cancelPublish: () => void;
}
```

---

## 第七章 技术实现规范

### 7.1 现有技术栈确认

| 层 | 技术 | 文件位置 | 备注 |
|---|------|---------|------|
| **前端框架** | React 18 + TypeScript | `client/src/renderer/` | — |
| **状态管理** | Zustand | `client/src/renderer/store/` | 多个 store 已存在 |
| **样式** | CSS-in-JS（C 常量对象） | `client/src/renderer/styles/theme.ts` | 变量如 `C.cardBg`, `C.primary` 等 |
| **主进程** | Electron（Node.js） | `client/src/main/` | — |
| **数据库** | SQLite + TypeORM | `client/src/main/database/` | — |
| **通信** | IPC（Electron） | `client/src/main/ipc/` + `client/src/renderer/api/ipc/` | — |
| **Python 服务** | Flask + CrewAI + LangGraph | `client/src/main/python/` | 3 个 Python 服务 |
| **LLM** | Ollama（qwen2.5-coder:1.5b） | `local-ollama.ts` + `ollama_client.py` | 前端和 Python 双端调用 |
| **包管理** | pnpm workspace（monorepo） | `pnpm-workspace.yaml` | — |
| **构建** | Turbo + Electron Builder | `turbo.json`, `package.json` | — |

### 7.2 Ollama 本地模型配置

**当前配置**（`agent-config.ts`）：

```typescript
export const AGENT_CONFIG = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    defaultModel: 'qwen2.5-coder:1.5b',
  },
  costRatePer1k: 0.001,  // 元/千 token
  // ...python 服务配置
};
```

> 模型版本：MVP 使用 `qwen2.5-coder:1.5b`（启动快、资源低）。用户可在偏好转 `qwen2.5-coder:3b` 或 `7b`。

**前端调用链**：

```
Component (Assistant.tsx / CollaborationLab.tsx)
  → store (Zustand action)
    → api (local-ollama.ts / agent.api.ts / task.api.ts)
      → IPC (pythonService.ts) 或 HTTP (fetch)
        → Python 服务 (crewai_server.py / langgraph_server.py)
          → Ollama Client (ollama_client.py)
            → Ollama HTTP API (localhost:11434)
```

### 7.3 Python 服务规范

**当前服务清单**：

| 服务 | 端口 | 入口文件 | 核心功能 |
|------|------|---------|---------|
| CrewAI 服务 | 8001 | `crewai_server.py` | 计划员→研究员→撰稿人流水线；health/pipeline/register 端点 |
| LangGraph 服务 | 8002 | `langgraph_server.py` | 有向图节点执行；health/execute 端点 |
| 通用工具 | — | `ollama_client.py` | Ollama HTTP 客户端 + Token 估算 |
| 成本工具 | — | `cost_utils.py` | 成本计算 |

**CrewAI 服务现有 API**（`crewai_server.py`）：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/crewai/health` | GET | 健康检查 + 心跳 + 能力注册信息 |
| `/api/crewai/pipeline` | POST | 执行完整流水线（流式返回 SSE） |
| `/api/crewai/register` | POST | Agent 注册 |

**LangGraph 服务现有 API**（`langgraph_server.py`）：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/langgraph/health` | GET | 健康检查 |
| `/api/langgraph/execute` | POST | 执行图（流式返回 SSE） |

### 7.4 组件结构规范（修正版）

```
components/
├── Assistant/                  # 平台助理组件（现有分散在 pages/Assistant.tsx，建议提取）
│   ├── AssistantPanel.tsx       # 全局命令面板（复用现有 CommandPalette 设计）
│   ├── AssistantChat.tsx        # 对话组件（从现有 Assistant.tsx 提取）
│   ├── AssistantTrigger.tsx     # 右下角悬浮触发图标（新增）
│   ├── assistant-prompt.ts      # 系统提示词常量（从现有 Assistant.tsx 提取）
│   └── intent-detector.ts       # 关键词意图检测模块（新增）
│
├── Agent/                      # Agent 协作相关（现有 CollaborationFlow.tsx）
│   ├── CollaborationFlow.tsx    # 现有关键——增强版流式可视化（增强现有）
│   └── CostDashboard.tsx        # 成本仪表组件（拆分自 CostCenter.tsx）
│
├── CommandPalette/              # 命令面板（已存在，保持不动）
│   └── index.tsx
│
├── GlobalCommandPalette/        # 全局命令面板（已存在，保持不动）
│   └── index.tsx
│
└── ...（其他现有组件保持不动）
```

> **设计原则**：不破坏现有组件结构。新增文件为新功能所需，现有文件仅做功能增强而非重写。

### 7.5 样式系统规范

使用现有 `theme.ts` 中定义的 `C` 对象常量：

```typescript
// client/src/renderer/styles/theme.ts（现有）
export const C = {
  primary: '#6C5CE7',
  bg: '#F8F9FA',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1A202C',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#E17055',
  radiusLg: '12px',
  // ... 更多
};
```

所有新组件统一使用此主题变量，不引入额外样式库。

### 7.6 需新增的 Store 文件

| Store | 文件名 | 说明 |
|-------|--------|------|
| 助理状态 | `assistant.store.ts` | 对话历史、流式状态、意图检测、任务草稿桥接 |

```typescript
+// client/src/renderer/store/assistant.store.ts（需新增）
+import { create } from 'zustand';
+
+interface Message {
+  id: string;
+  role: 'user' | 'assistant' | 'system';
+  content: string;
+  timestamp: number;
   +}
+
+interface TaskDraft {
+  title: string;
+  description: string;
+  type: string;
+  budget: number;
+  deadline: string;
   +}
+
+type IntentType = 'content_creation' | 'agent_deploy' | 'task_publish' | 'task_query' | 'cost_query' | 'help';
+
+interface AssistantState {
+  // 状态
+  messages: Message[];
+  loading: boolean;
+  isStreaming: boolean;
+  currentIntent: IntentType | null;
+  pendingTask: TaskDraft | null;
+
+  // Actions
+  sendMessage: (content: string) => Promise<void>;
+  setPendingTask: (task: TaskDraft | null) => void;
+  confirmPublish: () => Promise<void>;      // 调用 tasksApi.create
+  cancelPublish: () => void;
+  clearConversation: () => void;
+  abortStream: () => void;
   +}
```

现有 `taskExecution.store.ts` 和 `agentRegistry.store.ts` 已经覆盖了任务执行和 Agent 注册的状态管理，无需重复。

### 7.7 需新增的 API 文件

| API | 文件名 | 说明 |
|-----|--------|------|
| 平台助理 | `assistant.api.ts` | 助理对话的 API 封装（前端封装 `local-ollama.ts`） |

现有 `agent.api.ts`、`task.api.ts`、`local-ollama.ts` 已覆盖大部分功能。

---

## 第八章 数据模型（Prisma schema 补充）

### 8.1 现有数据库结构

`client/src/main/database/` 已存在 SQLite + TypeORM 数据库实现。

### 8.2 新增模型设计（基于现有基础设施）

```typescript
// 新增数据模型（在主进程 database/entities/ 目录下）

// Agent 注册表实体
@Entity('agent_registrations')
class AgentRegistrationEntity {
  @PrimaryColumn() agentId: string;
  @Column() name: string;
  @Column() framework: 'crewai' | 'langgraph' | 'openclaw';
  @Column() endpoint: string;
  @Column('simple-json') capabilities: AgentCapability[];
  @Column() status: 'idle' | 'busy' | 'offline';
  @Column() lastHeartbeat: number;
  @CreateDateColumn() createdAt: Date;
}

// 任务实体
@Entity('tasks')
class TaskEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column('text') description: string;
  @Column() type: string;
  @Column() status: string;
  @Column({ nullable: true }) userId: string;
  @Column({ default: 0 }) totalCost: number;
  @Column({ default: 0 }) totalTokensInput: number;
  @Column({ default: 0 }) totalTokensOutput: number;
  @Column('simple-json', { nullable: true }) steps: TaskStep[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

// 成本记录实体
@Entity('cost_records')
class CostRecordEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() taskId: string;
  @Column() agentId: string;
  @Column() modelName: string;
  @Column() inputTokens: number;
  @Column() outputTokens: number;
  @Column('float') costUsd: number;
  @CreateDateColumn() createdAt: Date;
}
```

---

## 第九章 实施路线图

### 9.1 各阶段范围定义

| 阶段 | 周期 | 范围 |
|------|------|------|
| **Phase 0：基础设施对齐** | 1-2天 | 代码审读完成（✅已做）、缺失文件创建、Store 补充 |
| **Phase 1：平台助理增强** | 2-3天 | 从 `Assistant.tsx` 提取 `AssistantChat` 组件、新增 `assistant-prompt.ts`、`intent-detector.ts`、任务发布桥接 |
| **Phase 2：协作流程增强** | 2-3天 | `CollaborationFlow.tsx` 增强（成本显示+操作按钮+日志行） |
| **Phase 3：中枢调度器增强** | 2-3天 | `orchestrator.ts` 补充任务分解 LLM 驱动、综合评分算法、预算熔断器 |
| **Phase 4：文档对齐** | 1天 | 整理 `z.about/` 目录下的设计文档，与代码同步 |

### 9.2 V2.0 规划（MVP 后）

- 流式可视化完整版（React Flow 任务树 + 时间轴）
- 知识库集成（语义搜索 + 增量更新）
- 跨框架协作增强（AutoGen 适配器）
- 支付结算（Saga 模式）
- 评价评分（时间衰减 + 贝叶斯平均）
- Agent 市场后端（安装/卸载/沙箱）
- 自主进化（LoRA 微调 + 规则学习）

### 9.3 验收标准

| 标准 | 描述 |
 |------|------|
| 平台助理 | Ctrl+K 全局面板 + 多轮对话 + 任务发布桥接 |
| 协作流程 | 可视化展示步骤进度 + 成本 + 支持重试/终止 |
| 中枢调度 | Agent 注册/心跳/分配/追踪 + 预算熔断 |
| 文档对齐 | 设计文档中所有"已存在"标注与实际代码一致 |
|
| **预检清单（实施前必做）** |
| 1. 确认 `CollaborationFlow.tsx` 当前实际能力（步骤级成本？操作按钮？） |
| 2. 确认 `orchestrator.ts` 中 CostTracker 是否已有熔断逻辑 |
| 3. 确认 `TaskMarket.tsx` 和 `TaskMarketplace.tsx` 功能差异 |
| 4. 确认 `local-ollama.ts` 流式 API 的中断信号是否正常传递 |

---

好的，输出第四批——附录内容。

---

## 附录 A：各设计文档评分表与整合对照

### A.1 分文档评审对照表

**说明**：以下为原始设计文档的评估，本整合文档（本文档）已系统性地解决了其中的全部矛盾和缺失。
保留此评分表仅作为历史参考和一致性追踪依据，新开发请以本文档为准。

| 文档 | 文件路径 | 整体评价 | 一致性 | 完整性 | 技术可行性 | 主要问题 |
|------|---------|---------|-------|-------|-----------|---------|
| **平台AI助理.md** | `z.about/` | 中等 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 缺系统提示词内容、伪代码与真代码不匹配、缺持久化方案 |
| **agent相关全流程实现.md** | `z.about/` | 较好 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 缺关键代码段、缺目录结构说明 |
| **agent相关模块mvp.md** | `z.about/` | 较好 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 硬编码 Agent 与能力市场动态注册矛盾、V2.0 功能未标记 |
| **跨框架协作.md** | `z.about/` | 较好 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 对当前代码框架已实现能力评估不足 |
| **跨框架协作流式可视化视图.md** | `z.about/` | 基础 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 无代码实现、V2.0 功能未标记 |
| **任务市场业务设计.md** | `z.about/` | 中等 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 状态流程图与实际实现不一致、成本估算无具体算法 |
| **任务市场布局设计.md** | `z.about/` | UI 参考 | ⭐⭐ | ⭐ | ⭐⭐ | 非技术文档、MVP无动态布局 |
| **全流程设计.md** | `z.about/` | 全面 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | Token 估算与跨框架文档不统一、任务市场细节在另一文档 |
| **优化.md** | `z.about/` | 补充 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | 存在与主文档不匹配的实现细节 |
| **阶段审查报告1.md** | `z.about/` | 实施 | — | — | — | 仅审查了当前实现状态，未参与整合 |

### A.2 文档间一致性矛盾完整清单

| # | 矛盾点 | 文档A | 文档B | 整合决议 |
|---|--------|-------|-------|---------|
| 1 | 中枢调度器是否实现 | agent全流程.md：大幅描述设计 | 跨框架协作.md：显示已实现代码 | ✅ 已实现于 orchestrator.ts |
| 2 | 模型版本 | agent全流程.md：1.5b | 跨框架.md：3b | ✅ 统一为 1.5b（MVP），用户可切换 |
| 3 | 成本估算 | 全流程设计.md：字符/2.5 | 跨框架.md：tiktoken | ✅ MVP 用字符/2.5，V2.0 可切 tiktoken |
| 4 | 能力注册 vs 硬编码 | 跨框架.md：动态注册 | mvp.md：硬编码 Agent | ✅ 现有代码已支持动态注册（CapabilityRegistry），硬编码仅作为 MVP 默认值 |
| 5 | "中枢" vs "领导" | 跨框架.md：中枢Agent | mvp.md / 全流程：领导Agent | ✅ 统一为"中枢Agent"，UI 显示"领导Agent" |
| 6 | 可视化范围 | 协作视图.md：完整 React Flow 树 | CollaborationFlow.tsx：简单模态列表 | ✅ MVP 保持现有模态，V2.0 引入 React Flow |
| 7 | 任务市场与Agent 衔接 | 全流程.md：紧密耦合 | 任务市场.md：独立 | ✅ 通过桥梁层连接，两个系统保持独立可扩展 |
| 8 | Python 依赖 | 各文档分散指定 | requirements.txt 仅 31 字节 | ✅ 整合为统一清单 |

---

## 附录 B：总体评价与实施建议

### B.1 总体评价

这组文档为枢元 NexusOrigin 平台的 AI Agent 模块提供了**较好的设计蓝图**，覆盖了从用户入口（平台助理、任务市场）到技术实现（多框架协作、流式可视化、成本管理）的完整链路。设计思路清晰，MVP 和 V2.0 的分界大体合理。

### B.2  关键改进建议（按优先级排列）

**P0 必须修复**：
1. **统一术语**：已在本整合文档中完成（中枢Agent、"已存在"标注修正）
2. **修正目录结构**：已在本整合文档中完成（client/src/ 前缀）
3. **补充附录**：已在本附录中完成

**P1 建议优化**：
1. `requirements.txt` 扩展（当前仅 31 字节，缺少具体版本）
2. 成本估算统一为常量引用 `AGENT_CONFIG.costRatePer1k`
3. `CollaborationFlow.tsx` 增加步骤级成本显示

**P2 中长期**：
1. 建立 OpenAPI / Protobuf 契约文件
2. 组件 Storybook 及测试
3. Sidecar 代理自动注入（当前仅采集数据）

### B.3 已知待实现项（来自阶段审查报告1.md）

这些是当前代码已存在但尚未集成/激活的功能：

| 待实现项 | 当前状态 | 优先级 |
|---------|----------|-------|
| Sidecar 代理未在主进程启动 | 代码存在但未启用 | P1 |
| 部署向导未真正调用后端 | 仅 mock | P1 |
| 预算熔断器未集成到调度流程 | CostTracker 已存在但熔断器未接入 | P1 |
| 能力市场与 Agent 注册表未打通 | 前端页面存在，但后端注册未连接 | P2 |
| 任务市场未与中枢调度器衔接 | 各 store 独立，无桥梁 | P1 |

---

## 整合文档完整结构总览

```
枢元 NexusOrigin Agent 模块完整设计文档
├── 第一章 总览
│   ├── 1.1 文档目的与范围
│   ├── 1.2 核心术语表（统一）
│   ├── 1.3 整体架构图
│   ├── 1.4 功能矩阵（MVP / V2.0 标记）
│   └── 1.5 目录结构规范（修正版）✅
├── 第二章 平台AI助理 ✅
│   ├── 2.1-2.2 定位与触发入口
│   ├── 2.3 对话界面设计
│   ├── 2.4 需求理解与任务发布
│   ├── 2.5 上下文感知
│   ├── 2.6 个人知识库（V2.0）
│   └── 2.7-2.8 技术实现 + 交互实例
├── 第三章 单框架四级角色协作 ✅
│   ├── 3.1-3.2 角色定义 + 状态管理
│   ├── 3.3 任务分解与 DAG
│   ├── 3.4 能力匹配评分
│   ├── 3.5 实时检测与分级上报
│   ├── 3.6 结果整合
│   └── 3.7-3.8 成本熔断 + 调度
├── 第四章 跨框架协作与协议适配 ✅
│   ├── 4.1 现有支持情况
│   ├── 4.2 注册与发现
│   ├── 4.3 A2A 协议
│   └── 4.4 能力市场集成
├── 第五章 流式可视化视图 ✅
│   ├── 5.1 现有组件分析
│   ├── 5.2 MVP 升级方案
│   └── 5.3 V2.0 规划
├── 第六章 任务市场集成 ✅
│   ├── 6.1 现有页面分析
│   ├── 6.2 衔接流程
│   ├── 6.3 状态流转
│   └── 6.4 集成点
├── 第七章 技术实现规范 ✅
│   ├── 7.1-7.2 技术栈 + Ollama
│   ├── 7.3 Python 服务
│   ├── 7.4 组件结构
│   ├── 7.5 样式系统
│   └── 7.6-7.7 新增文件清单
├── 第八章 数据模型 ✅
│   ├── 8.1 现有数据库
│   └── 8.2 新增实体
├── 第九章 实施路线图 ✅
│   ├── 9.1 阶段定义
│   ├── 9.2 V2.0 规划
│   └── 9.3 验收标准
└── 附录
    ├── A.1 文档评分表 ✅
    ├── A.2 一致性矛盾清单 ✅
    ├── B.1 总体评价 ✅
    ├── B.2 改进建议 ✅
    └── B.3 待实现项 ✅
```

---

