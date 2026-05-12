import {Injectable, NotFoundException} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

interface CreateCapabilityDto {
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
    protocol: 'mcp-tool' | 'a2a-service' | 'openclaw-native';
    framework: string;
    manifest: any;
    packageUrl?: string;
    sourceCode?: string;
}

@Injectable()
export class CapabilityService {
    constructor(private prisma: PrismaService) {}

    async list(page = 1, pageSize = 20, search?: string, protocol?: string) {
        const where: any = { status: 'APPROVED' };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } },
            ];
        }
        if (protocol) where.protocol = protocol;

        const [items, total] = await Promise.all([
            this.prisma.capability.findMany({
                skip: (page - 1) * pageSize,
                take: pageSize,
                where,
                orderBy: { downloads: 'desc' },
                include: { author: { select: { id: true, username: true } } },
            }),
            this.prisma.capability.count({ where }),
        ]);
        return { items, total };
    }

    async create(dto: CreateCapabilityDto, authorId: string) {
        return this.prisma.capability.create({
            data: {
                ...dto,
                authorId,
                status: 'PENDING',
                manifest: dto.manifest,
            },
        });
    }

    async install(capabilityId: string, userId: string) {
        const cap = await this.prisma.capability.findUnique({ where: { id: capabilityId } });
        if (!cap || cap.status !== 'APPROVED') throw new Error('Capability not available');

        await this.prisma.capability.update({
            where: { id: capabilityId },
            data: { downloads: { increment: 1 } },
        });

        if (cap.price > 0) {
            await this.prisma.purchase.create({
                data: { userId, skillId: capabilityId, amount: cap.price },
            });
        }
        return cap;
    }

    // 审核相关
    async review(capabilityId: string, approved: boolean, reason?: string) {
        return this.prisma.capability.update({
            where: { id: capabilityId },
            data: { status: approved ? 'APPROVED' : 'REJECTED' },
        });
    }

    async getEnvAssessment(id: string) {
        const cap = await this.prisma.capability.findUnique({ where: { id } });
        if (!cap) throw new NotFoundException('Capability not found');

        // 1. 获取本地真实环境
        let localEnv: any = {};
        try {
            const { data } = await axios.get('http://localhost:8082/api/v1/deploy/env');
            localEnv = data;
        } catch (e) {
            return {
                id: cap.id,
                name: cap.name,
                compatible: false,
                error: '无法获取本地环境信息，请确认枢元部署服务已启动',
            };
        }

        // 2. 解析 manifest 中的依赖
        const manifest = cap.manifest as Record<string, any> | null;
        const requiredPython = manifest?.requires_python || '>=3.8';
        const deps: string[] = manifest?.dependencies || [];

        // 3. 简单兼容性判断（真实项目可解析 pip list 或 npm list）
        const pythonOk = localEnv.pythonVersion && localEnv.pythonVersion >= requiredPython.replace('>=', '');
        const nodeOk = localEnv.nodeVersion;
        const missingDeps = deps.filter((dep: string) => {
            // 目前仅演示，实际需查询本地包列表
            return true; // 标记所有声明的依赖为待检查
        });

        return {
            id: cap.id,
            name: cap.name,
            compatible: pythonOk && nodeOk,
            pythonVersion: localEnv.pythonVersion || '未检测到',
            nodeVersion: localEnv.nodeVersion || '未检测到',
            requiredPython,
            missingDeps: deps.length > 0 ? deps : ['无额外依赖'],
            permissions: manifest?.permissions || ['network'],
            warnings: pythonOk ? [] : ['本地Python版本不满足要求'],
        };
    }
}