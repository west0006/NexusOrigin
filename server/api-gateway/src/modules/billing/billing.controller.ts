// ─── server/api-gateway/src/modules/billing/billing.controller.ts
import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'))
export class BillingController {
    constructor(private billingService: BillingService) {}

    @Get('balance')
    getBalance(@Request() req: any) {
        return this.billingService.getUserBalance(req.user.userId);
    }

    @Get('transactions')
    getTransactions(@Request() req: any, @Query('page') page: string, @Query('pageSize') pageSize: string) {
        return this.billingService.getTransactionHistory(
            req.user.userId,
            Number(page) || 1,
            Number(pageSize) || 20
        );
    }
}