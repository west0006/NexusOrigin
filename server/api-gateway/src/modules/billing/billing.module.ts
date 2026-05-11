// ─── server/api-gateway/src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
    providers: [BillingService],
    controllers: [BillingController],
})
export class BillingModule {}