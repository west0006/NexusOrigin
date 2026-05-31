import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAgentDto {
    @ApiProperty({ description: 'Agent 名称', example: '水质分析助手' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ description: 'Agent 描述', example: '专业的水质分析 AI 助手' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description!: string;

    @ApiProperty({ description: 'Agent 端点 URL', example: 'https://my-agent.com/a2a' })
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    endpoint!: string;

    @ApiPropertyOptional({ description: '能力列表', example: ['text-generation', 'water-analysis'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    capabilities?: string[];
}