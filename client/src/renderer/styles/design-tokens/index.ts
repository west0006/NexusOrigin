// ═══════════════════════════════════════════════
//  枢纽 NexusOrigin 设计令牌统一导出
//  用法:
//    import { tokens, colors, spacing, typography, animation } from '@/design-tokens';
// ═══════════════════════════════════════════════

export const tokens = {
    brand: {
        primary: '#6C5CE7',
        primaryHover: '#5A4BD6',
        primaryActive: '#4A3DB5',
        primaryLight: '#8B7CF0',
        primarySubtle: '#F0EDFF',
        focusGlow: 'rgba(108, 92, 231, 0.4)',
    },

    light: {
        bgPage: '#F8F9FA',
        bgCard: '#FFFFFF',
        bgContext: '#F9FAFB',
        bgCode: '#1E1E1E',
        border: '#E2E8F0',
        borderLight: '#EDF2F7',
        textPrimary: '#1A202C',
        textSecondary: '#718096',
        textDisabled: '#A0AEC0',
    },

    dark: {
        bgPage: '#0D1117',
        bgCard: '#161B22',
        bgContext: '#1C2128',
        bgCode: '#0D1117',
        border: '#30363D',
        borderLight: '#21262D',
        textPrimary: '#E6EDF3',
        textSecondary: '#8B949E',
        textDisabled: '#484F58',
    },

    semantic: {
        success: '#00B894',
        successBg: '#E6F9F4',
        warning: '#FDCB6E',
        warningBg: '#FFF9E6',
        error: '#E17055',
        errorBg: '#FEF0ED',
        info: '#74B9FF',
        infoBg: '#E8F4FD',
    },

    radius: {
        sm: 6,
        md: 10,
        lg: 12,
        pill: 20,
        full: 9999,
    },

    space: {
        1: 8,
        2: 12,
        3: 16,
        4: 24,
        5: 32,
        6: 48,
    },

    shadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        modal: '0 8px 30px rgba(0,0,0,0.12)',
        focus: '0 0 0 3px rgba(108, 92, 231, 0.4)',
    },
} as const;

export const typography = {
    fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontMono: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
    size: {
        xs:   '12px',
        sm:   '13px',
        base: '14px',
        md:   '16px',
        lg:   '18px',
        xl:   '24px',
    },
    leading: {
        tight:   1.25,
        normal:  1.4,
        relaxed: 1.5,
    },
    maxContentWidth: '720px',
} as const;

export const animation = {
    duration: {
        fast:   '150ms',
        normal: '200ms',
        slow:   '300ms',
    },
    easing: {
        out:    'cubic-bezier(0, 0, 0.2, 1)',
        in:     'cubic-bezier(0.4, 0, 1, 1)',
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
} as const;

// 方便的颜色别名（兼容旧代码习惯）
export const colors = tokens.brand;
export const spacing = tokens.space;