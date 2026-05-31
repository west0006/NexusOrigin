import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BudgetCheckResult {
    allowed: boolean;
    reason?: string;
    code?: 'BUDGET_EXCEEDED' | 'DAILY_LIMIT' | 'MONTHLY_LIMIT';
    remainingBudget?: number;
}

@Injectable()
export class BudgetService {
    constructor(private readonly prisma: PrismaService) {}

    async getBudgetConfig(userId: string) {
        let config = await this.prisma.budgetConfig.findUnique({
            where: { userId },
        });
        if (!config) {
            // 默认配置
            config = await this.prisma.budgetConfig.create({
                data: {
                    userId,
                    monthlyBudget: 100,        // 默认每月100美元
                    alertThreshold: 80,
                    actionOnExceed: 'block',
                    whitelistModels: [],
                },
            });
        }
        return config;
    }

    async setBudgetConfig(userId: string, monthlyBudget: number, alertThreshold?: number, actionOnExceed?: string, whitelistModels?: string[]) {
        return this.prisma.budgetConfig.upsert({
            where: { userId },
            update: {
                monthlyBudget,
                alertThreshold: alertThreshold ?? 80,
                actionOnExceed: actionOnExceed ?? 'block',
                whitelistModels: whitelistModels ?? [],
            },
            create: {
                userId,
                monthlyBudget,
                alertThreshold: alertThreshold ?? 80,
                actionOnExceed: actionOnExceed ?? 'block',
                whitelistModels: whitelistModels ?? [],
            },
        });
    }

    /**
     * 检查用户本月累计花费是否超预算
     * @param userId 用户ID
     * @param model 本次调用使用的模型（用于白名单检查）
     * @param additionalCost 本次调用预计增加的费用（可选，用于购买前检查）
     */
    async checkBudget(userId: string, model?: string, additionalCost: number = 0): Promise<BudgetCheckResult> {
        const config = await this.getBudgetConfig(userId);
        if (config.monthlyBudget <= 0) {
            return { allowed: true }; // 未设置预算，不限制
        }

        // 获取本月累计花费（tokenUsage + purchase）
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [tokenSum, purchaseSum] = await Promise.all([
            this.prisma.tokenUsage.aggregate({
                where: {
                    userId,
                    createdAt: { gte: startOfMonth },
                },
                _sum: { cost: true },
            }),
            this.prisma.purchase.aggregate({
                where: {
                    userId,
                    createdAt: { gte: startOfMonth },
                },
                _sum: { amount: true },
            }),
        ]);

        const totalSpent = (tokenSum._sum?.cost ?? 0) + (purchaseSum._sum?.amount ?? 0);
        const afterSpent = totalSpent + additionalCost;
        const remainingBudget = config.monthlyBudget - totalSpent;

        if (afterSpent > config.monthlyBudget) {
            // 预算超限，根据 actionOnExceed 决定
            if (config.actionOnExceed === 'warn') {
                return {
                    allowed: true,
                    reason: `预算即将用尽，剩余 ${remainingBudget.toFixed(2)} USD`,
                };
            } else if (config.actionOnExceed === 'whitelist' && model && config.whitelistModels.includes(model)) {
                return { allowed: true, reason: '白名单模型，允许调用' };
            } else {
                return {
                    allowed: false,
                    reason: `月度预算已超限（${config.monthlyBudget} USD），请联系管理员或调整预算`,
                    code: 'MONTHLY_LIMIT',
                    remainingBudget: -afterSpent,
                };
            }
        }

        // 检查是否超过告警阈值
        const usageRate = (afterSpent / config.monthlyBudget) * 100;
        if (usageRate >= config.alertThreshold) {
            return {
                allowed: true,
                reason: `预算使用已达 ${usageRate.toFixed(1)}%，请关注`,
            };
        }

        return { allowed: true, remainingBudget };
    }

    // 强制抛出异常版本（用于守卫或中间件）
    async assertBudget(userId: string, model?: string, additionalCost: number = 0): Promise<void> {
        const result = await this.checkBudget(userId, model, additionalCost);
        if (!result.allowed) {
            throw new BadRequestException(result.reason || '预算不足');
        }
    }
}