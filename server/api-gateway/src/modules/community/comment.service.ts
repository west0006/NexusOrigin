import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentService {
    private readonly logger = new Logger(CommentService.name);

    constructor(private readonly prisma: PrismaService) {}

    async list(postId: string, currentUserId?: string) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('帖子不存在');

        const comments = await this.prisma.comment.findMany({
            where: { postId, deletedAt: null },
            orderBy: { createdAt: 'asc' },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                commentLikes: true,
            },
        });

        // 构建点赞映射：commentId -> 当前用户是否点赞
        let likeMap = new Map<string, boolean>();
        if (currentUserId) {
            const userLikes = await this.prisma.commentLike.findMany({
                where: { userId: currentUserId, comment: { postId } },
                select: { commentId: true },
            });
            likeMap = new Map(userLikes.map(l => [l.commentId, true]));
        }

        // 构建评论树，并附加 liked 字段
        const commentMap = new Map<string, any>();
        const roots: any[] = [];

        for (const c of comments) {
            commentMap.set(c.id, {
                id: c.id,
                body: c.body,
                likes: c.commentLikes.length,
                liked: likeMap.get(c.id) ?? false,
                author: c.author,
                agentAuthor: c.agentAuthor,
                createdAt: c.createdAt,
                parentId: c.parentId,
                replies: [],
            });
        }

        for (const c of commentMap.values()) {
            if (c.parentId && commentMap.has(c.parentId)) {
                commentMap.get(c.parentId)!.replies.push(c);
            } else {
                roots.push(c);
            }
        }

        return roots;
    }


    async create(postId: string, body: string, userId: string, parentId?: string) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('帖子不存在');
        }

        if (parentId) {
            const parentComment = await this.prisma.comment.findUnique({
                where: { id: parentId },
            });
            if (!parentComment || parentComment.postId !== postId) {
                throw new NotFoundException('父评论不存在或不属于该帖子');
            }
        }

        return this.prisma.comment.create({
            data: {
                body,
                authorId: userId,
                postId,
                parentId: parentId ?? null,
            },
            include: {
                author: {
                    select: { id: true, username: true, avatar: true },
                },
            },
        });
    }

    async delete(commentId: string, userId: string) {
        const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('评论不存在');
        }
        if (comment.authorId !== userId) {
            throw new ForbiddenException('只能删除自己的评论');
        }

        // 软删除
        await this.prisma.comment.update({
            where: { id: commentId },
            data: { deletedAt: new Date() },
        });
    }

    async toggleLike(commentId: string, userId: string) {
        const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('评论不存在');
        }

        const existingLike = await this.prisma.commentLike.findUnique({
            where: { userId_commentId: { userId, commentId } },
        });

        if (existingLike) {
            await this.prisma.commentLike.delete({ where: { id: existingLike.id } });
            return { liked: false };
        } else {
            await this.prisma.commentLike.create({
                data: { userId, commentId },
            });
            return { liked: true };
        }
    }
}