// server/api-gateway/src/modules/agent/agent.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgentService {
    constructor(private readonly prisma: PrismaService) {}

    async register(dto: any, ownerId: string) {
        return this.prisma.agent.create({
            data: {
                name: dto.name,
                description: dto.description,
                version: dto.version || '1.0.0',
                endpoint: dto.endpoint,
                capabilities: dto.capabilities || [],
                status: 'ONLINE',
                ownerId,
            },
            include: {
                owner: { select: { id: true, username: true, avatar: true } },
            },
        });
    }

    async getAgentInfo(agentId: string) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                owner: { select: { id: true, username: true, avatar: true } },
                _count: { select: { agentServices: true, agentTasks: true } },
            },
        });
        if (!agent) throw new NotFoundException('Agent not found');
        return agent;
    }

    async listAgents(page: number, pageSize: number) {
        const [items, total] = await Promise.all([
            this.prisma.agent.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { id: true, username: true, avatar: true } },
                    _count: { select: { agentServices: true, agentTasks: true } },
                },
            }),
            this.prisma.agent.count(),
        ]);
        return { items, total, page, pageSize };
    }

    async getServices() {
        return this.prisma.agentService.findMany({
            include: {
                agent: { select: { id: true, name: true } },
                user: { select: { id: true, username: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getMyAgents(userId: string) {
        return this.prisma.agent.findMany({
            where: { ownerId: userId },
            include: { _count: { select: { agentServices: true, agentTasks: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createTask(clientId: string, agentId: string, title: string, description: string) {
        const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent) throw new NotFoundException('Agent not found');

        return this.prisma.agentTask.create({
            data: {
                title,
                description,
                clientId,
                providerId: agent.ownerId,
                agentId,
                status: 'PENDING',
            },
            include: {
                client: { select: { id: true, username: true } },
                provider: { select: { id: true, username: true } },
            },
        });
    }

    async getTasks(userId: string) {
        return this.prisma.agentTask.findMany({
            where: {
                OR: [{ clientId: userId }, { providerId: userId }],
            },
            include: {
                client: { select: { id: true, username: true } },
                provider: { select: { id: true, username: true } },
                agent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getTokenState(userId: string) {
        const usage = await this.prisma.tokenUsage.aggregate({
            where: { userId },
            _sum: { tokensIn: true, tokensOut: true, cost: true },
        });
        return {
            totalInputTokens: usage._sum?.tokensIn ?? 0,
            totalOutputTokens: usage._sum?.tokensOut ?? 0,
            totalCostUsd: usage._sum?.cost ?? 0,
        };
    }

    async getUsageStats(agentId: string) {
        const agentTaskIds = await this.prisma.agentTask.findMany({
            where: { agentId },
            select: { id: true },
        });

        const usage = await this.prisma.tokenUsage.aggregate({
            where: { agentTaskId: { in: agentTaskIds.map((t) => t.id) } },
            _sum: { tokensIn: true, tokensOut: true, cost: true },
        });
        return {
            totalInputTokens: usage._sum?.tokensIn ?? 0,
            totalOutputTokens: usage._sum?.tokensOut ?? 0,
            totalCostUsd: usage._sum?.cost ?? 0,
        };
    }
}