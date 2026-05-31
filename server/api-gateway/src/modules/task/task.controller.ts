import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskService } from './task.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
    constructor(private taskService: TaskService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取任务列表', description: '分页获取任务列表，支持筛选' })
    async list(
        @Request() req: any,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.taskService.list(req.user.userId, {
            page: Number(page) || 1,
            pageSize: Number(pageSize) || 20,
            status,
            search,
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取任务详情', description: '根据 ID 获取任务详细信息' })
    async getById(@Param('id') id: string, @Request() req: any) {
        return this.taskService.getById(id, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建任务', description: '创建一个新的任务' })
    async create(@Body() data: any, @Request() req: any) {
        return this.taskService.create(data, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/claim')
    @ApiBearerAuth()
    @ApiOperation({ summary: '接取任务', description: '接取指定任务' })
    async claim(@Param('id') id: string, @Request() req: any) {
        return this.taskService.claim(id, req.user.userId);
    }
}