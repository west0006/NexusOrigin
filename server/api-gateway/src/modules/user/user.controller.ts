import {Controller, Get, Patch, Post, Body, UseGuards, Request, Query} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/UpdateProfile.dto';
import { ChangePasswordDto } from './dto/ChangePassword.dto';
import { RechargeDto } from './dto/Recharge.dto';
import {ApiTags, ApiOperation, ApiBearerAuth, ApiQuery} from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取用户资料', description: '获取当前登录用户的个人资料' })
    async getProfile(@Request() req: any) {
        return this.userService.getProfile(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('token-usage')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取Token用量统计', description: '按时间维度获取Token消耗趋势' })
    @ApiQuery({ name: 'days', required: false, example: '7' })
    async getTokenUsage(@Request() req: any, @Query('days') days?: string) {
        return this.userService.getTokenUsage(req.user.userId, Number(days) || 7);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('profile')
    @ApiBearerAuth()
    @ApiOperation({ summary: '更新用户资料', description: '更新当前登录用户的个人资料' })
    async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
        return this.userService.updateProfile(req.user.userId, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('change-password')
    @ApiBearerAuth()
    @ApiOperation({ summary: '修改密码', description: '修改当前登录用户的密码' })
    async changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
        return this.userService.changePassword(req.user.userId, dto.oldPassword, dto.newPassword);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('credits')
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取积分', description: '获取当前登录用户的积分余额' })
    async getCredits(@Request() req: any) {
        return this.userService.getCredits(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post('recharge')
    @ApiBearerAuth()
    @ApiOperation({ summary: '充值积分', description: '为当前登录用户充值积分' })
    async recharge(@Body() dto: RechargeDto, @Request() req: any) {
        return this.userService.recharge(req.user.userId, dto.amount, dto.method);
    }
}
