// client/src/renderer/pages/PostDetail.tsx
import React from 'react';
import { Post } from '@shared/types';
import { useUserStore } from '../store/user.store';
import { showToast } from '../components/Toast';
import { escapeHtml, CATEGORY, C } from '../utils/community';

/* ─── 线框 SVG 图标 ─── */
const EyeIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const HeartIcon: React.FC<{ filled?: boolean }> = ({ filled }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
);

const CommentIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
);

const BookmarkIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
);

const ShareIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

interface PostDetailProps {
    post: Post;
    onLike: (postId: string) => Promise<void>;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, onLike }) => {
    const user = useUserStore((s) => s.user);
    const [liking, setLiking] = React.useState(false);

    const handleLike = async () => {
        if (!user) { showToast('请先登录', 'warning'); return; }
        if (liking) return;
        setLiking(true);
        try {
            await onLike(post.id);
        } catch {
            // 错误已在父组件处理
        } finally {
            setLiking(false);
        }
    };

    const handleShare = () => {
        const postUrl = `${window.location.origin}/post/${post.id}`;
        if (navigator.share) {
            navigator.share({ title: post.title, text: post.body, url: postUrl });
        } else {
            navigator.clipboard.writeText(postUrl).then(() => {
                showToast('链接已复制', 'success');
            });
        }
    };

    return (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: 12 }}>
                <span style={{
                    display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 600,
                    background: `${CATEGORY[post.category]?.color || C.textLight}15`,
                    color: CATEGORY[post.category]?.color || C.textSecondary,
                }}>
                    {CATEGORY[post.category]?.label || post.category}
                </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: '0 0 12px', lineHeight: 1.3 }}>
                {escapeHtml(post.title)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img
                    src={post.author?.avatar || 'data:image/svg+xml,' + encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`
                    )}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{post.author?.username || '匿名'}</span>
                <span style={{ fontSize: 12, color: C.textLight }}>{new Date(post.createdAt).toLocaleString('zh-CN')}</span>
                <span style={{ fontSize: 12, color: C.textLight }}>· 更新于 {new Date(post.updatedAt).toLocaleString('zh-CN')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: C.textLight, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <EyeIcon /> {post.views} 次浏览
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <HeartIcon filled={false} /> {post.likes} 个赞
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <CommentIcon /> {post.commentCount ?? 0} 条评论
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleLike} disabled={liking} style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1px solid ${post.likedByMe ? C.primary : C.border}`,
                        background: post.likedByMe ? `${C.primary}10` : 'transparent',
                        color: post.likedByMe ? C.primary : C.textSecondary,
                        cursor: liking ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        transition: 'all 0.15s',
                    }}>
                        <HeartIcon filled={!!post.likedByMe} /> {post.likes}
                    </button>
                    <button onClick={() => showToast('收藏功能即将上线')} style={{
                        padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.border}`,
                        background: 'transparent', color: C.textSecondary, cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                        <BookmarkIcon /> 收藏
                    </button>
                    <button onClick={handleShare} style={{
                        padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.border}`,
                        background: 'transparent', color: C.textSecondary, cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                        <ShareIcon /> 分享
                    </button>
                </div>
            </div>
            {post.tags && post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {post.tags.map(tag => (
                        <span key={tag} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, background: C.bg, color: C.textSecondary }}>#{escapeHtml(tag)}</span>
                    ))}
                </div>
            )}
            <div style={{ padding: 24, background: C.cardBg, borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 15, lineHeight: 1.8, color: C.text, whiteSpace: 'pre-wrap' }}>
                {escapeHtml(post.body)}
            </div>
        </div>
    );
};