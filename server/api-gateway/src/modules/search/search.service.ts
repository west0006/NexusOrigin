import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SearchResultItem {
    type: 'post' | 'capability' | 'agent' | 'setting';
    id: string;
    title: string;
    description: string;
    url: string;
    highlight?: string;
    metadata?: Record<string, any>;
}

export interface SearchResponse {
    items: SearchResultItem[];
    total: number;
    limit: number;
}

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(private readonly prisma: PrismaService) {}

    async search(q: string, limit: number = 10): Promise<SearchResponse> {
        if (!q || q.trim().length === 0) {
            return { items: [], total: 0, limit };
        }

        const results: SearchResultItem[] = [];

        // 并行搜索各模块
        const [posts, capabilities, agents, settings] = await Promise.all([
            this.searchPosts(q, limit),
            this.searchCapabilities(q, limit),
            this.searchAgents(q, limit),
            this.searchSettings(q, limit),
        ]);

        results.push(...posts, ...capabilities, ...agents, ...settings);

        // 限制总数量
        const limitedResults = results.slice(0, limit);
        return {
            items: limitedResults,
            total: results.length,
            limit,
        };
    }

    private async searchPosts(q: string, limit: number): Promise<SearchResultItem[]> {
        const posts = await this.prisma.post.findMany({
            where: {
                status: 'PUBLISHED',
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { body: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: limit,
            select: {
                id: true,
                title: true,
                body: true,
                createdAt: true,
            },
        });

        return posts.map((post) => ({
            type: 'post',
            id: post.id,
            title: post.title,
            description: post.body.slice(0, 150) + (post.body.length > 150 ? '...' : ''),
            url: `/community/post/${post.id}`,
            highlight: this.extractHighlight(post.body, q),
            metadata: { createdAt: post.createdAt },
        }));
    }

    private async searchCapabilities(q: string, limit: number): Promise<SearchResultItem[]> {
        const capabilities = await this.prisma.capability.findMany({
            where: {
                status: 'APPROVED',
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                priceType: true,
                downloads: true,
            },
        });

        return capabilities.map((cap) => ({
            type: 'capability',
            id: cap.id,
            title: cap.name,
            description: cap.description.slice(0, 150) + (cap.description.length > 150 ? '...' : ''),
            url: `/marketplace/capability/${cap.id}`,
            highlight: this.extractHighlight(cap.description, q),
            metadata: {
                price: cap.price,
                priceType: cap.priceType,
                downloads: cap.downloads,
            },
        }));
    }

    private async searchAgents(q: string, limit: number): Promise<SearchResultItem[]> {
        const agents = await this.prisma.agent.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                owner: { select: { username: true } },
            },
        });

        return agents.map((agent) => ({
            type: 'agent',
            id: agent.id,
            title: agent.name,
            description: agent.description.slice(0, 150) + (agent.description.length > 150 ? '...' : ''),
            url: `/agent/${agent.id}`,
            highlight: this.extractHighlight(agent.description, q),
            metadata: {
                status: agent.status,
                owner: agent.owner.username,
            },
        }));
    }

    /**
     * 搜索设置项（模型提供商名称、配置项等）
     * 注意：设置项属于用户私有数据，只能搜索当前用户自己的设置
     * 此方法仅返回通用的设置提示，实际用户设置搜索应在认证后单独处理
     */
    private async searchSettings(q: string, limit: number): Promise<SearchResultItem[]> {
        // 全局通用设置项关键词映射（不涉及用户数据）
        const commonSettings: SearchResultItem[] = [];

        const settingKeywords: Record<string, { title: string; description: string; url: string }> = {
            'api': { title: 'API 密钥管理', description: '管理各个模型网关的 API 密钥', url: '/settings/keys' },
            'key': { title: 'API 密钥管理', description: '管理各个模型网关的 API 密钥', url: '/settings/keys' },
            '密钥': { title: 'API 密钥管理', description: '管理各个模型网关的 API 密钥', url: '/settings/keys' },
            'gateway': { title: '模型网关', description: '配置默认网关和备用网关', url: '/settings/gateway' },
            '网关': { title: '模型网关', description: '配置默认网关和备用网关', url: '/settings/gateway' },
            '预算': { title: '预算设置', description: '设置月度预算和告警阈值', url: '/settings/budget' },
            'budget': { title: '预算设置', description: '设置月度预算和告警阈值', url: '/settings/budget' },
            '主题': { title: '外观设置', description: '切换浅色/深色主题', url: '/settings/appearance' },
            'theme': { title: '外观设置', description: '切换浅色/深色主题', url: '/settings/appearance' },
            '快捷键': { title: '快捷键设置', description: '自定义全局快捷键', url: '/settings/shortcuts' },
            'shortcut': { title: '快捷键设置', description: '自定义全局快捷键', url: '/settings/shortcuts' },
            '通知': { title: '通知设置', description: '配置桌面通知和消息提醒', url: '/settings/notifications' },
            'notification': { title: '通知设置', description: '配置桌面通知和消息提醒', url: '/settings/notifications' },
            '导出': { title: '数据管理', description: '导出个人数据或清理缓存', url: '/settings/data' },
            'export': { title: '数据管理', description: '导出个人数据或清理缓存', url: '/settings/data' },
        };

        const lowerQ = q.toLowerCase();
        for (const [keyword, setting] of Object.entries(settingKeywords)) {
            if (lowerQ.includes(keyword)) {
                commonSettings.push({
                    type: 'setting',
                    id: keyword,
                    title: setting.title,
                    description: setting.description,
                    url: setting.url,
                    highlight: setting.title,
                });
                if (commonSettings.length >= limit) break;
            }
        }

        return commonSettings;
    }

    private extractHighlight(text: string, query: string): string {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        if (index === -1) return text.slice(0, 100);
        const start = Math.max(0, index - 30);
        const end = Math.min(text.length, index + query.length + 30);
        let snippet = text.slice(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        return snippet;
    }

}