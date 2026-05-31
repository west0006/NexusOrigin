import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: '用户名', example: 'newUsername' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string;

    @ApiPropertyOptional({ description: '个人简介', example: '养虾爱好者' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;

    @ApiPropertyOptional({ description: '头像 URL', example: 'https://example.com/avatar.png' })
    @IsOptional()
    @IsString()
    avatar?: string;
}