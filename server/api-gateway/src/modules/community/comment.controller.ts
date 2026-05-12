import { Controller, Post, Get, Param, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';

@Controller('posts/:postId/comments')
export class CommentController {
    constructor(private commentService: CommentService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(
        @Param('postId') postId: string,
        @Body() dto: { content: string; parentId?: string },
        @Request() req: any,
    ) {
        return this.commentService.create(postId, req.user.userId, dto.content, dto.parentId);
    }

    @Get()
    async list(@Param('postId') postId: string) {
        return this.commentService.listByPost(postId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':commentId/like')
    async toggleLike(
        @Param('postId') postId: string,
        @Param('commentId') commentId: string,
        @Request() req: any,
    ) {
        return this.commentService.toggleLike(commentId, req.user.userId);
    }
}