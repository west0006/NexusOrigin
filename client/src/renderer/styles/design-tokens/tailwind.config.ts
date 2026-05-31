// ═══════════════════════════════════════════════
//  枢纽 NexusOrigin Tailwind 配置
//  基于 design-tokens/colors.css
// ═══════════════════════════════════════════════

import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx,vue,svelte}'],
    darkMode: ['selector', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                nexus: {
                    primary:        '#6C5CE7',
                    'primary-hover': '#5A4BD6',
                    'primary-active':'#4A3DB5',
                    'primary-light': '#8B7CF0',
                    subtle:         '#F0EDFF',
                    'focus-glow':   'rgba(108, 92, 231, 0.4)',
                },
                surface: {
                    page:    '#F8F9FA',
                    card:    '#FFFFFF',
                    context: '#F9FAFB',
                    code:    '#1E1E1E',
                    overlay: 'rgba(0, 0, 0, 0.5)',
                },
                border: {
                    DEFAULT: '#E2E8F0',
                    light:   '#EDF2F7',
                    dark:    '#30363D',
                },
                text: {
                    primary:   '#1A202C',
                    secondary: '#718096',
                    disabled:  '#A0AEC0',
                    inverse:   '#FFFFFF',
                },
                semantic: {
                    success: '#00B894',
                    warning: '#FDCB6E',
                    error:   '#E17055',
                    info:    '#74B9FF',
                },
            },

            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    'sans-serif',
                ],
                mono: [
                    '"JetBrains Mono"',
                    '"Fira Code"',
                    '"Cascadia Code"',
                    'Consolas',
                    'monospace',
                ],
            },

            fontSize: {
                xs:    ['12px', '1.4'],
                sm:    ['13px', '1.4'],
                base:  ['14px', '1.5'],
                md:    ['16px', '1.4'],
                lg:    ['18px', '1.25'],
                xl:    ['24px', '1.25'],
            },

            spacing: {
                1:  '8px',
                2:  '12px',
                3:  '16px',
                4:  '24px',
                5:  '32px',
                6:  '48px',
            },

            borderRadius: {
                sm:   '6px',
                md:   '10px',
                lg:   '12px',
                pill: '20px',
                full: '9999px',
            },

            boxShadow: {
                card:     '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                modal:    '0 8px 30px rgba(0,0,0,0.12)',
                focus:    '0 0 0 3px rgba(108, 92, 231, 0.4)',
            },

            transitionDuration: {
                fast:   '150ms',
                normal: '200ms',
                slow:   '300ms',
            },

            transitionTimingFunction: {
                'ease-out':   'cubic-bezier(0, 0, 0.2, 1)',
                'ease-in':    'cubic-bezier(0.4, 0, 1, 1)',
                'ease-spring':'cubic-bezier(0.16, 1, 0.3, 1)',
            },

            maxWidth: {
                content: '720px',  // 正文最佳阅读宽度
            },

            keyframes: {
                'focus-breathe': {
                    '0%, 100%': { boxShadow: '0 0 0 0 var(--nexus-focus-glow)' },
                    '50%':      { boxShadow: '0 0 0 6px transparent' },
                },
                shimmer: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'slide-in-right': {
                    from: { transform: 'translateX(100%)' },
                    to:   { transform: 'translateX(0)' },
                },
                'slide-out-right': {
                    from: { transform: 'translateX(0)' },
                    to:   { transform: 'translateX(100%)' },
                },
            },

            animation: {
                'focus-breathe':  'focus-breathe 2s ease-out infinite',
                shimmer:          'shimmer 1.5s ease-in-out infinite',
                'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.16,1,0.3,1)',
                'slide-out-right':'slide-out-right 200ms ease-in',
            },
        },
    },
    plugins: [],
};

export default config;