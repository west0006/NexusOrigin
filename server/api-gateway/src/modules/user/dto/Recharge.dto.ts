import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RechargeDto {
    @ApiProperty({ description: '充值金额（美元）', example: 10 })
    @IsNumber()
    @Min(1)
    amount!: number;

    @ApiProperty({ description: '充值方式', example: 'alipay' })
    @IsString()
    @IsNotEmpty()
    method!: string;
}