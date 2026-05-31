import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PriceType {
    FREE = 'FREE',
    ONE_TIME = 'ONE_TIME',
    SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum ProtocolType {
    MCP_TOOL = 'mcp-tool',
    A2A_SERVICE = 'a2a-service',
    OPENCLAW_NATIVE = 'openclaw-native',
}

export class CreateCapabilityDto {
    @ApiProperty({ description: '能力名称', example: '水质分析' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    name!: string;

    @ApiProperty({ description: '能力描述', example: '分析水质参数并提供优化建议' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description!: string;

    @ApiProperty({ description: '版本号', example: '1.0.0' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    version!: string;

    @ApiProperty({ description: '价格', example: 0 })
    @IsNumber()
    @Min(0)
    @Max(999999)
    price!: number;

    @ApiProperty({ enum: PriceType, description: '价格类型', example: PriceType.FREE })
    @IsEnum(PriceType)
    priceType!: PriceType;

    @ApiProperty({ enum: ProtocolType, description: '协议类型', example: ProtocolType.A2A_SERVICE })
    @IsEnum(ProtocolType)
    protocol!: ProtocolType;

    @ApiProperty({ description: '框架', example: 'nodejs' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    framework!: string;

    @ApiProperty({ description: 'Manifest 配置（JSON）' })
    @IsNotEmpty()
    manifest!: Record<string, any>;

    @ApiPropertyOptional({ description: '包下载地址', example: 'https://example.com/package.tar.gz' })
    @IsOptional()
    @IsString()
    @IsUrl()
    packageUrl?: string;

    @ApiPropertyOptional({ description: '源代码', example: 'console.log("hello")' })
    @IsOptional()
    @IsString()
    sourceCode?: string;

    @ApiPropertyOptional({ description: '标签列表', example: ['water', 'analysis'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    tags?: string[];
}