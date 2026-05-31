import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDefaultProviderDto {
    @ApiProperty({ description: '供应商 ID', example: 'uuid-of-provider' })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    providerId!: string;
}