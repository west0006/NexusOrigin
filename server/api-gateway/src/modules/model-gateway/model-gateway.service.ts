// server/api-gateway/src/modules/model-gateway/model-gateway.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt, decrypt } from '../../common/utils/encryption';
import {ModelGatewayHelper} from "./model-gateway-helper.service";

@Injectable()
export class ModelGatewayService {
    constructor(
        private prisma: PrismaService,
        private helper: ModelGatewayHelper,
    ) {}

    async getProviders(userId: string) {
        const providers = await this.prisma.userProvider.findMany({
            where: { userId },
            select: {
                id: true,
                providerName: true,
                apiKeyEncrypted: true,
                baseUrl: true,
                isDefault: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        // 返回时解密 API Key（前端仅展示预览，实际应只返回脱敏）
        return providers.map(p => ({
            ...p,
            apiKeyPreview: p.apiKeyEncrypted ? '••••••••' : null,
        }));
    }

    async getProviderById(id: string, userId: string) {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id, userId },
        });
        if (!provider) throw new NotFoundException('提供商不存在');
        return {
            id: provider.id,
            providerName: provider.providerName,
            apiKeyPreview: '••••••••',
            baseUrl: provider.baseUrl,
            isDefault: provider.isDefault,
            createdAt: provider.createdAt,
        };
    }

    async addCustomProvider(
        userId: string,
        providerName: string,
        apiKey: string,
        baseUrl?: string,
        isDefault = false,
    ) {
        const existing = await this.prisma.userProvider.findUnique({
            where: { userId_providerName: { userId, providerName } },
        });
        if (existing) {
            throw new BadRequestException('该模型提供商已添加');
        }

        const encryptedKey = encrypt(apiKey);

        if (isDefault) {
            await this.prisma.userProvider.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        return this.prisma.userProvider.create({
            data: {
                userId,
                providerName,
                apiKeyEncrypted: encryptedKey,
                baseUrl,
                isDefault,
            },
            select: {
                id: true,
                providerName: true,
                baseUrl: true,
                isDefault: true,
            },
        });
    }

    // 内部方法：获取解密后的 API Key（供实际调用模型时使用）
    async getDecryptedApiKey(providerId: string, userId: string): Promise<string> {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id: providerId, userId },
        });
        if (!provider) throw new NotFoundException('提供商不存在');
        return decrypt(provider.apiKeyEncrypted);
    }

    async setDefaultProvider(userId: string, providerId: string) {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id: providerId, userId },
        });
        if (!provider) throw new NotFoundException('模型提供商不存在');

        await this.prisma.userProvider.updateMany({
            where: { userId },
            data: { isDefault: false },
        });

        return this.prisma.userProvider.update({
            where: { id: providerId },
            data: { isDefault: true },
        });
    }

    async deleteProvider(userId: string, providerId: string) {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id: providerId, userId },
        });
        if (!provider) throw new NotFoundException('模型提供商不存在');

        return this.prisma.userProvider.delete({ where: { id: providerId } });
    }

    async testProviderConnection(userId: string, providerId: string) {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id: providerId, userId },
        });
        if (!provider) throw new NotFoundException('提供商不存在');

        const decryptedKey = decrypt(provider.apiKeyEncrypted);
        const result = await this.helper.testConnection(provider.baseUrl || '', decryptedKey);
        return result;
    }

    async getProviderModels(userId: string, providerId: string) {
        const provider = await this.prisma.userProvider.findFirst({
            where: { id: providerId, userId },
        });
        if (!provider) throw new NotFoundException('提供商不存在');

        const decryptedKey = decrypt(provider.apiKeyEncrypted);
        const models = await this.helper.fetchModels(provider.baseUrl || '', decryptedKey);
        return { models };
    }

    // 可选：测试未保存的连接（前端用于验证）
    async testConnectionWithCredentials(baseUrl: string, apiKey: string) {
        return this.helper.testConnection(baseUrl, apiKey);
    }
}