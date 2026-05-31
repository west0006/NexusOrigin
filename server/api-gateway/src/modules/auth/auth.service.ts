import * as crypto from 'crypto';
import {
    ConflictException,
    Injectable,
    UnauthorizedException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
    SendSmsDto,
    PhoneLoginDto,
    WechatLoginDto,
    RegisterFinishDto,
    SelectIdentityDto,
    RegisterDto,
    LoginDto,
} from './dto/auth.dto';
import { ONBOARDING_STEPS } from './auth.constants';
import { SmsService } from './sms.service';
import { WechatService } from './wechat.service';
import { TokenBlacklistService } from './token-blacklist.service';
import {JwtPayload} from "./jwt.strategy";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    // 内存存储：短信验证码（生产环境应换 Redis）
    private smsCodeStore = new Map<string, { code: string; expiresAt: number }>();

    // 内存存储：注册中途临时 token → phone
    private registerTokenStore = new Map<string, { phone: string; expiresAt: number }>();

    // 短信发送间隔限制（同手机号 60 秒内不可重发）
    private smsCooldownStore = new Map<string, number>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly smsService: SmsService,
        private readonly wechatService: WechatService,
        private readonly tokenBlacklist: TokenBlacklistService,
    ) {}

    // ─── 第零步：发送短信验证码（含限流） ───
    async sendSms(dto: SendSmsDto) {
        const cooldownUntil = this.smsCooldownStore.get(dto.phone);
        if (cooldownUntil && cooldownUntil > Date.now()) {
            const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
            throw new BadRequestException(`请 ${remaining} 秒后再试`);
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟有效
        this.smsCodeStore.set(dto.phone, { code, expiresAt });
        this.smsCooldownStore.set(dto.phone, Date.now() + 60 * 1000); // 60 秒冷却

        this.logger.log(`[SMS] 手机号 ${dto.phone} 验证码: ${code}`);

        await this.smsService.send(dto.phone, code);
        return { ok: true, message: '验证码已发送' };
    }

    // ─── 第一步：手机号 + 验证码登录/注册 ───
    async phoneLogin(dto: PhoneLoginDto) {
        const record = this.smsCodeStore.get(dto.phone);
        if (!record || record.expiresAt < Date.now()) {
            throw new BadRequestException('验证码已过期，请重新获取');
        }
        if (record.code !== dto.code) {
            throw new BadRequestException('验证码错误');
        }
        this.smsCodeStore.delete(dto.phone);

        let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

        if (user) {
            // ── 老用户：直接登录 ──
            const token = await this.generateToken(user);
            return {
                ...token,
                isNewUser: false,
                onboardingStep: user.onboardingStep,
            };
        }

        // ── 新用户：创建占位用户，返回 setUsername token ──
        const tempToken = this.jwtService.sign(
            { sub: dto.phone, purpose: 'set-username' },
            { expiresIn: '15m', secret: this.configService.get('JWT_SECRET') },
        );
        this.registerTokenStore.set(dto.phone, {
            phone: dto.phone,
            expiresAt: Date.now() + 15 * 60 * 1000,
        });

        return {
            isNewUser: true,
            nextStep: ONBOARDING_STEPS.SET_USERNAME,
            registerToken: tempToken,
        };
    }

    // ─── 第二步：新用户设置用户名并完成注册 ───
    async registerFinish(dto: RegisterFinishDto) {
        let payload: { sub: string; purpose: string };
        try {
            payload = this.jwtService.verify(dto.token, {
                secret: this.configService.get('JWT_SECRET'),
            });
        } catch {
            throw new BadRequestException('临时 token 无效或已过期');
        }
        if (payload.purpose !== 'set-username') {
            throw new BadRequestException('非法 token');
        }

        const phone = payload.sub;
        const existing = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existing) {
            throw new ConflictException('该用户名已被使用');
        }

        const user = await this.prisma.user.create({
            data: {
                phone,
                username: dto.username,
                onboardingStep: ONBOARDING_STEPS.SELECT_IDENTITY,
            },
        });

        this.registerTokenStore.delete(phone);

        const token = await this.generateToken(user);
        return {
            ...token,
            onboardingStep: ONBOARDING_STEPS.SELECT_IDENTITY,
        };
    }

    // ─── 第三步：选择身份类型 ───
    async selectIdentity(userId: string, dto: SelectIdentityDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                identityType: dto.identityType as any,
                onboardingStep: ONBOARDING_STEPS.COMPLETED,
            },
        });

        return {
            identityType: user.identityType,
            onboardingStep: user.onboardingStep,
            message:
                user.identityType === 'DEVELOPER'
                    ? '欢迎开发者！接下来请完成 Agent 注册'
                    : '欢迎！现在开始探索任务市场吧',
        };
    }

    // ─── 微信一键登录 ───
    async wechatLogin(dto: WechatLoginDto) {
        const wechatUser = await this.wechatService.getUserInfo(dto.code);

        let user = await this.prisma.user.findUnique({
            where: { wechatUnionId: wechatUser.unionId },
        });

        if (user) {
            const token = await this.generateToken(user);
            return {
                ...token,
                isNewUser: false,
                onboardingStep: user.onboardingStep,
            };
        }

        // 新用户：用微信信息创建
        user = await this.prisma.user.create({
            data: {
                wechatUnionId: wechatUser.unionId,
                username: wechatUser.nickname || `wx_${wechatUser.unionId.slice(-8)}`,
                avatar: wechatUser.headImgUrl,
                onboardingStep: ONBOARDING_STEPS.SELECT_IDENTITY,
            },
        });

        const token = await this.generateToken(user);
        return {
            ...token,
            isNewUser: true,
            onboardingStep: ONBOARDING_STEPS.SELECT_IDENTITY,
        };
    }

    // ─── 邮箱注册（保留给开发者/Web端） ───
    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('该邮箱已被注册');
        }

        const usernameExists = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (usernameExists) {
            throw new ConflictException('该用户名已被使用');
        }

        // 密码复杂度校验
        this.validatePasswordStrength(dto.password);

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                username: dto.username,
                passwordHash: hashedPassword,
                onboardingStep: ONBOARDING_STEPS.SELECT_IDENTITY,
            },
        });

        return this.generateToken(user);
    }

    // ─── 邮箱/手机 + 密码登录（保留） ───
    async login(dto: LoginDto) {
        let user = null;

        if (dto.email) {
            user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
        } else if (dto.phone) {
            user = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
        }

        if (!user) {
            throw new UnauthorizedException('账号或密码错误');
        }
        if (!user.passwordHash) {
            throw new UnauthorizedException('该账号未设置密码，请使用验证码登录');
        }

        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('账号或密码错误');
        }

        return this.generateToken(user);
    }

    // ─── 刷新 Token ───
    async refresh(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user) {
                throw new UnauthorizedException('用户不存在');
            }
            return this.generateToken(user);
        } catch (err: any) {
            this.logger.warn('refresh token 验证失败', err?.message);
            throw new UnauthorizedException('refresh token 无效或已过期');
        }
    }

    // ─── 内部：签发双 Token（含 jti） ───
    private async generateToken(user: { id: string; email?: string | null }) {
        const jti = crypto.randomUUID();
        const payload = {
            sub: user.id,
            email: user.email ?? '',
            jti,
        };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        });

        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email },
        };
    }

// ─── 登出 ───
    async logout(userId: string, accessToken?: string): Promise<{ ok: boolean }> {
        if (!accessToken) {
            return { ok: true };
        }
        try {
            const payload = this.jwtService.verify(accessToken, {
                secret: this.configService.get('JWT_SECRET'),
            }) as JwtPayload;
            if (payload.jti && payload.exp) {
                await this.tokenBlacklist.blacklist(payload.jti, payload.exp);
            }
        } catch {
            // token 已过期或无效，无须拉黑
        }
        return { ok: true };
    }

    // ─── 密码复杂度校验 ───
    private validatePasswordStrength(password: string): void {
        const errors: string[] = [];
        if (!/[A-Z]/.test(password)) errors.push('大写字母');
        if (!/[a-z]/.test(password)) errors.push('小写字母');
        if (!/[0-9]/.test(password)) errors.push('数字');
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('特殊字符');
        }
        if (errors.length > 0) {
            throw new BadRequestException(
                `密码需包含：${errors.join('、')}`,
            );
        }
    }

    // ─── 获取引导进度 ───
    async getOnboardingProgress(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                onboardingStep: true,
                identityType: true,
                username: true,
                avatar: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new UnauthorizedException('用户不存在');
        }
        return {
            onboardingStep: user.onboardingStep,
            identityType: user.identityType,
            username: user.username,
            avatar: user.avatar,
            createdAt: user.createdAt,
        };
    }

    // ─── 跳过引导 ───
    async skipOnboarding(userId: string) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: ONBOARDING_STEPS.COMPLETED },
            select: { onboardingStep: true },
        });
        return {
            onboardingStep: user.onboardingStep,
            message: '引导已跳过，你可以随时在设置中完善资料',
        };
    }

// ─── 引导流程中更新资料 ───
    async updateOnboardingProfile(
        userId: string,
        dto: { username: string; avatar?: string },
    ) {
        const existing = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existing && existing.id !== userId) {
            throw new ConflictException('该用户名已被使用');
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                username: dto.username,
                ...(dto.avatar !== undefined && { avatar: dto.avatar }),
            },
            select: {
                id: true,
                username: true,
                avatar: true,
                onboardingStep: true,
            },
        });

        return user;
    }

    async finishRegister(dto: RegisterFinishDto) {
        const payload = this.jwtService.verify<{ phone: string }>(dto.token);
        if (!payload?.phone) throw new UnauthorizedException('无效的临时令牌');

        const user = await this.prisma.user.create({
            data: {
                phone: payload.phone,
                username: dto.username,
                avatar: dto.avatar,
            },
        });

        const accessToken = this.jwtService.sign({ sub: user.id, role: 'user' });
        return { user, accessToken, onboardingStatus: 'PENDING' };
    }

}