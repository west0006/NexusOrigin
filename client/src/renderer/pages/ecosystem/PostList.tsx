// client/src/renderer/pages/ecosystem/PostList.tsx
import React from 'react';
import { Post } from '@shared/types';
import { C, CATEGORY, escapeHtml } from '../../utils/community';

interface PostListProps {
    posts: Post[];
    loading: boolean;
    total: number;
    page: number;
    pageSize: number;
    searchText: string;
    selectedPostId: string | null;
    isFocused: boolean;
    user: any;
    onSearchTextChange: (text: string) => void;
    onSearch: () => void;
    onSelectPost: (post: Post) => void;
    onPageChange: (page: number) => void;
    onCreatePost: () => void;
    onExitFocus: () => void;
}

const HEADER_HEIGHT = 44;

export const PostList: React.FC<PostListProps> = ({
    posts, loading, total, page, pageSize, searchText, selectedPostId,
    isFocused, user, onSearchTextChange, onSearch, onSelectPost,
    onPageChange, onCreatePost, onExitFocus,
}) => {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: C.bg,
            borderRight: isFocused ? `1px solid ${C.border}` : 'none',
        }}>
            {/* Search bar — only when not focused */}
            {!isFocused && (
                <div style={{
                    display: 'flex', alignItems: 'center', padding: '0 32px',
                    height: 52, minHeight: 52,
                    background: C.cardBg,
                    borderBottom: `1px solid ${C.border}`,
                    gap: 12, zIndex: 100, flexShrink: 0,
                }}>
                    <input
                        type="text"
                        placeholder="搜索帖子..."
                        value={searchText}
                        onChange={(e) => onSearchTextChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        style={{
                            width: 300, padding: '7px 14px', borderRadius: 8,
                            border: `1px solid ${C.border}`, background: C.bg,
                            color: C.text, fontSize: 14, outline: 'none',
                        }}
                    />
                    <button
                        onClick={onSearch}
                        style={{
                            padding: '7px 18px', borderRadius: 8, border: 'none',
                            background: C.primary, color: '#fff',
                            fontWeight: 600, cursor: 'pointer', fontSize: 13,
                        }}
                    >搜索</button>
                    {user && (
                        <button
                            onClick={onCreatePost}
                            style={{
                                padding: '7px 20px', borderRadius: 8, border: 'none',
                                background: C.primary, color: '#fff',
                                fontWeight: 600, cursor: 'pointer',
                                fontSize: 13, marginLeft: 'auto',
                            }}
                        >＋ 发帖</button>
                    )}
                </div>
            )}

            {/* Header row */}
            <div style={{
                padding: '0 16px', borderBottom: `1px solid ${C.border}`,
                height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: C.cardBg, flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>帖子列表</span>
                    <span style={{ fontSize: 12, color: C.textLight, marginLeft: 8 }}>({total})</span>
                </div>
                {isFocused && (
                    <button
                        onClick={onExitFocus}
                        style={{
                            padding: '6px 14px', borderRadius: 8,
                            border: `1px solid ${C.border}`, background: 'transparent',
                            color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                        }}
                    >← 返回列表</button>
                )}
            </div>

            {/* Post cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: C.textLight }}>加载中...</div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: C.textLight }}>暂无帖子</div>
                ) : (
                    <>
                        {posts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => onSelectPost(post)}
                                style={{
                                    padding: '14px 18px', borderRadius: 10,
                                    border: `1px solid ${selectedPostId === post.id ? C.primary : C.border}`,
                                    background: C.cardBg, marginBottom: 12,
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                                        fontSize: 11, fontWeight: 600,
                                        background: `${CATEGORY[post.category]?.color || C.textLight}15`,
                                        color: CATEGORY[post.category]?.color || C.textSecondary,
                                    }}>
                                        {CATEGORY[post.category]?.label || post.category}
                                    </span>
                                </div>
                                <h4 style={{
                                    margin: '0 0 4px', fontSize: 15, fontWeight: 600,
                                    color: C.text,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {escapeHtml(post.title)}
                                </h4>
                                <p style={{
                                    margin: '0 0 8px', fontSize: 13, color: C.textSecondary,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {escapeHtml(post.body)}
                                </p>
                                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.textLight }}>
                                    <span>👤 {post.author?.username || '匿名'}</span>
                                    <span>👁 {post.views}</span>
                                    <span>❤ {post.likes}</span>
                                    <span>💬 {post.commentCount ?? 0}</span>
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        {total > pageSize && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, paddingBottom: 20 }}>
                                <button
                                    disabled={page <= 1}
                                    onClick={() => onPageChange(page - 1)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 8,
                                        border: `1px solid ${C.border}`, background: C.cardBg,
                                        color: page <= 1 ? C.textLight : C.textSecondary,
                                        cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12,
                                    }}
                                >上一页</button>
                                <span style={{ padding: '6px 12px', fontSize: 13, color: C.textSecondary }}>
                                    {page} / {Math.ceil(total / pageSize)}
                                </span>
                                <button
                                    disabled={page >= Math.ceil(total / pageSize)}
                                    onClick={() => onPageChange(page + 1)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 8,
                                        border: `1px solid ${C.border}`, background: C.cardBg,
                                        color: page >= Math.ceil(total / pageSize) ? C.textLight : C.textSecondary,
                                        cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer', fontSize: 12,
                                    }}
                                >下一页</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
