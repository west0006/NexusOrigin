import { Controller, Post, Get, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import type { PostCategory } from '@prisma/client';
import {CreatePostDto} from "./dto/CreatePost.dto";



@Controller('posts')
export class PostController {
    constructor(private postService: PostService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() dto: CreatePostDto, @Request() req: any) {
        return this.postService.create({ ...dto, authorId: req.user.userId });
    }

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('search') search?: string,
    ) {
        return this.postService.list(Number(page) || 1, Number(pageSize) || 20, search);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.postService.getById(id);
    }
}