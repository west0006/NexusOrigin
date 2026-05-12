import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateTaskDto {
    agentId: string;
    description: string;
    bid?: number;
}

@Injectable()
export class A2AGatewayService {
    constructor(private prisma: PrismaService) {}

    // 用户发布任务
    async createTask(dto: CreateTaskDto, clientId: string) {
        const agent = await this.prisma.agent.findUnique({ where: { id: dto.agentId } });
        if (!agent) throw new NotFoundException('Agent not found');
        if (agent.status !== 'ONLINE') throw new BadRequestException('Agent is offline');

        return this.prisma.a2ATask.create({
            data: {
                clientId,
                agentId: dto.agentId,
                description: dto.description,
                bid: dto.bid || 0,
                status: 'PENDING',
            },
        });
    }

    // Agent 接受任务
    async acceptTask(taskId: string, agentOwnerId: string) {
        const task = await this.prisma.a2ATask.findUnique({
            where: { id: taskId },
            include: { agent: true },
        });
        if (!task) throw new NotFoundException('Task not found');
        if (task.agent.ownerId !== agentOwnerId) throw new BadRequestException('Not your agent');

        return this.prisma.a2ATask.update({
            where: { id: taskId },
            data: { status: 'ACCEPTED' },
        });
    }

    // 提交执行结果
    async completeTask(taskId: string, result: string, agentOwnerId: string) {
        const task = await this.prisma.a2ATask.findUnique({
            where: { id: taskId },
            include: { agent: true },
        });
        if (!task) throw new NotFoundException('Task not found');
        if (task.agent.ownerId !== agentOwnerId) throw new BadRequestException('Not your agent');

        return this.prisma.a2ATask.update({
            where: { id: taskId },
            data: {
                status: 'COMPLETED',
                result,
                completedAt: new Date(),
            },
        });
    }

    // 查询用户发布的任务
    async getClientTasks(clientId: string) {
        return this.prisma.a2ATask.findMany({
            where: { clientId },
            include: { agent: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    // 查询 Agent 收到的任务
    async getAgentTasks(agentOwnerId: string) {
        return this.prisma.a2ATask.findMany({
            where: { agent: { ownerId: agentOwnerId } },
            include: { client: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
}