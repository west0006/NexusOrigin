import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                bio: true,
                credits: true,
                createdAt: true,
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateProfile(userId: string, data: { username?: string; bio?: string; avatar?: string }) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, email: true, username: true, avatar: true, bio: true, credits: true },
        });
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        const valid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!valid) throw new Error('原密码错误');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        return { success: true };
    }

    async getBalance(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
        return { credits: user?.credits || 0 };
    }

    async recharge(userId: string, amount: number, method: string) {
        // 简化：1美元 = 10信用点
        const credits = amount * 10;
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: userId }, data: { credits: { increment: credits } } }),
            this.prisma.rechargeLog.create({ data: { userId, amount, credits, method } }),
        ]);
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
        return { credits: user?.credits || 0 };
    }
}