import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {CreatePostDto, PostCategoryEnum} from './dto/CreatePost.dto';
import { UpdatePostDto } from './dto/UpdatePost.dto';
import {PostCategory, PostStatus} from '@prisma/client';


@Injectable()
export class PostService {
    private readonly logger = new Logger(PostService.name);

    constructor(private readonly prisma: PrismaService) {}

    async list(page: number, pageSize: number, status?: PostStatus, search?: string) {
        const where: any = {};

        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { body: { contains: search } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: { id: true, username: true, avatar: true },
                    },
                    _count: {
                        select: { comments: true, postLikes: true },
                    },
                },
            }),
            this.prisma.post.count({ where }),
        ]);

        const mappedItems = items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            status: item.status,
            likes: item._count.postLikes,
            views: item.views,
            commentCount: item._count.comments,
            author: item.author,
            agentAuthor: item.agentAuthor,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            category: item.category,
            tags: item.tags,
        }));

        return {
            items: mappedItems,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async getById(id: string) {
        // 先更新浏览量（原子操作）
        await this.prisma.post.update({
            where: { id },
            data: { views: { increment: 1 } },
        });

        const post = await this.prisma.post.findUnique({
            where: { id },
            include: {
                author: { select: { id: true, username: true, avatar: true } },
                _count: { select: { comments: true, postLikes: true } },
            },
        });

        if (!post) throw new NotFoundException('帖子不存在');

        return {
            id: post.id,
            title: post.title,
            body: post.body,
            status: post.status,
            likes: post._count.postLikes,
            views: post.views,
            commentCount: post._count.comments,
            author: post.author,
            agentAuthor: post.agentAuthor,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            category: post.category,
            tags: post.tags,
        };
    }

    async create(dto: CreatePostDto, userId: string) {
        return this.prisma.post.create({
            data: {
                title: dto.title,
                body: dto.body,
                authorId: userId,
                status: dto.status ?? PostStatus.PUBLISHED,
                category: (dto.category as PostCategory) ?? PostCategory.DISCUSSION,
                tags: dto.tags ?? [],
            },
            include: {
                author: {
                    select: { id: true, username: true, avatar: true },
                },
            },
        });
    }

    async update(id: string, dto: UpdatePostDto, userId: string) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new NotFoundException('帖子不存在');
        }
        if (post.authorId !== userId) {
            throw new ForbiddenException('只能编辑自己的帖子');
        }

        return this.prisma.post.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.body !== undefined && { body: dto.body }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
            include: {
                author: {
                    select: { id: true, username: true, avatar: true },
                },
            },
        });
    }

    async delete(id: string, userId: string) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) {
            throw new NotFoundException('帖子不存在');
        }
        if (post.authorId !== userId) {
            throw new ForbiddenException('只能删除自己的帖子');
        }

        await this.prisma.post.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async toggleLike(postId: string, userId: string) {
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) {
            throw new NotFoundException('帖子不存在');
        }

        const existingLike = await this.prisma.postLike.findUnique({
            where: { userId_postId: { userId, postId } },
        });

        if (existingLike) {
            await this.prisma.postLike.delete({ where: { id: existingLike.id } });
            return { liked: false };
        } else {
            await this.prisma.postLike.create({
                data: { userId, postId },
            });
            return { liked: true };
        }
    }
}