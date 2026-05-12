import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentRegistryService } from './agent-registry.service';

@Controller('agents')
export class AgentRegistryController {
    constructor(private readonly agentRegistry: AgentRegistryService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async register(@Body() dto: any, @Request() req: any) {
        return this.agentRegistry.register(dto, req.user.userId);
    }

    @Get()
    async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        return this.agentRegistry.findAll(Number(page) || 1, Number(pageSize) || 20);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.agentRegistry.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/heartbeat')
    async heartbeat(@Param('id') id: string) {
        return this.agentRegistry.updateHeartbeat(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async deregister(@Param('id') id: string, @Request() req: any) {
        return this.agentRegistry.deregister(id, req.user.userId);
    }
}