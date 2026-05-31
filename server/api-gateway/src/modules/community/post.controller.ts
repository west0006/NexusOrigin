import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/CreatePost.dto';
import { UpdatePostDto } from './dto/UpdatePost.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Community - Posts')
@Controller('posts')
export class PostController {
    constructor(private postService: PostService) {}

    @Get()
    @ApiOperation({ summary: '获取帖子列表' })
    @ApiQuery({ name: 'page', required: false, example: '1' })
    @ApiQuery({ name: 'pageSize', required: false, example: '20' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.postService.list(
            Number(page) || 1,
            Number(pageSize) || 20,
            status as any,
            search,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: '获取帖子详情' })
    async getById(@Param('id') id: string) {
        return this.postService.getById(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建帖子' })
    async create(@Body() dto: CreatePostDto, @Request() req: any) {
        return this.postService.create(dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '更新帖子' })
    async update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Request() req: any) {
        return this.postService.update(id, dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '删除帖子（软删除）' })
    async delete(@Param('id') id: string, @Request() req: any) {
        return this.postService.delete(id, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/like')
    @ApiBearerAuth()
    @ApiOperation({ summary: '点赞/取消点赞帖子' })
    async toggleLike(@Param('id') id: string, @Request() req: any) {
        return this.postService.toggleLike(id, req.user.userId);
    }
}