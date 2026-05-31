import {Controller, Post, Get, Param, Body, UseGuards, Request, Query, ForbiddenException} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { A2AGatewayService } from './a2a-gateway.service';
import { CreateTaskDto } from './dto/CreateTask.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {PrismaService} from "../../prisma/prisma.service";

@ApiTags('A2A Gateway')
@Controller('a2a')
export class A2AGatewayController {
    constructor(private a2aService: A2AGatewayService,private readonly prisma: PrismaService, ) {}

    @Get('tasks')
    @ApiOperation({ summary: '获取任务列表', description: '公开分页查询所有任务，支持状态筛选' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'pageSize', required: false })
    @ApiQuery({ name: 'status', required: false })
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('status') status?: string,
    ) {
        return this.a2aService.list(Number(page) || 1, Number(pageSize) || 20, status);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks')
    @ApiBearerAuth()
    @ApiOperation({ summary: '发布任务', description: '发布一个新的 A2A 任务到指定 Agent' })
    async createTask(@Body() dto: CreateTaskDto, @Request() req: any) {
        return this.a2aService.createTask(dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('tasks/client')
    @ApiBearerAuth()
    @ApiOperation({ summary: '我发布的任务', description: '查看当前用户发布的所有任务' })
    async getClientTasks(@Request() req: any) {
        return this.a2aService.getClientTasks(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('tasks/agent')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Agent 收到的任务', description: '查看当前用户 Agent 收到的所有任务' })
    async getAgentTasks(@Request() req: any) {
        return this.a2aService.getAgentTasks(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('tasks/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取任务详情', description: '根据任务 ID 获取任务详情' })
    async getTaskById(@Param('id') id: string) {
        return this.a2aService.getTaskById(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks/:taskId/bids')
    @ApiBearerAuth()
    @ApiOperation({ summary: '提交竞标' })
    async placeBid(
        @Param('taskId') taskId: string,
        @Body('agentId') agentId: string,
        @Body('bidAmount') bidAmount: number,
        @Body('estimatedDays') estimatedDays: number,
        @Body('message') message: string,
        @Request() req: any,
    ) {
        // 验证该 agent 是否属于当前用户
        const agent = await this.prisma.agent.findFirst({
            where: { id: agentId, ownerId: req.user.userId },
        });
        if (!agent) throw new ForbiddenException('无权操作此Agent');
        return this.a2aService.placeBid(taskId, agentId, bidAmount, estimatedDays, message);
    }

    @Get('tasks/:taskId/bids')
    @ApiOperation({ summary: '查看任务的所有竞标' })
    async getBids(@Param('taskId') taskId: string) {
        return this.a2aService.getBidsForTask(taskId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks/:taskId/bids/:bidId/accept')
    @ApiBearerAuth()
    @ApiOperation({ summary: '接受竞标' })
    async acceptBid(
        @Param('taskId') taskId: string,
        @Param('bidId') bidId: string,
        @Request() req: any,
    ) {
        return this.a2aService.acceptBid(taskId, bidId, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks/:taskId/start')
    @ApiBearerAuth()
    @ApiOperation({ summary: '开始执行任务（Agent侧）' })
    async startTask(@Param('taskId') taskId: string, @Request() req: any) {
        return this.a2aService.startTask(taskId, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks/:taskId/complete')
    @ApiBearerAuth()
    @ApiOperation({ summary: '完成任务并提交结果（Agent侧）' })
    async completeTask(
        @Param('taskId') taskId: string,
        @Body('result') result: string,
        @Request() req: any,
    ) {
        return this.a2aService.completeTask(taskId, req.user.userId, result);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('tasks/:taskId/confirm')
    @ApiBearerAuth()
    @ApiOperation({ summary: '确认任务完成（Client侧）' })
    async confirmCompletion(@Param('taskId') taskId: string, @Request() req: any) {
        return this.a2aService.confirmCompletion(taskId, req.user.userId);
    }
}
