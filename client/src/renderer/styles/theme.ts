// client/src/renderer/styles/theme.ts
/** 枢元平台统一色彩与间距 Token */
export const C = {
    // 品牌色
    primary: '#6C5CE7',
    primaryHover: '#5A4BD1',
    primaryPressed: '#4A3DB5',
    primaryLight: 'rgba(108, 92, 231, 0.08)',

    // 背景
    bg: '#F8F9FA',
    cardBg: '#FFFFFF',

    // 边框
    border: '#D1D5DB',
    borderMuted: '#D8DEE4',

    // 文字
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    textInverse: '#FFFFFF',

    // 语义色
    success: '#00B894',
    successBg: '#D1FAE5',
    warning: '#FDCB6E',
    warningBg: '#FFF3CD',
    error: '#E17055',
    errorBg: '#FEE2E2',
    info: '#74B9FF',
    infoBg: '#DBEAFE',

    // 字号（基于 4px 网格）
    textCaption: '11px',
    textBodySm: '13px',
    textBody: '15px',
    textSubhead: '18px',
    textTitle: '24px',

    // 圆角
    radiusSm: '6px',
    radiusMd: '8px',
    radiusLg: '12px',
} as const;

/** 动画 Token */
export const A = {
    duration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
    },
    easing: {
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
} as const;
