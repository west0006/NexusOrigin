import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
    @ApiPropertyOptional({ description: '搜索关键词', example: '数据分析' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    q?: string;

    @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
    @IsOptional()
    limit?: number;
}