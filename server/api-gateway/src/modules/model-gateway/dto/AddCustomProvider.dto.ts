import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCustomProviderDto {
    @ApiProperty({ description: '供应商名称', example: 'My AI Provider' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ description: 'API 基础地址', example: 'https://api.myai.com/v1' })
    @IsString()
    @IsNotEmpty()
    baseURL!: string;

    @ApiProperty({ description: 'API 密钥', example: 'sk-xxxx' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(512)
    apiKey!: string;
}