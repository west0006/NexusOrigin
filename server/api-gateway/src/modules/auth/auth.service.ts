// ── auth/auth.service.ts ──────────────────────────────────
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto): Promise<{
        user: { id: string; email: string; username: string };
        accessToken: string;
        refreshToken: string;
    }> {
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email }, { username: dto.username }] },
        });
        if (existing) throw new UnauthorizedException('邮箱或用户名已被注册');

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, username: dto.username, passwordHash },
        });

        const tokens = this.generateTokens(user.id, user.email);
        return {
            user: { id: user.id, email: user.email, username: user.username },
            ...tokens,
        };
    }

    async login(dto: LoginDto): Promise<{
        user: { id: string; email: string; username: string };
        accessToken: string;
        refreshToken: string;
    }> {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('邮箱或密码错误');

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) throw new UnauthorizedException('邮箱或密码错误');

        const tokens = this.generateTokens(user.id, user.email);
        return {
            user: { id: user.id, email: user.email, username: user.username },
            ...tokens,
        };
    }

    private generateTokens(userId: string, email: string): {
        accessToken: string;
        refreshToken: string;
    } {
        const payload = { sub: userId, email };
        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
        };
    }
}