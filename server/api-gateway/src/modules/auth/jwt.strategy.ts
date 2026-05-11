// ── auth/jwt.strategy.ts ──────────────────────────────────
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
    sub: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
        });
    }

    async validate(payload: JwtPayload): Promise<{ userId: string; email: string }> {
        return { userId: payload.sub, email: payload.email };
    }
}