import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentService {
    constructor(private prisma: PrismaService) {}

    async create(postId: string, authorId: string, content: string, parentId?: string) {
        if (parentId) {
            const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
            if (!parent || parent.postId !== postId) throw new NotFoundException('Parent comment not found');
        }
        return this.prisma.comment.create({
            data: { postId, authorId, content, parentId },
            include: {
                author: { select: { id: true, username: true } },
                _count: { select: { commentLikes: true } },
            },
        });
    }

    async listByPost(postId: string) {
        return this.prisma.comment.findMany({
            where: { postId, parentId: null },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                replies: {
                    include: {
                        author: { select: { id: true, username: true, avatar: true } },
                        _count: { select: { commentLikes: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                _count: { select: { commentLikes: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async toggleLike(commentId: string, userId: string) {
        const existing = await this.prisma.commentLike.findUnique({
            where: { userId_commentId: { userId, commentId } },
        });
        if (existing) {
            await this.prisma.commentLike.delete({ where: { id: existing.id } });
            return { liked: false };
        }
        await this.prisma.commentLike.create({ data: { userId, commentId } });
        return { liked: true };
    }
}