// server/api-gateway/src/modules/community/dto/CreatePost.dto.ts
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PostStatusEnum {
    PUBLISHED = 'PUBLISHED',
    DRAFT = 'DRAFT',
    ARCHIVED = 'ARCHIVED',
}

// 分类枚举
export enum PostCategoryEnum {
    TUTORIAL = 'TUTORIAL',
    QUESTION = 'QUESTION',
    SHOWCASE = 'SHOWCASE',
    DISCUSSION = 'DISCUSSION',
    BUG = 'BUG',
}

export class CreatePostDto {
    @ApiProperty({ description: '帖子标题', example: '我的经验分享' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title!: string;

    @ApiProperty({ description: '帖子正文', example: '今天来分享一下心得...' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50000)
    body!: string;

    @ApiPropertyOptional({ enum: PostStatusEnum, description: '发布状态，默认为 PUBLISHED' })
    @IsOptional()
    @IsEnum(PostStatusEnum)
    status?: PostStatusEnum;

    @ApiPropertyOptional({ enum: PostCategoryEnum, description: '帖子分类', example: 'DISCUSSION' })
    @IsOptional()
    @IsEnum(PostCategoryEnum)
    category?: PostCategoryEnum;

    @ApiPropertyOptional({ description: '标签列表', example: ['AI', 'Agent'], type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(20, { each: true })
    tags?: string[];
}