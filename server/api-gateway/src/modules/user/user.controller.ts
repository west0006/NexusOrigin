import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    async getProfile(@Request() req: any) {
        return this.userService.getProfile(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('profile')
    async updateProfile(@Body() dto: { username?: string; bio?: string; avatar?: string }, @Request() req: any) {
        return this.userService.updateProfile(req.user.userId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('change-password')
    async changePassword(@Body() dto: { oldPassword: string; newPassword: string }, @Request() req: any) {
        return this.userService.changePassword(req.user.userId, dto.oldPassword, dto.newPassword);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('balance')
    async getBalance(@Request() req: any) {
        return this.userService.getBalance(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('recharge')
    async recharge(@Body() dto: { amount: number; method: string }, @Request() req: any) {
        return this.userService.recharge(req.user.userId, dto.amount, dto.method);
    }
}