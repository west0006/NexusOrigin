import { IsNotEmpty, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionDto {
    @ApiProperty({ description: 'API 基础地址', example: 'https://api.myai.com/v1' })
    @IsString()
    @IsNotEmpty()
    @IsUrl({ require_tld: false })
    baseURL!: string;

    @ApiProperty({ description: 'API 密钥', example: 'sk-xxxx' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(512)
    apiKey!: string;
}