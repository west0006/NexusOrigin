// client/src/shared/types/capability.ts
export type PriceType = 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
export type ProtocolType = 'mcp-tool' | 'a2a-service' | 'openclaw-native';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Capability {
    id: string;
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: PriceType;
    protocol: ProtocolType;
    source: string;
    status: ReviewStatus;
    downloads: number;
    rating: number;
    manifest: any;
    owner: { id: string; username: string; avatar?: string };
    createdAt: string;
    updatedAt: string;
}

export interface CapabilityListResponse {
    items: Capability[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateCapabilityDto {
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: PriceType;
    protocol: ProtocolType;
    manifest: Record<string, any>;
    packageUrl?: string;
    sourceCode?: string;
}

export interface InstallGuide {
    framework: string;
    steps: string[];
}