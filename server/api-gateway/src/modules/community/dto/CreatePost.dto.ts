import {PostCategory} from "@prisma/client";
import {IsArray, IsEnum, IsNotEmpty, IsString} from "class-validator";

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsEnum(PostCategory)
    category!: PostCategory;

    @IsArray()
    @IsString({ each: true })
    tags!: string[];
}