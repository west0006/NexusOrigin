// client/src/shared/types/modelGateway.ts
export interface UserProvider {
    id: string;
    providerName: string;
    apiKeyPreview?: string;  // 前端展示用，仅显示脱敏值
    baseUrl?: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface AddProviderDto {
    providerName: string;
    apiKey: string;
    baseUrl?: string;
    isDefault?: boolean;
}