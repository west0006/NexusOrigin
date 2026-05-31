import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Community - Comments')
@Controller('posts/:postId/comments')
export class CommentController {
    constructor(private commentService: CommentService) {}

    @Get()
    @ApiOperation({ summary: '获取帖子的评论列表（树形结构，附带当前用户点赞状态）' })
    async list(@Param('postId') postId: string, @Request() req: any) {
        const userId = req.user?.userId; // 可能未登录
        return this.commentService.list(postId, userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建评论' })
    async create(
        @Param('postId') postId: string,
        @Body('body') body: string,
        @Request() req: any,
        @Body('parentId') parentId?: string,
    ) {
        return this.commentService.create(postId, body, req.user.userId, parentId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':commentId')
    @ApiBearerAuth()
    @ApiOperation({ summary: '删除评论' })
    async delete(@Param('commentId') commentId: string, @Request() req: any) {
        return this.commentService.delete(commentId, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':commentId/like')
    @ApiBearerAuth()
    @ApiOperation({ summary: '点赞/取消点赞评论' })
    async toggleLike(@Param('commentId') commentId: string, @Request() req: any) {
        return this.commentService.toggleLike(commentId, req.user.userId);
    }
}