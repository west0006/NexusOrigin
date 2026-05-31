// ─── server/api-gateway/src/modules/a2a-gateway/a2a-gateway.module.ts
import { Module } from '@nestjs/common';
import { A2AGatewayController } from './a2a-gateway.controller';
import { A2AGatewayService } from './a2a-gateway.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [A2AGatewayController],
    providers: [A2AGatewayService],
    exports: [A2AGatewayService],
})
export class A2AGatewayModule {}