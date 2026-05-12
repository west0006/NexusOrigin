import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { A2AGatewayService } from './a2a-gateway.service';

@Controller('a2a')
export class A2AGatewayController {
    constructor(private a2aService: A2AGatewayService) {}

    // 发布任务
    @UseGuards(AuthGuard('jwt'))
    @Post('tasks')
    async createTask(@Body() dto: { agentId: string; description: string; bid?: number }, @Request() req: any) {
        return this.a2aService.createTask(dto, req.user.userId);
    }

    // Agent 拥有者接受任务
    @UseGuards(AuthGuard('jwt'))
    @Patch('tasks/:id/accept')
    async acceptTask(@Param('id') id: string, @Request() req: any) {
        return this.a2aService.acceptTask(id, req.user.userId);
    }

    // Agent 拥有者完成任务
    @UseGuards(AuthGuard('jwt'))
    @Patch('tasks/:id/complete')
    async completeTask(@Param('id') id: string, @Body() body: { result: string }, @Request() req: any) {
        return this.a2aService.completeTask(id, body.result, req.user.userId);
    }

    // 查看我发布的任务
    @UseGuards(AuthGuard('jwt'))
    @Get('tasks/client')
    async getClientTasks(@Request() req: any) {
        return this.a2aService.getClientTasks(req.user.userId);
    }

    // 查看我的 Agent 收到的任务
    @UseGuards(AuthGuard('jwt'))
    @Get('tasks/agent')
    async getAgentTasks(@Request() req: any) {
        return this.a2aService.getAgentTasks(req.user.userId);
    }
}