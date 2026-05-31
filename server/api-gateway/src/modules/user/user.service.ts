import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/UpdateProfile.dto';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                bio: true,
                avatar: true,
                credits: true,
                reputation: true,
                creatorLevel: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        return user;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        if (dto.username) {
            const existing = await this.prisma.user.findUnique({
                where: { username: dto.username },
            });
            if (existing && existing.id !== userId) {
                throw new ConflictException('该用户名已被使用');
            }
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.username !== undefined && { username: dto.username }),
                ...(dto.bio !== undefined && { bio: dto.bio }),
                ...(dto.avatar !== undefined && { avatar: dto.avatar }),
            },
            select: {
                id: true,
                email: true,
                username: true,
                bio: true,
                avatar: true,
                credits: true,
                reputation: true,
                creatorLevel: true,
                createdAt: true,
            },
        });

        return updated;
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }
        if (!user.passwordHash) {
            throw new BadRequestException('未设置密码，请使用其他登录方式');
        }

        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid) {
            throw new BadRequestException('旧密码错误');
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hash },
        });

        return { message: '密码修改成功' };
    }

    async getCredits(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true },
        });
        if (!user) {
            throw new NotFoundException('用户不存在');
        }
        return { credits: user.credits };
    }

    async recharge(userId: string, amount: number, method: string) {
        if (amount <= 0) {
            throw new BadRequestException('充值金额必须大于0');
        }

        const rechargeLog = await this.prisma.rechargeLog.create({
            data: {
                userId,
                amount,
                method,
                status: 'pending',
            },
        });

        // 简化：直接增加余额（生产环境需接入支付网关回调）
        await this.prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: amount } },
        });

        await this.prisma.rechargeLog.update({
            where: { id: rechargeLog.id },
            data: { status: 'completed' },
        });

        return { message: '充值成功', amount };
    }

    async getTokenUsage(userId: string, days: number) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const usages = await this.prisma.tokenUsage.findMany({
            where: {
                userId,
                createdAt: { gte: since },
            },
            orderBy: { createdAt: 'asc' },
        });

        // 按天聚合
        const dailyMap = new Map<string, { tokens: number; cost: number; count: number }>();
        for (const u of usages) {
            const day = u.createdAt.toISOString().slice(0, 10);
            const existing = dailyMap.get(day) ?? { tokens: 0, cost: 0, count: 0 };
            existing.tokens += u.tokensIn + u.tokensOut;
            existing.cost += u.cost;
            existing.count += 1;
            dailyMap.set(day, existing);
        }

        const daily = Array.from(dailyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            totalCost: usages.reduce((s, u) => s + u.cost, 0),
            totalTokens: usages.reduce((s, u) => s + u.tokensIn + u.tokensOut, 0),
            totalRequests: usages.length,
            daily,
            details: usages.map((u) => ({
                id: u.id,
                model: u.model,
                provider: u.provider,
                tokensIn: u.tokensIn,
                tokensOut: u.tokensOut,
                cost: u.cost,
                createdAt: u.createdAt,
            })),
        };
    }
}