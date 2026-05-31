// server/api-gateway/src/modules/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BudgetService } from './budget.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BillingController],
    providers: [BillingService, BudgetService],
    exports: [BillingService, BudgetService],
})
export class BillingModule {}