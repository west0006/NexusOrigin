import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RegisterAgentDto {
    name: string;
    description: string;
    version: string;
    endpoint: string;
    capabilities?: string[];
    healthCheck?: string;
}

@Injectable()
export class AgentRegistryService {
    constructor(private prisma: PrismaService) {}

    async register(dto: RegisterAgentDto, ownerId: string) {
        return this.prisma.agent.create({
            data: {
                ...dto,
                ownerId,
                status: 'ONLINE',
                lastHeartbeat: new Date(),
            },
        });
    }

    async findAll(page = 1, pageSize = 20) {
        const skip = (page - 1) * pageSize;
        const [agents, total] = await Promise.all([
            this.prisma.agent.findMany({
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: { owner: { select: { id: true, username: true } } },
            }),
            this.prisma.agent.count(),
        ]);
        return { agents, total };
    }

    async findOne(id: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id },
            include: { owner: { select: { id: true, username: true } } },
        });
        if (!agent) throw new NotFoundException('Agent not found');
        return agent;
    }

    async updateHeartbeat(id: string) {
        return this.prisma.agent.update({
            where: { id },
            data: { lastHeartbeat: new Date(), status: 'ONLINE' },
        });
    }

    async deregister(id: string, userId: string) {
        const agent = await this.prisma.agent.findUnique({ where: { id } });
        if (!agent || agent.ownerId !== userId) throw new NotFoundException('Agent not found or access denied');
        return this.prisma.agent.delete({ where: { id } });
    }
}