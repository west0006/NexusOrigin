import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterAgentDto } from './dto/RegisterAgent.dto';

@Injectable()
export class AgentRegistryService {
    private readonly logger = new Logger(AgentRegistryService.name);

    constructor(private prisma: PrismaService) {}

    async register(dto: RegisterAgentDto, ownerId: string) {
        const agent = await this.prisma.agent.create({
            data: {
                name: dto.name,
                description: dto.description,
                version: '1.0.0',
                endpoint: dto.endpoint,
                capabilities: dto.capabilities ?? [],
                ownerId,
                status: 'ONLINE',
                lastHeartbeat: new Date(),
            },
        });

        this.logger.log(`Agent registered: ${agent.id} by user ${ownerId}`);
        return agent;
    }

    async findAll(page = 1, pageSize = 20) {
        const skip = (page - 1) * pageSize;
        const [items, total] = await Promise.all([
            this.prisma.agent.findMany({
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { id: true, username: true, avatar: true } },
                },
            }),
            this.prisma.agent.count(),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    async findOne(id: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, username: true, avatar: true } },
            },
        });
        if (!agent) throw new NotFoundException('Agent 不存在');
        return agent;
    }

    async updateHeartbeat(id: string) {
        const agent = await this.prisma.agent.findUnique({ where: { id } });
        if (!agent) throw new NotFoundException('Agent 不存在');

        const updated = await this.prisma.agent.update({
            where: { id },
            data: { lastHeartbeat: new Date(), status: 'ONLINE' },
        });

        return updated;
    }

    async deregister(id: string, ownerId: string) {
        const agent = await this.prisma.agent.findUnique({ where: { id } });
        if (!agent) throw new NotFoundException('Agent 不存在');
        if (agent.ownerId !== ownerId) throw new ForbiddenException('无权注销此 Agent');

        await this.prisma.agent.delete({ where: { id } });
        this.logger.log(`Agent deregistered: ${id} by user ${ownerId}`);
        return { success: true };
    }
}