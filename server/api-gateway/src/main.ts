import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import * as crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    // 安全
    app.use(helmet());

    // 请求 ID 追踪
    app.use((req: Request, _res: Response, next: NextFunction) => {
        req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
        next();
    });

    // Cookie 解析
    app.use(cookieParser());

    // CORS
    const corsOrigin = process.env.CORS_ORIGIN;
    app.enableCors({
        origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        maxAge: 86400,
    });

    // 全局前缀
    app.setGlobalPrefix('api/v1');

    // 全局异常过滤器
    app.useGlobalFilters(new AllExceptionsFilter());

    // 全局自定义验证管道
    app.useGlobalPipes(new CustomValidationPipe());

    // 请求日志中间件
    app.use(new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()));

    // Swagger
    const config = new DocumentBuilder()
        .setTitle('枢元 API')
        .setDescription('NexusOrigin API 文档')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Server running on http://localhost:${port}/api/v1`);
    console.log(`📖 API docs at http://localhost:${port}/api/docs`);
}

void bootstrap();

// 启动顺序

// cd server/api-gateway
// pnpm dev

// cd client
// pnpm dev

// cd server/token-service
// go run cmd/server/main.go

// cd docker
// docker-compose up -d

// .venv\Scripts\activate
// cd client/src/main/python
// python crewai_server.py
// python langgraph_server.py