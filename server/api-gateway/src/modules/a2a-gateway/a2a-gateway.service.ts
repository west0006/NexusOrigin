// server/api-gateway/src/modules/a2a-gateway/a2a-gateway.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class A2AGatewayService {
    constructor(private readonly prisma: PrismaService) {}

    async createTask(dto: any, clientId: string) {
        // 如果指定了 agentId，则直接创建 ACCEPTED 状态的任务；否则创建 PENDING 等待竞标
        const status = dto.agentId ? 'ACCEPTED' : 'PENDING';
        const task = await this.prisma.a2ATask.create({
            data: {
                title: dto.title || `A2A Task: ${dto.description.slice(0, 40)}`,
                description: dto.description,
                agentId: dto.agentId || '',     // 如果没指定，暂时填空，后续选中后再更新
                clientId,
                status,
                budget: dto.budget ?? 0,
                deadline: dto.deadline ? new Date(dto.deadline) : null,
            },
            include: {
                client: { select: { id: true, username: true, avatar: true } },
                agent: { select: { id: true, name: true } },
            },
        });
        return task;
    }

    async list(page: number, pageSize: number, status?: string) {
        const where: any = {};
        if (status) where.status = status;

        const [items, total] = await Promise.all([
            this.prisma.a2ATask.findMany({
                where,
                include: {
                    client: { select: { id: true, username: true, avatar: true } },
                    agent: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.a2ATask.count({ where }),
        ]);
        return { tasks: items, total, page, pageSize };
    }

    async getClientTasks(userId: string) {
        return this.prisma.a2ATask.findMany({
            where: { clientId: userId },
            include: { agent: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAgentTasks(userId: string) {
        // 获取用户拥有的 Agent 的任务（包括竞标中和已承接）
        return this.prisma.a2ATask.findMany({
            where: { agent: { ownerId: userId } },
            include: { client: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getTaskById(id: string) {
        return this.prisma.a2ATask.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, username: true, avatar: true } },
                agent: { select: { id: true, name: true } },
                a2Abids: {
                    include: { agent: { select: { id: true, name: true, owner: { select: { username: true } } } } },
                    orderBy: { bidAmount: 'asc' },
                },
            },
        });
    }

    // 竞标相关方法
    async placeBid(taskId: string, agentId: string, bidAmount: number, estimatedDays: number, message?: string) {
        const task = await this.prisma.a2ATask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.status !== 'PENDING') throw new BadRequestException('任务已不接受竞标');

        // 检查该 Agent 是否已对该任务竞标过
        const existing = await this.prisma.a2ABid.findFirst({
            where: { taskId, agentId },
        });
        if (existing) throw new BadRequestException('已提交过竞标，请勿重复');

        return this.prisma.a2ABid.create({
            data: {
                taskId,
                agentId,
                bidAmount,
                estimatedDays,
                message,
            },
            include: { agent: { select: { id: true, name: true, owner: { select: { username: true } } } } },
        });
    }

    async getBidsForTask(taskId: string) {
        return this.prisma.a2ABid.findMany({
            where: { taskId },
            include: { agent: { select: { id: true, name: true, owner: { select: { username: true } } } } },
            orderBy: { bidAmount: 'asc' },
        });
    }

    async acceptBid(taskId: string, bidId: string, clientId: string) {
        const task = await this.prisma.a2ATask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.clientId !== clientId) throw new ForbiddenException('无权操作此任务');
        if (task.status !== 'PENDING') throw new BadRequestException('任务已不是竞标状态');

        const bid = await this.prisma.a2ABid.findUnique({ where: { id: bidId } });
        if (!bid) throw new NotFoundException('竞标不存在');
        if (bid.taskId !== taskId) throw new BadRequestException('竞标不属于该任务');

        // 更新任务：选中该 Agent，状态改为 ACCEPTED
        const updatedTask = await this.prisma.a2ATask.update({
            where: { id: taskId },
            data: {
                agentId: bid.agentId,
                status: 'ACCEPTED',
                cost: bid.bidAmount,
            },
        });

        // 可选：将其他竞标标记为 rejected
        await this.prisma.a2ABid.updateMany({
            where: { taskId, id: { not: bidId } },
            data: { status: 'rejected' },
        });
        await this.prisma.a2ABid.update({
            where: { id: bidId },
            data: { status: 'accepted' },
        });

        return updatedTask;
    }

    async startTask(taskId: string, agentUserId: string) {
        const task = await this.prisma.a2ATask.findUnique({
            where: { id: taskId },
            include: { agent: true },
        });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.agent.ownerId !== agentUserId) throw new ForbiddenException('只能启动自己承接的任务');
        if (task.status !== 'ACCEPTED') throw new BadRequestException('任务状态不允许启动');

        return this.prisma.a2ATask.update({
            where: { id: taskId },
            data: { status: 'IN_PROGRESS' },
        });
    }

    async completeTask(taskId: string, agentUserId: string, result: string) {
        const task = await this.prisma.a2ATask.findUnique({
            where: { id: taskId },
            include: { agent: true },
        });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.agent.ownerId !== agentUserId) throw new ForbiddenException('只能完成自己执行的任务');
        if (task.status !== 'IN_PROGRESS') throw new BadRequestException('任务状态不允许完成');

        return this.prisma.a2ATask.update({
            where: { id: taskId },
            data: { status: 'COMPLETED', result },
        });
    }

    async confirmCompletion(taskId: string, clientId: string) {
        const task = await this.prisma.a2ATask.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.clientId !== clientId) throw new ForbiddenException('无权确认此任务');
        if (task.status !== 'COMPLETED') throw new BadRequestException('任务未完成，无法确认');

        // 最终确认后扣款等逻辑（可在这里触发支付）
        // 假设已完成支付，此处仅标记最终状态
        return this.prisma.a2ATask.update({
            where: { id: taskId },
            data: { status: 'COMPLETED' }, // 或者增加一个 FINALIZED 状态
        });
    }
}