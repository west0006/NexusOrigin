import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';

export interface JwtPayload {
    sub: string;
    email: string;
    jti?: string;
    iat?: number;
    exp?: number;
}

export interface AuthenticatedUser {
    userId: string;
    email: string | null;
    // username: string;
    // identityType: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenBlacklist: TokenBlacklistService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'fallback-secret-do-not-use-in-production',
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        // 检查黑名单
        if (payload.jti) {
            const blacklisted = await this.tokenBlacklist.isBlacklisted(payload.jti);
            if (blacklisted) {
                this.logger.warn(`Token已被拉黑: jti=${payload.jti}, user=${payload.sub}`);
                throw new UnauthorizedException('Token 已失效，请重新登录');
            }
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true },
        });

        if (!user) {
            this.logger.warn(`JWT validated for non-existent user: ${payload.sub}`);
            throw new UnauthorizedException('用户不存在或已被删除');
        }

        return {
            userId: user.id,
            email: user.email,
        };
    }
}