// ─── server/api-gateway/src/main.ts ───────────────────────
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? true,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
        .setTitle('虾塘智联 API')
        .setDescription('OpenClaw 养虾人社区 API 文档')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();