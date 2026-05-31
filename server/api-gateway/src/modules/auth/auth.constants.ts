/** 引导步骤枚举（与 Prisma OnboardingStep 对齐） */
export const ONBOARDING_STEPS = {
    PHONE_VERIFY: 'PHONE_VERIFY',
    SET_USERNAME: 'SET_USERNAME',
    SELECT_IDENTITY: 'SELECT_IDENTITY',
    COMPLETED: 'COMPLETED',
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];