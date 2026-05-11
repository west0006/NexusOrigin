// ── skill/skill.controller.ts ─────────────────────────────
import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkillService } from './skill.service';

interface RequestWithUser {
    user: { userId: string; email: string };
}

@Controller('skills')
export class SkillController {
    constructor(private readonly skillService: SkillService) {}

    @Get()
    async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
        return this.skillService.list(Number(page) || 1, Number(pageSize) || 20);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/install')
    async install(@Param('id') id: string, @Request() req: RequestWithUser) {
        return this.skillService.install(id, req.user.userId);
    }
}