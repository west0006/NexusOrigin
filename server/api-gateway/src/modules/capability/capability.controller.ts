import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CapabilityService } from './capability.service';
import {CapabilityAuditService} from "./capability-audit.service";

@Controller('capabilities')
export class CapabilityController {
    constructor(private capabilityService: CapabilityService,
                private auditService: CapabilityAuditService,
                ) {}

    @Get()
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('search') search?: string,
        @Query('protocol') protocol?: string,
    ) {
        return this.capabilityService.list(Number(page) || 1, Number(pageSize) || 20, search, protocol);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async create(@Body() dto: any, @Request() req: any) {
        return this.capabilityService.create(dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/install')
    async install(@Param('id') id: string, @Request() req: any) {
        return this.capabilityService.install(id, req.user.userId);
    }

    // 管理员审核（简化：仅校验JWT，实际应加角色守卫）
    @UseGuards(AuthGuard('jwt'))
    @Post(':id/review')
    async review(@Param('id') id: string, @Body() body: { approved: boolean; reason?: string }) {
        return this.capabilityService.review(id, body.approved, body.reason);
    }
    @Get(':id/check-env')
    async checkEnvironment(@Param('id') id: string) {
        return this.capabilityService.getEnvAssessment(id);
    }

}