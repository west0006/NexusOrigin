// client/src/shared/types/auth.ts
export interface User {
    id: string;
    email?: string;
    username: string;
    avatar?: string;
    onboardingStep?: string;
    identityType?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    onboardingStep?: string;
}

export interface PhoneLoginResponse {
    isNewUser: boolean;
    nextStep?: string;
    registerToken?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: User;
    onboardingStep?: string;
}

export interface SendSmsDto {
    phone: string;
}

export interface PhoneLoginDto {
    phone: string;
    code: string;
}

export interface RegisterFinishDto {
    token: string;
    username: string;
    avatar?: string;
}

export interface SelectIdentityDto {
    identityType: 'USER' | 'DEVELOPER';
}

export interface RegisterDto {
    email: string;
    username: string;
    password: string;
}

export interface LoginDto {
    email: string;
    password: string;
}