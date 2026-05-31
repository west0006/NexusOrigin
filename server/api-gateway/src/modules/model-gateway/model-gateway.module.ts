// server/api-gateway/src/modules/model-gateway/model-gateway.module.ts
import { Module } from '@nestjs/common';
import { ModelGatewayController } from './model-gateway.controller';
import { ModelGatewayService } from './model-gateway.service';
import { ModelGatewayHelper } from './model-gateway-helper.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ModelGatewayController],
    providers: [ModelGatewayService, ModelGatewayHelper],
    exports: [ModelGatewayService],
})
export class ModelGatewayModule {}