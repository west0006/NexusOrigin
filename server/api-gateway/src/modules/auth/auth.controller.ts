import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Request,
    Get,
    Headers,
    Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
    SendSmsDto,
    PhoneLoginDto,
    WechatLoginDto,
    RegisterFinishDto,
    SelectIdentityDto,
    RegisterDto,
    LoginDto,
    SkipOnboardingDto,
} from './dto/auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    // ── 第零步：发送短信验证码 ──
    @Post('sms/send')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '发送短信验证码' })
    sendSms(@Body() dto: SendSmsDto) {
        return this.authService.sendSms(dto);
    }

    // ── 第一步：手机号 + 验证码登录 ──
    @Post('phone/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '手机号验证码登录' })
    phoneLogin(@Body() dto: PhoneLoginDto) {
        return this.authService.phoneLogin(dto);
    }

    // ── 第二步：新用户设置用户名 ──
    @Post('register/finish')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: '完成注册' })
    registerFinish(@Body() dto: RegisterFinishDto) {
        return this.authService.registerFinish(dto);
    }

    // ── 第三步：选择身份 ──
    @UseGuards(AuthGuard('jwt'))
    @Post('identity/select')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: '选择身份' })
    selectIdentity(@Request() req: any, @Body() dto: SelectIdentityDto) {
        return this.authService.selectIdentity(req.user.userId, dto);
    }

    // ── 跳过引导 ──
    @UseGuards(AuthGuard('jwt'))
    @Post('onboarding/skip')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: '跳过引导流程', description: '将用户设为 COMPLETED 状态' })
    skipOnboarding(@Request() req: any) {
        return this.authService.skipOnboarding(req.user.userId);
    }

    // ── 微信一键登录 ──
    @Post('wechat/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '微信一键登录' })
    wechatLogin(@Body() dto: WechatLoginDto) {
        return this.authService.wechatLogin(dto);
    }

    // ── 邮箱注册 ──
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: '邮箱注册' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // ── 邮箱/手机密码登录 ──
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '密码登录' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // ── 刷新 Token ──
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '刷新 Token' })
    refresh(@Body('refreshToken') refreshToken: string) {
        return this.authService.refresh(refreshToken);
    }

    // ── 登出 ──
    @UseGuards(AuthGuard('jwt'))
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: '登出（拉黑当前 Token）' })
    logout(
        @Request() req: any,
        @Headers('authorization') authHeader?: string,
    ) {
        const token = authHeader?.replace('Bearer ', '');
        return this.authService.logout(req.user.userId, token);
    }

    // ── 获取当前用户引导进度 ──
    @UseGuards(AuthGuard('jwt'))
    @Get('onboarding')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取当前用户引导进度' })
    async getOnboarding(@Request() req: any) {
        return this.authService.getOnboardingProgress(req.user.userId);
    }

    // ── 更新用户资料（引导流程中的补充入口） ──
    @UseGuards(AuthGuard('jwt'))
    @Patch('profile/onboarding')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: '引导流程中更新资料' })
    updateOnboardingProfile(
        @Request() req: any,
        @Body() dto: RegisterFinishDto,
    ) {
        return this.authService.updateOnboardingProfile(req.user.userId, dto);
    }

    @Post('register/finish')
    @HttpCode(HttpStatus.OK)
    async finishRegister(@Body() dto: RegisterFinishDto) {
        return this.authService.finishRegister(dto);
    }

}