// ─── server/api-gateway/src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        const now = Date.now();
        return next.handle().pipe(
            tap(() => console.log(`${req.method} ${req.url} - ${Date.now() - now}ms`))
        );
    }
}