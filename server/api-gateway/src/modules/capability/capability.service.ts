// server/api-gateway/src/modules/capability/capability.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapabilityDto } from './dto/CreateCapability.dto';
import { BudgetService } from '../billing/budget.service';

@Injectable()
export class CapabilityService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly budgetService: BudgetService,
    ) {}

    async list(page: number, pageSize: number, sort?: string, search?: string) {
        const orderBy: any = sort === 'downloads'
            ? { downloads: 'desc' }
            : { createdAt: 'desc' };

        const where: any = { status: 'APPROVED' };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total] = await Promise.all([
            this.prisma.capability.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy,
                include: {
                    owner: { select: { id: true, username: true, avatar: true } },
                },
            }),
            this.prisma.capability.count({ where }),
        ]);

        return { items, total, page, pageSize };
    }

    async getById(id: string) {
        const cap = await this.prisma.capability.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, username: true, avatar: true } },
            },
        });
        if (!cap) throw new NotFoundException('能力不存在');
        return cap;
    }

    async create(dto: CreateCapabilityDto, userId: string) {
        return this.prisma.capability.create({
            data: {
                name: dto.name,
                description: dto.description,
                version: dto.version || '1.0.0',
                price: dto.price ?? 0,
                priceType: dto.priceType ?? 'FREE',
                protocol: dto.protocol ?? 'mcp-tool',
                framework: dto.framework ?? '',
                packageUrl: dto.packageUrl,
                manifest: (dto.manifest as any) ?? {},
                source: dto.sourceCode ?? 'built-in',
                ownerId: userId,
                status: 'PENDING',
            },
            include: {
                owner: { select: { id: true, username: true, avatar: true } },
            },
        });
    }

    async purchase(id: string, userId: string) {
        const capability = await this.prisma.capability.findUnique({ where: { id } });
        if (!capability) throw new NotFoundException('能力不存在');

        const existing = await this.prisma.purchase.findFirst({
            where: { userId, capabilityId: id },
        });
        if (existing) throw new BadRequestException('已购买过该能力');

        if (capability.price > 0 && capability.priceType !== 'FREE') {
            // 预算检查
            await this.budgetService.assertBudget(userId, undefined, capability.price);

            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.credits < capability.price) {
                throw new BadRequestException('信用点余额不足');
            }

            await this.prisma.user.update({
                where: { id: userId },
                data: { credits: { decrement: capability.price } },
            });
        }

        return this.prisma.purchase.create({
            data: { userId, capabilityId: id, amount: capability.price },
        });
    }

    async getInstallGuide(id: string) {
        const capability = await this.prisma.capability.findUnique({ where: { id } });
        if (!capability) throw new NotFoundException('能力不存在');

        return {
            name: capability.name,
            version: capability.version,
            framework: capability.framework,
            installSteps: [
                `1. 确保已安装 ${capability.framework || '所需'} 运行时`,
                `2. 下载能力包: ${capability.packageUrl || '无需下载'}`,
                `3. 解压并运行安装脚本`,
                `4. 重启服务以加载新能力`,
            ],
            manifest: capability.manifest,
        };
    }

    async getDeveloperEarnings(userId: string, startDate?: string, endDate?: string, groupBy?: 'capability' | 'month') {
        const where: any = {
            capability: { ownerId: userId },
        };
        if (startDate) {
            where.createdAt = { gte: new Date(startDate) };
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt = { ...where.createdAt, lte: end };
        }

        if (groupBy === 'capability') {
            const result = await this.prisma.purchase.groupBy({
                by: ['capabilityId'],
                where,
                _sum: { amount: true },
                _count: { id: true },
            });
            const capabilityIds = result.map(r => r.capabilityId);
            const capabilities = await this.prisma.capability.findMany({
                where: { id: { in: capabilityIds } },
                select: { id: true, name: true, price: true, priceType: true, createdAt: true },
            });
            const map = new Map(capabilities.map(c => [c.id, c]));
            const items = result.map(r => ({
                capabilityId: r.capabilityId,
                capabilityName: map.get(r.capabilityId)?.name || 'Unknown',
                totalSales: r._sum.amount ?? 0,
                platformFee: (r._sum.amount ?? 0) * 0.2,   // 假设抽成20%
                netEarnings: (r._sum.amount ?? 0) * 0.8,
                purchaseCount: r._count.id,
            }));
            return { items, total: items.reduce((s, i) => s + i.totalSales, 0) };
        } else if (groupBy === 'month') {
            const purchases = await this.prisma.purchase.findMany({
                where,
                select: { amount: true, createdAt: true },
            });
            const monthly = new Map<string, { total: number; count: number }>();
            for (const p of purchases) {
                const monthKey = p.createdAt.toISOString().slice(0, 7);
                const existing = monthly.get(monthKey) || { total: 0, count: 0 };
                existing.total += p.amount;
                existing.count += 1;
                monthly.set(monthKey, existing);
            }
            const items = Array.from(monthly.entries()).map(([month, data]) => ({
                month,
                totalSales: data.total,
                platformFee: data.total * 0.2,
                netEarnings: data.total * 0.8,
                purchaseCount: data.count,
            })).sort((a, b) => a.month.localeCompare(b.month));
            return { items, total: items.reduce((s, i) => s + i.totalSales, 0) };
        } else {
            // 汇总
            const result = await this.prisma.purchase.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true },
            });
            const totalSales = result._sum.amount ?? 0;
            return {
                totalSales,
                platformFee: totalSales * 0.2,
                netEarnings: totalSales * 0.8,
                purchaseCount: result._count.id,
            };
        }
    }
}