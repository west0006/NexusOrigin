// server/api-gateway/src/modules/billing/billing.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingService {
    constructor(private prisma: PrismaService) {}

    async getUserBalance(userId: string): Promise<{
        credits: number;
        totalRecharged: number;
        totalSpent: number;
    }> {
        const rechargeAgg = await this.prisma.rechargeLog.aggregate({
            where: { userId, status: 'completed' },
            _sum: { amount: true },
        });
        const totalRecharged = rechargeAgg._sum?.amount ?? 0;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true },
        });

        const usageAgg = await this.prisma.tokenUsage.aggregate({
            where: { userId },
            _sum: { cost: true },
        });
        const totalSpentUsd = usageAgg._sum?.cost ?? 0;

        const purchaseAgg = await this.prisma.purchase.aggregate({
            where: { userId },
            _sum: { amount: true },
        });
        const totalPurchased = purchaseAgg._sum?.amount ?? 0;

        return {
            credits: user?.credits ?? 0,
            totalRecharged,
            totalSpent: totalSpentUsd + totalPurchased,
        };
    }

    async getTransactionHistory(userId: string, page = 1, pageSize = 20) {
        const [recharges, purchases, totalRecharges, totalPurchases] = await Promise.all([
            this.prisma.rechargeLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.purchase.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.rechargeLog.count({ where: { userId } }),
            this.prisma.purchase.count({ where: { userId } }),
        ]);

        const items = [
            ...recharges.map((r) => ({
                id: r.id,
                type: 'recharge' as const,
                amount: r.amount,
                status: r.status,
                method: r.method,
                tradeNo: r.tradeNo,
                createdAt: r.createdAt,
            })),
            ...purchases.map((p) => ({
                id: p.id,
                type: 'purchase' as const,
                amount: p.amount,
                status: 'completed' as const,
                method: 'capability' as const,
                tradeNo: null,
                createdAt: p.createdAt,
            })),
        ];

        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return {
            items,
            total: totalRecharges + totalPurchases,
            page,
            pageSize,
        };
    }
}