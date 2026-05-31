import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkillDto } from './dto/CreateSkill.dto';

@Injectable()
export class SkillService {
    private readonly logger = new Logger(SkillService.name);

    constructor(private readonly prisma: PrismaService) {}

    async list(page: number, pageSize: number) {
        const [items, total] = await Promise.all([
            this.prisma.capability.findMany({
                where: { status: 'APPROVED' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { id: true, username: true } },
                },
            }),
            this.prisma.capability.count({ where: { status: 'APPROVED' } }),
        ]);

        return { items, total, page, pageSize };
    }

    async create(dto: { name: string; description: string }, userId: string) {
        return this.prisma.capability.create({
            data: {
                name: dto.name,
                description: dto.description,
                version: '1.0.0',
                manifest: {},
                price: 0,
                source: 'built-in',
                ownerId: userId,
                status: 'PENDING',
            },
        });
    }
}