import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PostCategory } from '@prisma/client';

@Injectable()
export class PostService {
    constructor(private prisma: PrismaService) {}

    async create(data: { title: string; content: string; category: PostCategory; tags: string[]; authorId: string }) {
        return this.prisma.post.create({ data });
    }

    async list(page: number, pageSize: number, search?: string) {
        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { content: { contains: search } },
            ];
        }
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                where,
                orderBy: { createdAt: 'desc' },
                include: { author: { select: { id: true, username: true, avatar: true } } },
            }),
            this.prisma.post.count({ where }),
        ]);
        return { posts, total };
    }

    async getById(id: string) {
        return this.prisma.post.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, username: true } },
                comments: {
                    where: { parentId: null },
                    include: {
                        author: { select: { id: true, username: true } },
                        replies: {
                            include: {
                                author: { select: { id: true, username: true } },
                                _count: { select: { commentLikes: true } },
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                        _count: { select: { commentLikes: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
}