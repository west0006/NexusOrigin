import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewCapabilityDto {
    @ApiProperty({ description: '是否审核通过', example: true })
    @IsBoolean()
    @IsNotEmpty()
    approved!: boolean;

    @ApiPropertyOptional({ description: '审核原因', example: '符合质量标准' })
    @IsOptional()
    @IsString()
    reason?: string;
}