// ── server/api-gateway/src/modules/community/comment.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentService {
    constructor(private prisma: PrismaService) {}
    async create(postId: string, authorId: string, content: string) {
        return this.prisma.comment.create({ data: { postId, authorId, content } });
    }
    async listByPost(postId: string) {
        return this.prisma.comment.findMany({
            where: { postId },
            include: { author: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }
}