import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EarningsQueryDto {
    @ApiPropertyOptional({ description: '开始日期 YYYY-MM-DD', example: '2026-01-01' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: '结束日期 YYYY-MM-DD', example: '2026-05-31' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ description: '分组维度：capability | month', example: 'capability' })
    @IsOptional()
    @IsString()
    groupBy?: 'capability' | 'month';
}