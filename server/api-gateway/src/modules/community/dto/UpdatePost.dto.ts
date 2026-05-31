// server/api-gateway/src/modules/community/dto/UpdatePost.dto.ts
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Prisma 生成的枚举
enum PostStatus {
    PUBLISHED = 'PUBLISHED',
    DRAFT = 'DRAFT',
    ARCHIVED = 'ARCHIVED',
}

export class UpdatePostDto {
    @ApiPropertyOptional({ description: '帖子标题', example: '更新后的标题' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional({ description: '帖子正文', example: '更新后的内容' })
    @IsOptional()
    @IsString()
    @MaxLength(50000)
    body?: string;

    @ApiPropertyOptional({ enum: PostStatus, description: '发布状态' })
    @IsOptional()
    @IsEnum(PostStatus)
    status?: PostStatus;
}