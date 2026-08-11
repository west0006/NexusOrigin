import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SmsService } from './sms.service';
import { WechatService } from './wechat.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('JWT_SECRET');
                if (!secret) {
                    if (config.get('NODE_ENV') !== 'development') {
                        throw new Error('JWT_SECRET is required in production');
                    }
                    return { secret: 'dev-fallback-do-not-use-in-production', signOptions: { expiresIn: '1h' } };
                }
                return { secret, signOptions: { expiresIn: '1h' } };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, SmsService, WechatService, TokenBlacklistService],
    // TokenBlacklistService uses in-memory Map; swap to Redis-backed impl for production
    exports: [AuthService, JwtModule, PassportModule, TokenBlacklistService],
})
export class AuthModule {}