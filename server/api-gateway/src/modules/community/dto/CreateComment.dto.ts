// server/api-gateway/src/modules/community/dto/CreateComment.dto.ts
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
    @ApiProperty({ description: '评论内容', example: '写得很好！' })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(5000)
    content!: string;

    @ApiPropertyOptional({
        description: '父评论 ID（用于回复）',
        example: 'uuid-of-parent-comment',
    })
    @IsOptional()
    @IsString()
    parentId?: string;
}