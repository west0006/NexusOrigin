// client/src/shared/types/skill.ts
export interface Skill {
    id: string;
    name: string;
    description: string;
    version: string;
    price: number;
    source: string;
    status: string;
    rating: number;
    downloads: number;
    manifest: any;
    owner: { id: string; username: string; avatar?: string };
    createdAt: string;
    updatedAt: string;
    priceType: string;
}

export interface SkillListResponse {
    items: Skill[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateSkillDto {
    name: string;
    description: string;
}