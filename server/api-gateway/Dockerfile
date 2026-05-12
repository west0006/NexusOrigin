FROM node:20-alpine AS builder

WORKDIR /app

# 复制整个仓库（.dockerignore 已排除 node_modules 等）
COPY . .

# 临时移除 postinstall 脚本，防止 pnpm install 阶段出错
RUN node -e "const pkg=require('./package.json'); delete pkg.scripts.postinstall; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2))"

# 安装依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 进入 api-gateway 目录
WORKDIR /app/server/api-gateway

# 手动生成 Prisma 客户端
RUN npx prisma generate

# 构建 NestJS 项目
RUN pnpm build

# 生产阶段
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/server/api-gateway/dist ./dist
COPY --from=builder /app/server/api-gateway/node_modules ./node_modules
COPY --from=builder /app/server/api-gateway/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]