import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentRegistryService } from './agent-registry.service';
import { RegisterAgentDto } from './dto/RegisterAgent.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Agent Registry')
@Controller('agents')
export class AgentRegistryController {
    constructor(private readonly agentRegistry: AgentRegistryService) {}

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '注册 Agent', description: '注册一个新的 Agent 到平台' })
    async register(@Body() dto: RegisterAgentDto, @Request() req: any) {
        return this.agentRegistry.register(dto, req.user.userId);
    }

    @Get()
    @ApiOperation({ summary: '获取 Agent 列表', description: '分页获取所有已注册的 Agent' })
    async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        return this.agentRegistry.findAll(Number(page) || 1, Number(pageSize) || 20);
    }

    @Get(':id')
    @ApiOperation({ summary: '获取 Agent 详情', description: '根据 ID 获取指定 Agent 的详细信息' })
    async get(@Param('id') id: string) {
        return this.agentRegistry.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/heartbeat')
    @ApiBearerAuth()
    @ApiOperation({ summary: '发送心跳', description: '更新 Agent 的心跳时间戳' })
    async heartbeat(@Param('id') id: string) {
        return this.agentRegistry.updateHeartbeat(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: '注销 Agent', description: '从平台注销指定 Agent' })
    async deregister(@Param('id') id: string, @Request() req: any) {
        return this.agentRegistry.deregister(id, req.user.userId);
    }
}
