import { Injectable, Logger } from '@nestjs/common';

/**
 * JWT 黑名单服务
 * 当前使用内存 Map 存储，生产环境可通过注入 Redis 客户端替换。
 */
@Injectable()
export class TokenBlacklistService {
    private readonly logger = new Logger(TokenBlacklistService.name);
    private readonly store = new Map<string, number>(); // jti -> expiresAt (unix seconds)

    /** 将 token 加入黑名单 */
    async blacklist(jti: string, expiresAt: number): Promise<void> {
        this.store.set(jti, expiresAt);
        this.logger.debug(`[Memory] blacklisted jti=${jti}`);
    }

    /** 检查 token 是否已被拉黑 */
    async isBlacklisted(jti: string): Promise<boolean> {
        const expiresAt = this.store.get(jti);
        if (!expiresAt) return false;
        if (expiresAt < Math.floor(Date.now() / 1000)) {
            this.store.delete(jti);
            return false;
        }
        return true;
    }

    /** 清空过期条目 */
    cleanup(): void {
        const now = Math.floor(Date.now() / 1000);
        for (const [jti, exp] of this.store) {
            if (exp < now) this.store.delete(jti);
        }
    }
}
