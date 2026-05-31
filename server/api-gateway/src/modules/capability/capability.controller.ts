import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CapabilityService } from './capability.service';
import { CreateCapabilityDto } from './dto/CreateCapability.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {EarningsQueryDto} from "./dto/EarningsQuery.dto";

@ApiTags('Capability')
@Controller('capabilities')
export class CapabilityController {
    constructor(private capabilityService: CapabilityService) {}

    @Get()
    @ApiOperation({ summary: '获取能力列表' })
    async list(
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
        @Query('sort') sort?: string,
        @Query('search') search?: string,
    ) {
        return this.capabilityService.list(
            Number(page) || 1, Number(pageSize) || 20, sort, search,
        );
    }

    @Get(':id')
    @ApiOperation({ summary: '获取能力详情' })
    async getById(@Param('id') id: string) {
        return this.capabilityService.getById(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建能力' })
    async create(@Body() dto: CreateCapabilityDto, @Request() req: any) {
        return this.capabilityService.create(dto, req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/purchase')
    @ApiBearerAuth()
    @ApiOperation({ summary: '购买能力' })
    async purchase(@Param('id') id: string, @Request() req: any) {
        return this.capabilityService.purchase(id, req.user.userId);
    }

    @Get(':id/install-guide')
    @ApiOperation({ summary: '获取安装指南' })
    async getInstallGuide(@Param('id') id: string) {
        return this.capabilityService.getInstallGuide(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('developer/earnings')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取开发者收益统计' })
    async getEarnings(@Request() req: any, @Query() query: EarningsQueryDto) {
        return this.capabilityService.getDeveloperEarnings(
            req.user.userId,
            query.startDate,
            query.endDate,
            query.groupBy,
        );
    }
}