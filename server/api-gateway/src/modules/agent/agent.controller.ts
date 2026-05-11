// ─── server/api-gateway/src/modules/agent/agent.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentService } from './agent.service';

@Controller('agents')
@UseGuards(AuthGuard('jwt'))
export class AgentController {
    constructor(private agentService: AgentService) {}

    @Get('services')
    getServices() {
        return this.agentService.getServices();
    }

    @Post('tasks')
    createTask(@Request() req: any, @Body() body: { description: string }) {
        return this.agentService.createTask(req.user.userId, body.description);
    }

    @Get('tasks')
    getTasks(@Request() req: any) {
        return this.agentService.getTasks(req.user.userId);
    }
}