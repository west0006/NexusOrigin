import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class BillingController {
    constructor(private billingService: BillingService) {}

    @Get('balance')
    async getBalance(@Request() req: any) {
        return this.billingService.getUserBalance(req.user.userId);
    }

    @Get('transactions')
    @ApiQuery({ name: 'page', required: false, example: '1' })
    @ApiQuery({ name: 'pageSize', required: false, example: '20' })
    async getTransactions(
        @Request() req: any,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.billingService.getTransactionHistory(
            req.user.userId,
            Number(page) || 1,
            Number(pageSize) || 20,
        );
    }
}