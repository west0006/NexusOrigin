# 一、总前置准备（Codex必须先执行）
## 1.1 环境安装（本地操作，Codex辅助生成安装说明）
1. 安装Ollama（本地免费模型引擎）
    - 下载地址：https://ollama.com/
    - 安装要求：默认路径，无需注册、无需登录、无需付费
2. 拉取免费开源模型（终端执行）
   ```bash
   ollama pull qwen2.5-coder:1.5b
   ```
    - 验证：`ollama list` 能看到该模型
3. 安装Python环境（3.9+）+ 依赖包（终端执行）
   ```bash
   pip install crewai langgraph flask flask-cors
   pip install "langchain-ollama>=0.2.0"
   ```
4. 项目依赖：无需新增npm付费包，复用现有React/TS依赖

## 1.2 项目目录新增规范（Codex严格按此创建文件）
```
src/
├── renderer/
│   ├── api/
│   │   ├── llm/                # 本地模型API
│   │   │   └── local-ollama.ts
│   │   └── agent/              # 智能体适配器
│   │       └── cross-framework-adapter.ts
│   ├── components/
│   │   ├── AgentChat.tsx       # 基础对话
│   │   ├── SingleFrameworkCrew.tsx  # 单框架协作
│   │   ├── CrossFrameworkAgent.tsx  # 跨框架协作
│   │   ├── PlatformAssistant.tsx    # 平台助理
│   │   └── assistant-prompt.ts       # 助理prompt
│   └── pages/Community.tsx    # 原有主页面（集成用）
└── main/
    └── python/                # 本地Python服务
        ├── crewai_server.py
        └── langgraph_server.py
```

---

# 阶段1：基础Agent对话模块（1小时·超详细步骤）
## 核心目标
实现**本地Ollama流式对话**，纯本地、无付费、可悬浮、复用社区样式
## 模块1-1：创建本地Ollama API工具类
### 执行步骤
1. 创建文件：`src/renderer/api/llm/local-ollama.ts`
2. 功能定义：
    - 导出`localOllamaChat`函数，支持**流式请求**
    - 请求地址：`http://localhost:11434/api/chat`
    - 模型固定：`qwen2.5-coder:1.5b`
    - 入参：`messages: {role: string; content: string}[]`
    - 出参：流式字符串（逐字返回）
    - 错误处理：本地模型未启动提示（"请先启动Ollama"）
3. 编码要求：
    - 纯TS，类型齐全
    - 复用项目异常处理逻辑
    - 无任何远程/付费接口

## 模块1-2：创建基础对话组件
### 执行步骤
1. 创建文件：`src/renderer/components/AgentChat.tsx`
2. 组件结构：
    - 外层容器：右下角悬浮面板（固定定位，不影响三栏布局）
    - 头部：标题「基础Agent对话」+ 关闭按钮
    - 消息区：滚动容器（`overflow-y: auto`），复用项目`C`样式
    - 输入区：输入框 + 发送按钮（回车快捷发送）
    - 清空按钮：清空历史消息
3. 状态定义：
    - `messages`：消息列表（用户/AI）
    - `loading`：加载状态
    - `isOpen`：面板展开/收起
4. 交互逻辑：
    - 点击发送 → 调用`localOllamaChat` → 流式渲染消息
    - 禁止重复发送（loading状态锁）
    - 纯本地调用，无网络请求

## 模块1-3：集成到原有Community页面
### 执行步骤
1. 打开文件：`src/renderer/pages/Community.tsx`
2. 导入组件：`import { AgentChat } from '../components/AgentChat'`
3. 挂载位置：页面最底部，不干扰三栏布局
   ```tsx
   {/* 基础Agent对话悬浮面板 */}
   <AgentChat />
   ```
4. 样式要求：
    - 悬浮面板层级：`z-index: 999`
    - 复用项目`C`颜色、圆角、间距
    - 不改动原有布局、样式、状态

## 模块1-4：验证标准（Codex执行后自检）
1. 启动Ollama → 启动项目
2. 打开社区页面 → 右下角展开对话面板
3. 发送消息「你好」→ 本地模型逐字回复
4. 无报错、无付费API调用、无网络请求
5. 样式与社区完全统一

---

## 阶段2：单框架多智能体协作（CrewAI + Ollama 本地零成本）
**核心目标**：实现**同框架（CrewAI）下多智能体自动化协作流水线**，支持：任务发起 → 3个智能体（研究员→撰稿人→校对）自动对话协作 → 输出最终结果 → 全程日志可视化；**纯本地、0付费、无云服务**。
**复用约束**：完全复用项目现有样式、三栏布局、Community.tsx结构，不改动原有逻辑。

---

## 模块2-1：编写本地CrewAI协作服务（Python后端）
### 执行步骤（Codex逐行编写）
1. **文件路径**：`src/main/python/crewai_server.py`
2. **核心功能**：
    - 启动**本地Flask HTTP服务**（端口：8001），供Electron前端调用
    - 内置3个标准CrewAI智能体：**研究员、内容撰稿、质量校对**
    - 强制绑定本地Ollama模型（`qwen2.5-coder:1.5b`），无任何付费模型
    - 提供2个接口：
        - `/status`：服务健康检查
        - `/start-crew`：接收用户任务，启动多智能体协作，返回流式日志
    - 跨域配置：开启`flask-cors`，允许前端`localhost`调用
    - 日志输出：逐行打印智能体对话内容，返回给前端实时渲染
3. **编码约束**：
    - 无外部依赖、无付费API、无云调用
    - 异常捕获：Ollama未启动、Python依赖缺失友好提示
    - 流式返回：保证前端能实时接收协作日志
4. **代码结构要求**：
   ```python
   # 1. 导入依赖（全部免费开源）
   from flask import Flask, jsonify, request
   from flask_cors import CORS
   from crewai import Agent, Task, Crew
   from langchain_ollama import ChatOllama
   import sys

   # 2. 初始化Flask app
   app = Flask(__name__)
   CORS(app)

   # 3. 初始化本地Ollama模型（零成本核心）
   llm = ChatOllama(
       model="qwen2.5-coder:1.5b",
       base_url="http://localhost:11434",
       temperature=0.7
   )

   # 4. 定义3个智能体（固定角色）
   researcher = Agent(...)
   writer = Agent(...)
   checker = Agent(...)

   # 5. 定义任务流程
   @app.route('/start-crew', methods=['POST'])
   def start_crew():
       # 接收前端任务 → 创建Task → 启动Crew → 逐行返回日志
       pass

   # 6. 启动服务
   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=8001, debug=True)
   ```

---

## 模块2-2：编写前端「单框架多智能体协作」面板组件
### 执行步骤（Codex逐行编写）
1. **文件路径**：`src/renderer/components/SingleFrameworkCrew.tsx`
2. **组件定位**：社区三栏内**可折叠面板**，不破坏原有布局
3. **组件结构**：
    - 面板头部：标题「单框架多智能体（CrewAI）」+ 折叠/展开开关
    - 任务输入区：文本域（输入协作任务）+ 启动/停止按钮
    - 实时日志区：滚动容器（`overflow-y: auto`），展示智能体对话流程
    - 结果展示区：最终成文内容展示
    - 清空按钮：清空日志与结果
4. **状态定义（严格TS类型）**：
   ```ts
   const [task, setTask] = useState<string>('');
   const [logs, setLogs] = useState<string[]>([]);
   const [result, setResult] = useState<string>('');
   const [loading, setLoading] = useState<boolean>(false);
   const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
   ```
5. **核心交互逻辑**：
    - 点击「启动协作」→ 校验任务非空 → 调用`localhost:8001/start-crew`
    - 流式读取日志 → 实时追加到日志列表 → 自动滚动到底部
    - 加载锁：防止重复启动
    - 停止按钮：中断请求（AbortController）
6. **样式约束**：
    - 100%复用项目`C`颜色常量、圆角、间距、边框
    - 面板背景：`C.cardBg`，文字：`C.text`，边框：`C.border`
    - 日志区：等宽字体、灰色小字、自适应高度
    - 不改动三栏布局、不覆盖原有卡片、不影响滚动

---

## 模块2-3：集成到原有Community.tsx主页面
### 执行步骤（Codex严格执行）
1. **打开文件**：`src/renderer/pages/Community.tsx`
2. **导入组件**：
   ```tsx
   import { SingleFrameworkCrew } from '../components/SingleFrameworkCrew';
   ```
3. **挂载位置**：
    - 非聚焦模式：帖子列表**下方**，独立折叠面板
    - 聚焦模式：右栏评论区**上方**，不遮挡评论
    - 代码插入位置：原有帖子列表容器内部，最底部
4. **布局要求**：
    - 添加`margin-top: 16px`，与帖子列表分隔
    - 宽度100%适配容器，不超出、不挤压
    - 层级正常，不悬浮、不遮挡其他元素
5. **零侵入要求**：
    - 不修改原有state、不修改原有函数、不破坏原有逻辑
    - 仅新增组件挂载代码，无其他改动

---

## 模块2-4：本地启动脚本（Codex生成说明）
1. **Windows启动脚本**：`scripts/start-crewai.bat`
   ```bat
   @echo off
   cd src/main/python
   python crewai_server.py
   ```
2. **macOS/Linux启动脚本**：`scripts/start-crewai.sh`
   ```bash
   #!/bin/bash
   cd src/main/python
   python3 crewai_server.py
   ```
3. **使用说明**：
    - 先启动Ollama
    - 再运行脚本启动CrewAI服务
    - 最后启动前端Electron项目

---

## 模块2-5：阶段2 验收标准（Codex执行后自检）
1. **服务校验**：访问`http://localhost:8001/status` 返回`{"status": "ok"}`
2. **前端展示**：社区页面出现「单框架多智能体」折叠面板
3. **流程校验**：
    - 输入任务：`写一篇关于AI Agent的短文`
    - 点击启动 → 日志区实时输出：
      `【研究员】正在搜集信息...`
      `【撰稿人】正在撰写内容...`
      `【校对】正在检查质量...`
4. **结果校验**：协作完成后展示最终文章
5. **成本校验**：无任何网络请求、无付费API、全程本地运行
6. **样式校验**：与社区页面风格完全统一，无样式错乱
7. **布局校验**：不破坏三栏、不影响滚动、不遮挡按钮

---

## 阶段3：跨框架多智能体协作（CrewAI ↔ LangGraph + Ollama 纯本地零成本）
**核心目标**：实现**不同框架智能体的跨框架对话协作**，CrewAI 负责信息搜集，LangGraph 负责内容优化与编辑，通过本地适配器统一调度；**全程纯本地、0付费、无云、无付费API**，完全复用社区三栏布局与样式规范，无侵入式修改。

---

## 模块3-1：编写本地 LangGraph 协作服务（Python 后端）
### 执行步骤（Codex 逐行编写）
1. **文件路径**：`src/main/python/langgraph_server.py`
2. **核心功能**：
    - 启动本地 Flask HTTP 服务（端口：**8002**），与 CrewAI 服务端口隔离
    - 内置 **1 个 LangGraph 智能体：内容优化编辑**（极简图结构，无复杂流程）
    - 强制绑定本地 Ollama 模型（`qwen2.5-coder:1.5b`）
    - 提供 2 个接口：
        - `/status`：健康检查
        - `/process`：接收 CrewAI 输出结果，执行优化，返回处理后内容
    - 跨域配置：`flask-cors` 全放行，支持前端本地调用
    - 日志输出：处理流程实时打印，返回给前端
3. **编码约束**：
    - 极简 LangGraph 结构（仅 2 个节点：输入 → 优化），降低调试成本
    - 无外部依赖、无联网、无付费接口
    - 异常捕获：模型未启动、服务端口占用友好提示
4. **代码结构要求**：
   ```python
   # 1. 导入免费开源依赖
   from flask import Flask, jsonify, request
   from flask_cors import CORS
   from langgraph.graph import StateGraph, END
   from langchain_ollama import ChatOllama
   from typing import TypedDict

   # 2. 初始化服务
   app = Flask(__name__)
   CORS(app)

   # 3. 绑定本地Ollama模型
   llm = ChatOllama(
       model="qwen2.5-coder:1.5b",
       base_url="http://localhost:11434",
       temperature=0.3
   )

   # 4. 定义LangGraph极简状态与工作流
   class GraphState(TypedDict):
       content: str
       optimized: str

   def optimize_content(state: GraphState):
       # 内容优化逻辑
       pass

   # 构建工作流
   workflow = StateGraph(GraphState)
   workflow.add_node("optimize", optimize_content)
   workflow.set_entry_point("optimize")
   workflow.add_edge("optimize", END)
   app_agent = workflow.compile()

   # 5. 对外接口
   @app.route('/process', methods=['POST'])
   def process_content():
       # 接收内容 → 执行LangGraph → 返回结果
       pass

   # 6. 启动服务
   if __name__ == '__main__':
       app.run(host='0.0.0.0', port=8002, debug=True)
   ```

---

## 模块3-2：编写跨框架统一调度适配器（TS 工具类）
### 执行步骤（Codex 逐行编写）
1. **文件路径**：`src/renderer/api/agent/cross-framework-adapter.ts`
2. **核心功能**：
    - 作为**跨框架调度核心**，统一对接 CrewAI(8001) + LangGraph(8002)
    - 定义**全局标准消息格式**（屏蔽框架差异）
    - 提供核心调度方法：
        - `startCrossFramework(task: string)`：启动跨框架协作流
        - `fetchCrewResult(task: string)`：调用 CrewAI 服务获取初稿
        - `sendToLanggraph(content: string)`：发送给 LangGraph 优化
        - `abort()`：中断流程
    - 流式日志输出，实时返回给前端
3. **类型定义（严格 TS）**：
   ```ts
   export interface CrossFrameworkLog {
     from: 'crewai' | 'langgraph' | 'scheduler';
     content: string;
     timestamp: number;
   }

   export interface CrossFrameworkResult {
     original: string;
     optimized: string;
   }
   ```
4. **编码约束**：
    - 纯前端本地调度，无中间件、无云服务
    - 异常捕获：服务未启动提示用户开启 Python 服务
    - 复用项目异常处理与 `showToast`

---

## 模块3-3：编写前端跨框架协作面板组件
### 执行步骤（Codex 逐行编写）
1. **文件路径**：`src/renderer/components/CrossFrameworkAgent.tsx`
2. **组件定位**：社区三栏内**可折叠面板**，与单框架面板同级
3. **组件结构**：
    - 面板头部：标题「跨框架多智能体（CrewAI ↔ LangGraph）」+ 折叠开关
    - 任务输入区：文本域（输入协作任务）+ 启动/停止按钮
    - 实时日志区：标记框架来源（CrewAI / LangGraph），颜色区分
    - 结果对比区：左侧原始内容、右侧优化内容，双栏展示
    - 清空按钮：清空日志、结果、状态
4. **状态定义**：
   ```ts
   const [task, setTask] = useState<string>('');
   const [logs, setLogs] = useState<CrossFrameworkLog[]>([]);
   const [result, setResult] = useState<CrossFrameworkResult | null>(null);
   const [loading, setLoading] = useState<boolean>(false);
   const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
   ```
5. **交互逻辑**：
   启动 → 调用适配器 → 调度 CrewAI 生成 → 自动转给 LangGraph 优化 → 展示双结果
6. **样式约束**：
    - 100% 复用项目 `C` 样式变量
    - 日志区：CrewAI 蓝色标记，LangGraph 绿色标记
    - 自适应宽度，不破坏三栏布局

---

## 模块3-4：集成到原有 Community.tsx 主页面
### 执行步骤（Codex 严格执行）
1. **打开文件**：`src/renderer/pages/Community.tsx`
2. **导入组件**：
   ```tsx
   import { CrossFrameworkAgent } from '../components/CrossFrameworkAgent';
   ```
3. **挂载位置**：
    - 单框架协作面板**下方**，保持面板布局统一
    - 非聚焦 / 聚焦模式均正常显示，不遮挡、不挤压
4. **布局要求**：
    - 与上一面板间距 `12px`
    - 宽度 100% 适配父容器
    - 不修改任何原有逻辑、状态、函数
5. **零侵入保证**：
    - 仅新增挂载代码，无删除、无覆盖

---

## 模块3-5：双服务统一启动脚本
### 执行步骤（Codex 生成）
1. **Windows 双启动脚本**：`scripts/start-all.bat`
   ```bat
   @echo off
   start "CrewAI Service" cmd /k "cd src/main/python && python crewai_server.py"
   timeout /t 2 /nobreak >nul
   start "LangGraph Service" cmd /k "cd src/main/python && python langgraph_server.py"
   ```
2. **macOS/Linux 双启动脚本**：`scripts/start-all.sh`
   ```bash
   #!/bin/bash
   cd src/main/python
   python3 crewai_server.py &
   sleep 2
   python3 langgraph_server.py &
   ```
3. **使用说明**：
    - 先启动 Ollama
    - 再运行本脚本，**同时启动 CrewAI + LangGraph 服务**
    - 最后启动前端 Electron

---

## 模块3-6：阶段3 验收标准（Codex 执行后自检）
1. **服务校验**：
    - `http://localhost:8001/status` → ok
    - `http://localhost:8002/status` → ok
2. **前端展示**：社区页面出现「跨框架多智能体」折叠面板
3. **流程校验**：
    - 输入任务：`帮我写一段关于AI的介绍并优化语言`
    - 日志实时输出：
      `[CrewAI] 已完成内容初稿`
      `[调度器] 发送给 LangGraph 优化`
      `[LangGraph] 已完成优化`
    - 最终展示**原始内容 + 优化内容**双栏对比
4. **成本校验**：全程本地运行，无任何付费/联网请求
5. **样式校验**：与项目主题完全统一，日志颜色区分清晰
6. **布局校验**：三栏布局正常、滚动正常、不挤压、不遮挡

---

# 阶段4：平台Agent助理
## 核心变更
- 不再是右下角悬浮球
- 改为 **左侧边栏独立路由页面**
- 做成 **独立、干净、可复用、纯本地对话组件**
- 完全融入你现有布局风格（社区三栏同款样式）
- 全局可从左侧导航进入

---

# 一、模块说明
## 目标
创建 **PlatformAssistantPage** 独立页面组件，用于：
- 平台功能引导
- 操作问答
- 多智能体使用教程
- 本地模型问答（零成本）
- 左侧菜单栏可进入

## 样式规范
- 完全沿用你现有 `C` 颜色变量
- 标题栏高度统一 **44px**
- 卡片、间距、滚动、布局和社区保持一致
- 单栏展示，无三栏

## 技术栈
- React + TypeScript
- 复用阶段1 `local-ollama.ts` 本地模型调用
- 独立、无副作用、不侵入其他页面

---

# 二、超详细执行步骤（Codex 直接照做）

## 模块4-1：创建平台助理独立页面组件
### 文件路径
```
src/renderer/pages/PlatformAssistantPage.tsx
```

### 必须包含结构
1. **顶部固定标题栏**（高度44px，和社区标题栏对齐）
    - 标题：平台助理
    - 左侧返回图标（←）
    - 无按钮干扰

2. **中间聊天区域**
    - 独立滚动容器
    - 用户消息右侧
    - AI 消息左侧
    - 流式输出
    - 无外链、无付费接口

3. **底部固定输入栏**
    - 输入框
    - 发送按钮
    - 回车快捷发送
    - 加载状态禁用

4. **快捷引导按钮**（4个）
    - 基础对话怎么用
    - 单框架多智能体教程
    - 跨框架智能体教程
    - 本地环境异常排查

### 状态定义（TS严格）
```ts
const [messages, setMessages] = useState<Array<{
  role: 'user' | 'assistant';
  content: string;
}>>([]);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);
```

### 核心逻辑
- 页面加载 → 自动发送欢迎语
- 发送消息 → 拼接固定 Prompt → 调用本地 Ollama
- 流式逐字返回
- 无云、无付费、无远程请求

---

## 模块4-2：创建侧边栏入口（左侧导航加一项）
### 修改文件
```
src/renderer/components/Sidebar.tsx
```
（如无则修改左侧菜单所在文件）

### 新增菜单项
```
图标：💬
文字：平台助理
路由：/platform-assistant
```

### 样式要求
- 和其他菜单项完全一致
- 选中高亮
- 点击跳转页面

---

## 模块4-3：新增路由（非常关键）
### 修改文件
```
src/renderer/router/index.tsx
```

### 新增路由
```tsx
{
  path: '/platform-assistant',
  element: <PlatformAssistantPage />
}
```

---

## 模块4-4：创建固定平台助理 Prompt
### 文件路径
```
src/renderer/config/assistant-prompt.ts
```

### 内容（固定写死）
```ts
export const PLATFORM_ASSISTANT_PROMPT = `
你是 枢元 NexusOrigin 平台内置智能助理。
你只能回答与本平台相关的使用问题。

你的职责：
1. 解释基础Agent对话（本地运行、免费、离线）
2. 解释单框架多智能体（CrewAI）
3. 解释跨框架多智能体（CrewAI ↔ LangGraph）
4. 引导用户操作、查看日志、启动流程
5. 解答本地模型未启动、服务异常等问题

不要回答无关问题。
回答简洁、清晰、专业。
`;
```

---

## 模块4-5：页面交互规范（Codex 必须遵守）
1. **返回按钮** → 返回上一页
2. **清空对话** → 按钮清空消息列表
3. **发送期间禁止重复发送**（loading 锁）
4. **滚动自动吸底**
5. **异常提示** → 模型未启动时提示：请先启动 Ollama
6. **全部本地调用** → 100% 离线

---

## 模块4-6：样式 1:1 对齐社区页面（必须严格）
- 标题栏高度：44px
- 背景：C.bg
- 卡片：C.cardBg
- 边框：C.border
- 文字：C.text
- 输入框：同社区发帖输入框
- 按钮：同社区搜索按钮
- 滚动条：同社区滚动条样式

---

# 三、集成完毕后的最终效果
- 左侧菜单栏 → 点击 **平台助理**
- 进入独立、干净、统一风格的对话页面
- 纯本地、离线、免费、流式对话
- 可引导用户使用整个平台
- 不悬浮、不打扰、不破坏布局

---

# 四、验收标准（最终）
1. ✅ 左侧边栏可进入
2. ✅ 独立页面，单栏布局
3. ✅ 标题栏高度统一 44px
4. ✅ 聊天 UI 美观、流式输出
5. ✅ 纯本地 Ollama 调用，零成本
6. ✅ 有快捷引导按钮
7. ✅ 样式和社区完全一致
8. ✅ 无付费 API、无联网、无依赖

---

# 能力商店 MVP 零成本执行计划（专供 Codex 一次性落地）
我给你**最简、最稳、零成本、不依赖后端、不依赖付费服务、纯前端可跑**的能力商店 MVP，完全贴合你的 NexusOrigin 社区风格、三栏布局、样式规范、组件结构。

## 核心定位（MVP 只做这一件事）
**能力商店 = 可一键安装的本地工具/MCP 技能列表**
- 零成本
- 零服务端
- 零数据库
- 零审核
- 零付费

完全基于**本地 JSON 静态能力列表**实现，直接塞进你的社区三栏布局。

---

# 一、MVP 核心范围（Codex 严格按这个做）
## 可做
- 能力列表（卡片式）
- 能力分类（效率 / 开发 / 写作 / 搜索）
- 能力详情弹窗
- 一键安装 / 卸载（本地状态管理）
- 已安装标识
- 搜索能力
- 完全复用社区样式（C 常量）
- 侧边栏入口：**能力商店**

## 不做（MVP 全部砍掉）
- 不做后端
- 不做上传
- 不做审核
- 不做支付
- 不做账户同步
- 不做版本管理
- 不做企业功能
- 不做第三方接入

---

# 二、超详细执行步骤（第5批：能力商店）

## 模块5-1：创建静态能力数据（零后端）
### 文件路径
`src/renderer/data/abilityStoreData.ts`

### 结构
```ts
export interface AbilityItem {
  id: string;
  name: string;
  desc: string;
  author: string;
  category: '效率' | '开发' | '写作' | '搜索';
  icon: string;
  tags: string[];
  config: Record<string, any>;
}

export const ABILITY_LIST: AbilityItem[] = [
  {
    id: 'web-search',
    name: '本地搜索',
    desc: '本地轻量搜索，不联网',
    author: 'NexusOrigin',
    category: '搜索',
    icon: '🔍',
    tags: ['搜索', '本地', '免费'],
    config: { type: 'local-search' }
  },
  // 内置共 8～10 个免费能力
];
```

---

## 模块5-2：创建能力商店主页面（左侧导航入口）
### 文件路径
`src/renderer/pages/AbilityStorePage.tsx`

### 页面结构（严格与社区对齐）
1. **顶部固定标题栏（44px）**
    - 标题：能力商店
    - 返回按钮
    - 搜索框（复用社区搜索样式）

2. **分类栏（横向滚动）**
    - 全部 / 效率 / 开发 / 写作 / 搜索

3. **能力卡片列表（网格布局）**
    - 宽 280px
    - 圆角 10px
    - 背景 C.cardBg
    - 边框 C.border
    - 图标、名称、描述、标签、安装按钮

4. **安装状态管理（纯前端 useState）**
    - installed: Set<string>

5. **空状态 / 加载状态**

---

## 模块5-3：能力详情弹窗组件
### 文件路径
`src/renderer/components/AbilityDetailModal.tsx`

### 内容
- 图标
- 名称
- 描述
- 标签
- 作者
- 安装 / 卸载按钮
- 关闭按钮

完全复用你项目的弹窗样式规范。

---

## 模块5-4：安装/卸载逻辑（纯本地，零成本）
```ts
const [installed, setInstalled] = useState<Set<string>>(new Set());

const handleInstall = (id: string) => {
  setInstalled(prev => new Set(prev).add(id));
  showToast('安装成功（本地）', 'success');
};

const handleUninstall = (id: string) => {
  setInstalled(prev => {
    const s = new Set(prev);
    s.delete(id);
    return s;
  });
  showToast('卸载成功', 'success');
};
```

**不写文件、不写存储、纯内存运行。**

---

## 模块5-5：侧边栏加入入口
### 在 Sidebar 加入
```
图标：🧩
文字：能力商店
路由：/ability-store
```

---

## 模块5-6：加入路由
```tsx
{
  path: '/ability-store',
  element: <AbilityStorePage />
}
```

---

## 模块5-7：样式强制规范（Codex 必须遵守）
- 标题高度：44px
- 卡片圆角：10px
- 颜色：全部用 C.xxx
- 间距：8px 体系
- 滚动条：同社区
- 按钮：同社区发帖按钮
- 搜索框：同社区搜索框

---

# 三、交付物清单（Codex 最终输出）
1. `abilityStoreData.ts`        静态能力数据
2. `AbilityStorePage.tsx`       能力商店页面
3. `AbilityDetailModal.tsx`      详情弹窗
4. 侧边栏入口
5. 路由配置

---

# 四、最终 MVP 效果
- 左侧导航 → 能力商店
- 展示免费本地能力卡片
- 搜索、分类、安装、卸载、详情
- 一键安装到本地
- **全程零成本、零后端、零付费**
- 样式与社区完全统一
- 不破坏任何现有布局

---

# 中枢 Agent 动态能力分配方案（补充设计）

> 针对“中枢 Agent 应根据用户已安装 Agent 的具体能力范围进行任务分配”这一核心需求，对现有跨框架协作方案进行补充设计。实现 **Agent 能力注册、发现、匹配与动态调度**，替代硬编码的三个固定角色。

---

## 一、设计目标

1. **能力注册**：每个 Agent（无论是 CrewAI、LangGraph 还是其他框架）在启动时向中枢注册自己的能力（如“搜索”、“写作”、“代码生成”）。
2. **能力发现**：中枢 Agent 实时获取已注册 Agent 列表及其能力描述。
3. **动态分配**：根据任务分解后的子任务所需能力，匹配最合适的 Agent 执行。
4. **扩展性**：支持用户后续安装新能力（如从能力市场安装 MCP 工具），中枢自动感知并用于后续任务分配。

---

## 二、整体架构调整

```
┌─────────────────────────────────────────────────────────────┐
│                     前端渲染进程                             │
│  - 协作面板 / 可视化视图                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC
┌─────────────────────────▼───────────────────────────────────┐
│                   Electron 主进程                           │
│  - Agent Registry (本地存储已注册 Agent 信息)               │
│  - 中枢调度器 (Orchestrator)                               │
└─────────────┬─────────────────────────┬─────────────────────┘
              │                         │
    ┌─────────▼─────────┐      ┌─────────▼─────────┐
    │  CrewAI Agent A   │      │ LangGraph Agent B │
    │  能力: 搜索, 摘要  │      │  能力: 代码生成    │
    └───────────────────┘      └───────────────────┘
              │                         │
              └─────────────┬───────────┘
                            │
                    ┌───────▼───────┐
                    │   Ollama 模型 │
                    └───────────────┘
```

**核心组件**：
- **Agent Registry**：存储已安装/已启动的 Agent 元信息（ID、名称、能力列表、端点、健康状态）。
- **中枢调度器 (Orchestrator)**：负责任务分解、能力匹配、任务分发、结果聚合。

---

## 三、Agent 能力注册机制

### 3.1 能力描述规范

使用 JSON Schema 定义能力：

```typescript
interface AgentCapability {
  id: string;                 // 能力唯一标识，如 "web_search"
  name: string;               // 显示名称，如 "网页搜索"
  description: string;        // 能力描述
  inputSchema: object;        // 输入参数 JSON Schema
  outputSchema: object;       // 输出结果 JSON Schema
  costPerUse?: number;        // 单次调用成本估算（模拟）
  estimatedDurationMs?: number; // 预估耗时
}
```

每个 Agent 可以声明多个能力。

### 3.2 Agent 注册信息

```typescript
interface AgentInfo {
  id: string;                 // Agent 唯一标识
  name: string;               // Agent 名称（如“研究员助手”）
  framework: 'crewai' | 'langgraph' | 'custom';
  endpoint: string;           // HTTP 调用地址（如 http://localhost:8001/execute）
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'offline';
  healthCheckUrl?: string;
  lastHeartbeat: number;
}
```

### 3.3 注册流程

1. **Agent 启动时**：向 Electron 主进程的 `/register` IPC 发送注册请求。
2. **主进程**：将 Agent 信息存入本地 SQLite 表 `agent_registry`。
3. **心跳维持**：Agent 每隔 10 秒发送心跳，主进程更新 `lastHeartbeat`，超时 30 秒标记为 offline。

**示例：CrewAI Agent 启动脚本中增加注册代码**

```python
import requests
import json

# 在服务启动后
agent_info = {
    "id": "crewai_researcher_1",
    "name": "研究员助手",
    "framework": "crewai",
    "endpoint": "http://localhost:8001/execute",
    "capabilities": [
        {
            "id": "research",
            "name": "信息搜集",
            "description": "根据主题收集并整理信息",
            "inputSchema": {"topic": "string"},
            "outputSchema": {"summary": "string", "sources": "array"}
        }
    ],
    "status": "idle"
}
requests.post("http://localhost:18790/api/agent/register", json=agent_info)  # 假设主进程监听此端口
```

### 3.4 前端展示已注册 Agent

在“Agent 管理”页面增加“已发现 Agent”列表，显示每个 Agent 的名称、能力、状态。用户可手动禁用/启用某个 Agent 的能力。

---

## 四、中枢调度器（Orchestrator）设计

### 4.1 任务分解与能力匹配

**输入**：用户自然语言任务（如“写一篇关于 AI Agent 的科普文章，并配图”）。

**处理流程**：

1. 调用 LLM 分解任务为子任务列表，每个子任务标注所需能力。
   ```
   子任务1: 搜集 AI Agent 资料 → 能力: research
   子任务2: 撰写文章草稿 → 能力: writing
   子任务3: 生成配图提示词 → 能力: image_prompt
   ```
2. 从 Agent Registry 查询当前可用且具备所需能力的 Agent。
3. 若多个 Agent 具备相同能力，选择策略：
   - 空闲优先
   - 成本最低
   - 历史成功率最高（后续可扩展）
4. 将子任务分发给选中的 Agent（调用其 endpoint）。

### 4.2 执行流程（流式可视化支撑）

中枢调度器需要输出结构化事件，供前端可视化视图消费：

| 事件 | 说明 |
|------|------|
| `task_decomposed` | 任务分解完成，输出子任务列表 |
| `agent_selected` | 为某子任务选中的 Agent |
| `subtask_start` | 子任务开始执行 |
| `subtask_tool_call` | Agent 内部工具调用（如有） |
| `subtask_end` | 子任务完成，输出结果 |
| `aggregation_start` | 开始聚合所有子任务结果 |
| `final_result` | 最终结果 |

### 4.3 代码示例（Electron 主进程中的调度器）

```typescript
// orchestrator.ts
import { AgentRegistry } from './agentRegistry';
import { decomposeTask, matchCapabilities } from './taskPlanner';

export class Orchestrator {
  async executeTask(userTask: string, onEvent: (event: OrchestratorEvent) => void) {
    // 1. 任务分解
    const subtasks = await decomposeTask(userTask);
    onEvent({ type: 'task_decomposed', subtasks });

    const results = [];
    for (const subtask of subtasks) {
      // 2. 能力匹配
      const agents = AgentRegistry.findByCapability(subtask.requiredCapability);
      const selected = this.selectBestAgent(agents);
      onEvent({ type: 'agent_selected', subtaskId: subtask.id, agent: selected });

      // 3. 调用 Agent 执行
      onEvent({ type: 'subtask_start', subtaskId: subtask.id });
      const result = await this.callAgent(selected.endpoint, subtask);
      onEvent({ type: 'subtask_end', subtaskId: subtask.id, result });
      results.push(result);
    }

    // 4. 聚合结果
    const final = await this.aggregateResults(results);
    onEvent({ type: 'final_result', result: final });
  }
}
```

---

## 五、与现有 MVP 模块的集成

### 5.1 替换硬编码的 CrewAI 三个角色

- 原有的 `crewai_server.py` 不再内置三个固定 Agent，而是变成一个 **通用 Agent 执行器**，负责接收中枢发来的子任务（带有能力标识），调用对应的 CrewAI 流程。
- 同样，LangGraph 服务也改造为通用执行器。

### 5.2 能力市场的联动

- 用户从能力市场安装新的 MCP 工具后，该工具对应的 Agent 会自动注册一个能力（如“网页搜索”）。
- 中枢调度器在后续任务分配时即可使用该能力。

### 5.3 可视化视图的增强

- 在流程图节点中，不仅显示 Agent 名称，还显示其被选中的原因（如“具备研究员能力”）。
- 节点详情面板展示该 Agent 的注册信息（能力列表、端点、健康状态）。

---

## 六、演示场景示例

**用户任务**：“写一篇关于本地 AI 助手的文章，并配图。”

**系统行为**：
1. 中枢分解任务：
   - 子任务1：搜集本地 AI 助手信息 → 需要 `research` 能力
   - 子任务2：撰写文章 → 需要 `writing` 能力
   - 子任务3：生成配图提示词 → 需要 `image_prompt` 能力
2. 注册表中有：
   - Agent A（研究员）：`research`
   - Agent B（作家）：`writing`
   - Agent C（设计师）：`image_prompt`
3. 中枢分别调用三个 Agent，并行执行（或串行依赖）。
4. 前端可视化视图展示三个分支并行，最终聚合结果。

**若某个能力缺失**：中枢提示用户“缺少 image_prompt 能力，是否从能力市场安装？”

---

## 七、技术实现清单

| 模块 | 文件 | 说明 |
|------|------|------|
| Agent 注册表 | `src/main/agentRegistry.ts` | SQLite 存储 + 内存缓存 |
| 注册 API | `src/main/ipc/agentRegistry.ipc.ts` | 暴露给 Python 服务调用 |
| 任务分解 | `src/main/taskPlanner.ts` | 调用 LLM 分解任务并标注能力 |
| 中枢调度器 | `src/main/orchestrator.ts` | 核心调度逻辑 |
| 前端能力展示 | `src/renderer/pages/AgentRegistryPage.tsx` | 可选，展示已注册 Agent |
| Python 通用执行器 | `src/main/python/generic_agent.py` | 替换原来的 crewai_server.py |

---

## 八、对现有 MVP 方案的修改建议

1. **阶段2（单框架协作）**：改为演示“中枢调度器调用一个已注册的 CrewAI Agent 执行任务”，而不是固定三个角色。
2. **阶段3（跨框架协作）**：改为演示“中枢调度器分别调用 CrewAI Agent（研究）和 LangGraph Agent（优化）”。
3. **能力商店**：安装新能力后，自动注册对应的 Agent，中枢下次即可使用。
4. **可视化视图**：增加“Agent 选择理由”提示框，展示能力匹配过程，增强说服力。

---

