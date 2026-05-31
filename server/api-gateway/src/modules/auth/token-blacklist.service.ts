import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * JWT 黑名单服务
 * 生产环境建议替换为 Redis，此处提供内存兜底 + Redis 接口抽象
 */
@Injectable()
export class TokenBlacklistService {
    private readonly logger = new Logger(TokenBlacklistService.name);
    private readonly store = new Map<string, number>(); // jti -> expiresAt
    private readonly useRedis: boolean;

    constructor(private readonly configService: ConfigService) {
        this.useRedis = this.configService.get('REDIS_ENABLED') === 'true';
    }

    /** 将 token 加入黑名单（传入 payload 中的 jti 和 exp） */
    async blacklist(jti: string, expiresAt: number): Promise<void> {
        if (this.useRedis) {
            // TODO: await this.redis.set(`bl:${jti}`, '1', { PXAT: expiresAt * 1000 });
            this.logger.log(`[Redis] blacklist jti=${jti} (stub)`);
            return;
        }
        this.store.set(jti, expiresAt);
        this.logger.debug(`[Memory] blacklist jti=${jti}`);
    }

    /** 检查 token 是否已被拉黑 */
    async isBlacklisted(jti: string): Promise<boolean> {
        if (this.useRedis) {
            // TODO: return (await this.redis.exists(`bl:${jti}`)) === 1;
            return false;
        }
        const expiresAt = this.store.get(jti);
        if (!expiresAt) return false;
        if (expiresAt < Math.floor(Date.now() / 1000)) {
            this.store.delete(jti);
            return false;
        }
        return true;
    }

    /** 清空过期条目（可在定时任务中调用） */
    cleanup(): void {
        const now = Math.floor(Date.now() / 1000);
        for (const [jti, exp] of this.store) {
            if (exp < now) this.store.delete(jti);
        }
    }
}