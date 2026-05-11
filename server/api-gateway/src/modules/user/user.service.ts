// ── user/user.service.ts ──────────────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '@prisma/client';

type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async getProfile(userId: string): Promise<SafeUser | null> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        const { passwordHash, ...safe } = user;
        return safe;
    }
}