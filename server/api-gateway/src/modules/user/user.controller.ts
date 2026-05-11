// ── user/user.controller.ts ───────────────────────────────
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

interface RequestWithUser {
    user: { userId: string; email: string };
}

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    async getProfile(@Request() req: RequestWithUser): Promise<unknown> {
        return this.userService.getProfile(req.user.userId);
    }
}