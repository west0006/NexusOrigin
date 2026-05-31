// client/src/renderer/utils/community.ts
import { Comment } from '@shared/types';

/** 简单防XSS转义 */
export function escapeHtml(str: string): string {
    if (str == null) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** 递归统计评论总数（嵌套结构） */
export function countAllComments(comments: Comment[]): number {
    let count = 0;
    for (const c of comments) {
        count += 1;
        if (c.replies && c.replies.length > 0) {
            count += countAllComments(c.replies);
        }
    }
    return count;
}

/** 帖子分类常量 */
export const CATEGORY: Record<string, { label: string; color: string }> = {
    TUTORIAL: { label: '教程', color: '#6C5CE7' },
    QUESTION: { label: '问答', color: '#00B894' },
    SHOWCASE: { label: '成果展示', color: '#FDCB6E' },
    DISCUSSION: { label: '讨论', color: '#74B9FF' },
    BUG: { label: 'Bug', color: '#E17055' },
};

/** 帖子分类列表（用于表单选择器） */
export const CATEGORIES = Object.entries(CATEGORY).map(([value, { label }]) => ({ value, label }));

/** 枢元平台统一色彩与间距 Token */
export const C = {
    primary: '#6C5CE7',
    primaryHover: '#5A4BD1',
    primaryPressed: '#4A3DB5',
    primaryLight: 'rgba(108, 92, 231, 0.08)',
    bg: '#F8F9FA',
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    borderMuted: '#D8DEE4',
    text: '#1A202C',
    textSecondary: '#718096',
    textLight: '#A0AEC0',
    textInverse: '#FFFFFF',
    success: '#00B894',
    successBg: '#D1FAE5',
    warning: '#FDCB6E',
    warningBg: '#FFF3CD',
    error: '#E17055',
    errorBg: '#FEE2E2',
    info: '#74B9FF',
    infoBg: '#DBEAFE',
};

/** 评论输入最大长度 */
export const COMMENT_MAX_LENGTH = 5000;
/** 帖子标题最大长度 */
export const POST_TITLE_MAX_LENGTH = 200;
/** 帖子内容最大长度 */
export const POST_CONTENT_MAX_LENGTH = 10000;