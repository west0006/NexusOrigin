import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({ description: '旧密码', example: 'oldPassword123' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(128)
    oldPassword!: string;

    @ApiProperty({ description: '新密码', example: 'newPassword456' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(128)
    newPassword!: string;
}