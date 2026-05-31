import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkillService } from './skill.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Skill')
@Controller('skills')
export class SkillController {
    constructor(private skillService: SkillService) {}

    @Get()
    @ApiOperation({ summary: '获取技能列表' })
    async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        return this.skillService.list(Number(page) || 1, Number(pageSize) || 20);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: '创建技能' })
    async create(@Body('name') name: string, @Body('description') description: string, @Request() req: any) {
        return this.skillService.create({ name, description }, req.user.userId);
    }
}