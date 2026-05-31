import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskService {
    private readonly logger = new Logger(TaskService.name);
    constructor(private readonly prisma: PrismaService) {}

    async list(userId: string, params: {
        page: number; pageSize: number;
        status?: string; search?: string;
    }) {
        const where: any = {};
        if (params.status) where.status = params.status;
        if (params.search) {
            where.OR = [
                { title: { contains: params.search } },
                { description: { contains: params.search } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.agentTask.findMany({
                where,
                skip: (params.page - 1) * params.pageSize,
                take: params.pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    client: { select: { id: true, username: true, avatar: true } },
                    provider: { select: { id: true, username: true, avatar: true } },
                    agent: { select: { id: true, name: true } },
                },
            }),
            this.prisma.agentTask.count({ where }),
        ]);
        return {
            items, total,
            page: params.page, pageSize: params.pageSize,
            totalPages: Math.ceil(total / params.pageSize),
        };
    }

    async getById(id: string, _userId: string) {
        const task = await this.prisma.agentTask.findUnique({
            where: { id },
            include: {
                client: { select: { id: true, username: true, avatar: true } },
                provider: { select: { id: true, username: true, avatar: true } },
                agent: { select: { id: true, name: true } },
            },
        });
        if (!task) throw new NotFoundException('任务不存在');
        return task;
    }

    async create(data: any, userId: string) {
        return this.prisma.agentTask.create({
            data: {
                title: data.title,
                description: data.description,
                clientId: userId,
                status: 'PENDING',
            },
        });
    }

    async claim(id: string, userId: string) {
        const task = await this.prisma.agentTask.findUnique({ where: { id } });
        if (!task) throw new NotFoundException('任务不存在');
        if (task.status !== 'PENDING') throw new ForbiddenException('任务不可接取');
        if (task.clientId === userId) throw new ForbiddenException('不能接取自己的任务');

        return this.prisma.agentTask.update({
            where: { id },
            data: { providerId: userId, status: 'IN_PROGRESS' },
        });
    }
}