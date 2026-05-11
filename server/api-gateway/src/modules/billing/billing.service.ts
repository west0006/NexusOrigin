// ─── server/api-gateway/src/modules/billing/billing.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
    constructor(private prisma: PrismaService) {}

    async getUserBalance(userId: string): Promise<number> {
        // 计算用户充值 - 消费后的余额，此处简化为0
        return 0;
    }

    async getTransactionHistory(userId: string, page = 1, pageSize = 20) {
        return this.prisma.purchase.findMany({
            where: { userId },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        });
    }
}