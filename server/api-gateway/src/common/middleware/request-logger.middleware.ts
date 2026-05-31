import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(request: Request, response: Response, next: NextFunction): void {
        const { method, originalUrl } = request;
        const requestId = request.headers['x-request-id'] as string || '-';
        const startTime = Date.now();

        response.on('finish', () => {
            const { statusCode } = response;
            const duration = Date.now() - startTime;
            const logLine = `[${requestId}] ${method} ${originalUrl} ${statusCode} ${duration}ms`;

            if (statusCode >= 500) {
                this.logger.error(logLine);
            } else if (statusCode >= 400) {
                this.logger.warn(logLine);
            } else {
                this.logger.log(logLine);
            }
        });

        next();
    }
}