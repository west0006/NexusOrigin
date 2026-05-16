import { Module } from '@nestjs/common';
import { ModelGatewayController } from './model-gateway.controller';
import { ModelGatewayService } from './model-gateway.service';

@Module({
    controllers: [ModelGatewayController],
    providers: [ModelGatewayService],
})
export class ModelGatewayModule {}