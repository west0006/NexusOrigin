// ── community/post.service.ts ─────────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PostCategory } from '@prisma/client';

interface CreatePostInput {
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    authorId: string;
}

@Injectable()
export class PostService {
    constructor(private readonly prisma: PrismaService) {}

    async create(input: CreatePostInput) {
        return this.prisma.post.create({
            data: {
                title: input.title,
                content: input.content,
                category: input.category,
                tags: input.tags,
                authorId: input.authorId,
            },
        });
    }

    async list(page: number = 1, pageSize: number = 20) {
        const skip = (page - 1) * pageSize;
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: { author: { select: { id: true, username: true, avatar: true } } },
            }),
            this.prisma.post.count(),
        ]);
        return { posts, total };
    }
}