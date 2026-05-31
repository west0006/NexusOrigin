// server/api-gateway/src/modules/agent/agent.controller.ts
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentService } from './agent.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Agent')
@Controller('agents')
export class AgentController {
    constructor(private agentService: AgentService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '注册 Agent' })
    async register(@Body() dto: any, @Request() req: any) {
        return this.agentService.register(dto, req.user.userId);
    }

    @Get()
    @ApiOperation({ summary: '获取 Agent 列表' })
    async listAgents(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.agentService.listAgents(Number(page) || 1, Number(pageSize) || 20);
    }

    @Get('services')
    @ApiOperation({ summary: '获取 Agent 服务列表' })
    async getServices() {
        return this.agentService.getServices();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-agents')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取我的 Agent' })
    async getMyAgents(@Request() req: any) {
        return this.agentService.getMyAgents(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-tasks')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取我的任务列表' })
    async getTasks(@Request() req: any) {
        return this.agentService.getTasks(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('token-state')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取 Token 用量概览' })
    async getTokenState(@Request() req: any) {
        return this.agentService.getTokenState(req.user.userId);
    }

    @Get(':id')
    @ApiOperation({ summary: '获取 Agent 详情' })
    async getAgentInfo(@Param('id') id: string) {
        return this.agentService.getAgentInfo(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/tasks')
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建 Agent 任务' })
    async createTask(
        @Param('id') agentId: string,
        @Body('title') title: string,
        @Body('description') description: string,
        @Request() req: any,
    ) {
        return this.agentService.createTask(req.user.userId, agentId, title, description);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/usage')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取 Agent 用量统计' })
    async getUsageStats(@Param('id') id: string) {
        return this.agentService.getUsageStats(id);
    }
}