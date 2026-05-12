import { Module } from '@nestjs/common';
import { A2AGatewayController } from './a2a-gateway.controller';
import { A2AGatewayService } from './a2a-gateway.service';

@Module({
    controllers: [A2AGatewayController],
    providers: [A2AGatewayService],
})
export class A2AGatewayModule {}