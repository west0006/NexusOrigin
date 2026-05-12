FROM golang:1.23-alpine AS builder
WORKDIR /app

# 设置 Go 代理（关键）
ENV GOPROXY=https://goproxy.cn,direct

# 复制依赖文件并下载
COPY go.mod go.sum ./
RUN go mod download

# 复制源码并编译
COPY . .
RUN CGO_ENABLED=0 go build -o /token-service ./cmd/server

# 生产镜像（不安装任何额外工具，二进制已足够）
FROM alpine:3.19
COPY --from=builder /token-service /usr/local/bin/token-service
EXPOSE 8081
CMD ["token-service"]