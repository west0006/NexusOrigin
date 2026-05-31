// client/src/shared/types/user.ts
export interface UserProfile {
    id: string;
    email?: string;
    username: string;
    avatar?: string;
    bio?: string;
    credits: number;
    reputation: number;
    creatorLevel: number;
    createdAt: string;
}

export interface UpdateProfileDto {
    username?: string;
    bio?: string;
    avatar?: string;
}

export interface ChangePasswordDto {
    oldPassword: string;
    newPassword: string;
}

export interface RechargeDto {
    amount: number;
    method: string;
}

export interface CreditsResponse {
    credits: number;
}