// ── community/post.controller.ts ──────────────────────────
import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import { PostCategory } from '@prisma/client';
import {IsArray, IsEnum, IsNotEmpty, IsString} from "class-validator";

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsEnum(PostCategory)
    category!: PostCategory;

    @IsArray()
    @IsString({ each: true })
    tags!: string[];
}

interface RequestWithUser {
    user: { userId: string; email: string };
}

@Controller('posts')
export class PostController {
    constructor(private readonly postService: PostService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() dto: CreatePostDto, @Request() req: RequestWithUser) {
        return this.postService.create({ ...dto, authorId: req.user.userId });
    }

    @Get()
    async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        return this.postService.list(Number(page) || 1, Number(pageSize) || 20);
    }
}