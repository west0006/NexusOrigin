import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSkillDto {
    @ApiProperty({ description: '技能名称', example: '水质分析专家' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ description: '技能描述', example: '专业的水质分析 AI 技能' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description!: string;
}