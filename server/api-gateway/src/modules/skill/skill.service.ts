// ── skill/skill.service.ts ───────────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SkillService {
    constructor(private readonly prisma: PrismaService) {}

    async list(page: number = 1, pageSize: number = 20) {
        const skip = (page - 1) * pageSize;
        const [items, total] = await Promise.all([
            this.prisma.skill.findMany({
                where: { status: 'APPROVED' },
                skip,
                take: pageSize,
                orderBy: { downloads: 'desc' },
                include: { author: { select: { id: true, username: true } } },
            }),
            this.prisma.skill.count({ where: { status: 'APPROVED' } }),
        ]);
        return { items, total };
    }

    async install(skillId: string, userId: string) {
        const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
        if (!skill) throw new Error('Skill not found');

        await this.prisma.skill.update({
            where: { id: skillId },
            data: { downloads: { increment: 1 } },
        });

        if (skill.price > 0) {
            await this.prisma.purchase.create({
                data: { userId, skillId, amount: skill.price },
            });
        }

        return skill;
    }
}