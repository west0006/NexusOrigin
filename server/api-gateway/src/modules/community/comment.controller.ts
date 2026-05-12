// ── server/api-gateway/src/modules/community/comment.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';

@Controller('posts/:postId/comments')
export class CommentController {
    constructor(private commentService: CommentService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Param('postId') postId: string, @Body() dto: { content: string }, @Request() req: any) {
        return this.commentService.create(postId, req.user.userId, dto.content);
    }

    @Get()
    async list(@Param('postId') postId: string) {
        return this.commentService.listByPost(postId);
    }
}