import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/** 错误码映射表 */
const ERROR_CODES: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
    [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const requestId = (request.headers['x-request-id'] as string) || undefined;

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message =
                typeof res === 'string'
                    ? res
                    : (res as Record<string, any>).message ?? res;

            // 透传 validation pipe 的结构化详情
            if (typeof res === 'object' && (res as any).details) {
                const body = res as any;
                response.status(status).json({
                    error: {
                        code: ERROR_CODES[status] ?? 'UNKNOWN',
                        message: body.message ?? 'Request validation failed',
                        details: body.details,
                    },
                    requestId,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                });
                return;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(
                `[${requestId ?? '-'}] Unhandled: ${exception.message}`,
                exception.stack,
            );
        }

        response.status(status).json({
            error: {
                code: ERROR_CODES[status] ?? 'UNKNOWN',
                message: typeof message === 'string' ? message : message,
            },
            requestId,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}