import {
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsOptional,
    IsEmail,
    IsPhoneNumber,
    IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
    @ApiProperty({ description: '手机号', example: '13800138000' })
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('CN')
    phone!: string;
}

export class PhoneLoginDto {
    @ApiProperty({ description: '手机号', example: '13800138000' })
    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('CN')
    phone!: string;

    @ApiProperty({ description: '验证码', example: '123456' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(6)
    code!: string;
}

export class RegisterFinishDto {
    @ApiProperty({ description: '注册临时 token' })
    @IsString()
    @IsNotEmpty()
    token!: string;

    @ApiProperty({ description: '用户名', example: 'shrimpMaster' })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    username!: string;

    @ApiPropertyOptional({ description: '头像 URL' })
    @IsOptional()
    @IsString()
    avatar?: string;
}

export class SelectIdentityDto {
    @ApiProperty({ description: '身份类型', example: 'DEVELOPER' })
    @IsString()
    @IsNotEmpty()
    @IsIn(['USER', 'DEVELOPER'])
    identityType!: string;
}

export class SkipOnboardingDto {
    @ApiProperty({ description: '跳过原因（可选）', example: '已有账号，暂不完善' })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class WechatLoginDto {
    @ApiProperty({ description: '微信授权 code' })
    @IsString()
    @IsNotEmpty()
    code!: string;
}

export class RegisterDto {
    @ApiProperty({ description: '邮箱', example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ description: '密码', example: 'StrongPass123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(128)
    password!: string;

    @ApiProperty({ description: '用户名', example: 'newUser' })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    username!: string;
}

export class LoginDto {
    @ApiPropertyOptional({ description: '邮箱', example: 'user@example.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
    @IsOptional()
    @IsPhoneNumber('CN')
    phone?: string;

    @ApiProperty({ description: '密码', example: 'password123' })
    @IsString()
    @IsNotEmpty()
    password!: string;
}

