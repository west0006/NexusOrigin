<!-- ─── README.md ──────────────────────────────────────── -->
# 虾塘智联 (ShrimpTank Platform)

OpenClaw 养虾人的 AI 助手与技能交易平台，致力于成为 AI Agent 生态的一站式入口。

## 技术栈

| 层次 | 技术 |
|---|---|
| 桌面客户端 | Electron 31 + React 18 + TypeScript 5.5 |
| API 网关 | NestJS 10 + Prisma 5 + PostgreSQL 15 |
| Token 服务 | Go 1.23 + Gin + Redis 7.2 |
| 部署服务 | Go 1.23 + Gin |
| 基础设施 | Docker + Kubernetes + GitHub Actions |

## 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 8
- Docker ≥ 24
- Go ≥ 1.23 (可选，仅 Go 服务开发需要)

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/shrimptank-platform.git
cd shrimptank-platform

# 2. 安装依赖
pnpm install

# 3. 启动基础设施（PostgreSQL + Redis）
cd docker && docker-compose up -d && cd ..

# 4. 初始化数据库
cd server/api-gateway
cp .env.example .env
npx prisma migrate dev --name init
npx prisma generate
cd ../..

# 5. 启动开发服务
pnpm dev