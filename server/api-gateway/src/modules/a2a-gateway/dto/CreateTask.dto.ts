// server/api-gateway/src/modules/a2a-gateway/dto/CreateTask.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
    @ApiProperty({ description: '目标 Agent ID（可选，若为空则广播竞标）', required: false })
    @IsOptional()
    @IsString()
    @IsUUID()
    agentId?: string;

    @ApiPropertyOptional({ description: '任务标题', example: '数据分析任务' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiProperty({ description: '任务描述', example: '帮我分析这份数据并生成报告' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    description!: string;

    @ApiPropertyOptional({ description: '预算上限', example: 50 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    budget?: number;

    @ApiPropertyOptional({ description: '截止日期', example: '2026-06-01' })
    @IsOptional()
    @IsString()
    deadline?: string;
}