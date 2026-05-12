FROM golang:1.23-alpine AS builder
WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /deploy-service ./cmd/server

FROM alpine:3.19
COPY --from=builder /deploy-service /usr/local/bin/deploy-service
EXPOSE 8082
CMD ["deploy-service"]