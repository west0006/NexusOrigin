# 枢元 (NexusOrigin)

**框架无关的 AI Agent 生命周期管理操作系统**

枢元以“工具链整合＋知识社区＋能力交易市场”三位一体模式，为 LangGraph、CrewAI、OpenClaw
等主流 Agent 框架提供统一的**部署、监控、协作与交易**入口。平台以**聚焦式交互（Focus‑first
Interaction）** 为核心设计范式，让开发者在任何界面都能“锚定→透视→决策”，从被动浏览升级为主动探查。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 桌面客户端 | Electron 31 + React 19 + TypeScript 5.5 |
| Web 前端 | React + Vite + Recharts（聚焦式仪表盘） |
| API 网关 | NestJS 10 + Prisma 5 + PostgreSQL 15 |
| 遥测 & 计费 | Go 1.23 + Gin + Redis 7.2（Telemetry Service） |
| 部署管理 | Go 1.23 + Gin（Deploy Service） |
| 容器化 | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 8
- Docker ≥ 24
- Go ≥ 1.23（仅 Go 服务开发需要）

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/west0006/NexusOrigin
cd nexus-origin

# 2. 安装前端与后端依赖
pnpm install

# 3. 启动基础设施（PostgreSQL + Redis）
cd docker && docker-compose up -d && cd ..

# 4. 初始化数据库
cd server/api-gateway
cp .env.example .env
npx prisma migrate dev --name init
npx prisma generate
cd ../..

# 5. 启动全部开发服务
pnpm dev
```

[//]: # (前端运行在 `http://localhost:5173`，API 网关在 `http://localhost:3000`，)

[//]: # (Swagger 文档在 `http://localhost:3000/api/docs`。)

[//]: # (### 生产环境（Docker Compose）)

[//]: # ()
[//]: # (```bash)

[//]: # (# 构建并启动所有服务)

[//]: # (docker compose -f docker/docker-compose.prod.yml up -d)

[//]: # (```)

---

## 项目结构

```
nexus-origin/
├── client/                  # Electron 桌面客户端 + Web 前端
│   ├── src/main/            # Electron 主进程
│   ├── src/renderer/        # React 渲染进程（页面、组件、状态管理）
│   └── src/shared/          # 共享类型与 IPC 常量
├── server/
│   ├── api-gateway/         # NestJS API 网关
│   ├── token-service/       # Go 遥测 & 信用点服务
│   └── deploy-service/      # Go 部署管理服务
├── docker/                  # Docker 编排
├── .github/workflows/       # CI/CD 流水线
└── scripts/                 # 运维脚本
```

---

## 核心亮点

- **聚焦式交互（Focus‑first）**：社区讨论、成本分析、部署排错均支持一键“聚焦”
  ——锚定任意元素，右侧面板立即呈现完整上下文，无需跳转。
- **多框架 Agent 管理**：通过统一的 Agent Registry 与 A2A 协议，注册、发现、
  心跳维护异构 Agent。
- **能力市场**：MCP 工具包与 A2A 代理服务的安全审核、上架、交易与安装。
- **实时成本可观测性**：Sidecar 代理无侵入采集 Token 消耗，预算熔断与降本建议。
- **信用点经济系统**：跨资源类型统一计量，为开发者提供可持续的激励循环。

---

## 设计原则

枢元的设计基于「认知聚焦三原则」：
1. **上下文锚定**：任何信息块中的元素均可作为锚点，一键提取完整关联上下文。
2. **渐进式呈现**：默认展示核心信息，细节通过聚焦面板按需展开。
3. **操作就近闭环**：高频操作（回复、修复、启用）置于聚焦面板内，减少视线往返。

完整的品牌色彩、字体、组件与动效规范见 `Style.md`。

---

## 许可证

Apache-2.0
```