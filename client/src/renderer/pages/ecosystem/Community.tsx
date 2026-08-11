// client/src/renderer/pages/Community.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { postAPI } from '../../api/post.api';
import { useUserStore } from '../../store/user.store';
import { showToast } from '../../components/Toast';
import { PostDetail } from './PostDetail';
import { CommentPanel } from './CommentPanel';
import { CreatePostModal } from '../../components/CreatePostModal';
import { Post } from '@shared/types';
import type { Comment as AppComment } from '@shared/types';
import { C, CATEGORY, escapeHtml, countAllComments } from '../../utils/community';
import { MOCK_POSTS } from '../../data/mockPosts';
import { USE_MOCK } from '../../config/env';

const PAGE_SIZE = 10;
const HEADER_HEIGHT = 44;

export const Community: React.FC = () => {
    const user = useUserStore((s) => s.user);

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const [commentText, setCommentText] = useState('');
    const [replyTarget, setReplyTarget] = useState<{ id: string; username?: string } | null>(null);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());

    const fetchPosts = useCallback(async (p = 1, s = searchText) => {
        setLoading(true);
        try {
            if (USE_MOCK) {
                // 模拟分页
                const filtered = s
                    ? MOCK_POSTS.filter(pst =>
                        pst.title.includes(s) || pst.body.includes(s) || pst.tags?.some(t => t.includes(s))
                    )
                    : MOCK_POSTS;
                const start = (p - 1) * PAGE_SIZE;
                const items = filtered.slice(start, start + PAGE_SIZE);
                // 模拟网络延迟
                await new Promise(r => setTimeout(r, 400));
                setPosts(items);
                setTotal(filtered.length);
                setPage(p);
            } else {
                const res = await postAPI.list({ page: p, pageSize: PAGE_SIZE, search: s || undefined });
                setPosts(res.items);
                setTotal(res.total);
                setPage(res.page);
            }
        } catch (err: any) {
            showToast(err.message || '加载帖子失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [searchText]);

    useEffect(() => { fetchPosts(1).catch(() => {}); }, [fetchPosts]);

    const handleSearch = () => {
        fetchPosts(1);
    };

    const handleSelectPost = async (post: Post) => {
        setReplyTarget(null);
        setCommentText('');
        setExpandedCommentIds(new Set());
        setShowCommentInput(false);
        setIsFocused(true);
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setSelectedPost({ ...post, comments: [], likedByMe: post.likedByMe ?? false });
            }else{
                const detail = await postAPI.get(post.id);
                const comments = await postAPI.getComments(post.id);
                setSelectedPost({
                    ...detail,
                    comments: comments as AppComment[],
                    likedByMe: detail.likedByMe ?? false,
                });
            }

        } catch (err: any) {
            showToast(err.message || '加载帖子详情失败', 'error');
        }
    };

    const exitFocus = () => {
        setIsFocused(false);
        setSelectedPost(null);
        setExpandedCommentIds(new Set());
        setShowCommentInput(false);
        setReplyTarget(null);
        setCommentText('');
    };

    // 仅切换评论展开/收起
    const toggleCommentExpand = (commentId: string) => {
        setExpandedCommentIds(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    const handleDelete = async (postId: string) => {
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setPosts(prev => prev.filter(p => p.id !== postId));
                showToast('删除成功', 'success');
            }else{
                await postAPI.delete(postId);
                showToast('删除成功', 'success');
                await fetchPosts(page);
            }
        } catch (err: any) {
            showToast(err.message || '删除失败', 'error');
        }
    };

    //评论
    const handleSubmitComment = async () => {
        if (!selectedPost || !commentText.trim()) return;
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 300));
                setCommentText('');
                setReplyTarget(null);
                setShowCommentInput(false);
                showToast('评论成功（模拟）', 'success');
            }else{
                await postAPI.createComment(selectedPost.id, {
                    body: commentText,
                    parentId: replyTarget?.id || undefined,
                });
                setCommentText('');
                setReplyTarget(null);
                setShowCommentInput(false);
                const updatedPost = await postAPI.get(selectedPost.id);
                const comments = await postAPI.getComments(selectedPost.id);
                setSelectedPost({
                    ...updatedPost,
                    comments: comments as AppComment[],
                    likedByMe: updatedPost.likedByMe ?? false,
                });
                const totalComments = countAllComments(comments);
                setPosts(prev => prev.map(p =>
                    p.id === selectedPost.id ? { ...p, commentCount: totalComments } : p
                ));
                showToast('评论成功', 'success');
            }
        } catch (err: any) {
            showToast(err.message || '评论失败', 'error');
        }
    };
    // 评论点赞
    const handleCommentLike = useCallback(async (commentId: string) => {
        if (!selectedPost) return;
        if (!user) { showToast('请先登录', 'warning'); return; }
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setSelectedPost(prev => prev && prev.id === commentId
                    ? { ...prev, likedByMe: !prev.likedByMe, likes: prev.likedByMe ? prev.likes - 1 : prev.likes + 1 }
                    : prev
                );
                setPosts(prev => prev.map(p =>
                    p.id === commentId
                        ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
                        : p
                ));
            }else{
                const result = await postAPI.toggleCommentLike(selectedPost.id, commentId);
                const updateComments = (comments: AppComment[]): AppComment[] =>
                    comments.map(c => ({
                        ...c,
                        likes: c.id === commentId ? result.likes : c.likes,
                        liked: c.id === commentId ? result.liked : c.liked,
                        replies: c.replies ? updateComments(c.replies) : c.replies,
                    }));
                setSelectedPost(prev => prev ? {
                    ...prev,
                    comments: updateComments(prev.comments ?? []),
                } : prev);
            }

        } catch (err: any) {
            showToast(err.message || '操作失败', 'error');
        }
    }, [user, selectedPost]);

    // 帖子点赞
    const handleToggleLike = useCallback(async (postId: string) => {
        if (!user) { showToast('请先登录', 'warning'); return; }
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setSelectedPost(prev => prev && prev.id === postId
                    ? { ...prev, likedByMe: !prev.likedByMe, likes: prev.likedByMe ? prev.likes - 1 : prev.likes + 1 }
                    : prev
                );
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
                        : p
                ));
            }else{
                const result = await postAPI.likePost(postId);
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? { ...p, likes: result.likes, likedByMe: result.liked }
                        : p
                ));
                setSelectedPost(prev => prev && prev.id === postId
                    ? { ...prev, likes: result.likes, likedByMe: result.liked }
                    : prev
                );
            }

        } catch (err: any) {
            showToast(err.message || '操作失败', 'error');
        }
    }, [user]);

    const handleReply = (commentId: string, username?: string) => {
        setReplyTarget({ id: commentId, username });
        setShowCommentInput(true);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                background: C.bg,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
        >
            {!isFocused && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 32px',
                    height: 52,
                    minHeight: 52,
                    background: C.cardBg,
                    borderBottom: `1px solid ${C.border}`,
                    gap: 12,
                    zIndex: 100,
                    flexShrink: 0,
                }}>
                    <input
                        type="text"
                        placeholder="搜索帖子..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{
                            width: 300,
                            padding: '7px 14px',
                            borderRadius: 8,
                            border: `1px solid ${C.border}`,
                            background: C.bg,
                            color: C.text,
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={handleSearch}
                        style={{
                            padding: '7px 18px',
                            borderRadius: 8,
                            border: 'none',
                            background: C.primary,
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        搜索
                    </button>
                    {user && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                padding: '7px 20px',
                                borderRadius: 8,
                                border: 'none',
                                background: C.primary,
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 13,
                                marginLeft: 'auto',
                            }}
                        >
                            ＋ 发帖
                        </button>
                    )}
                </div>
            )}

            <div
                style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: isFocused ? '320px 1fr 380px' : '1fr',
                    overflow: 'hidden',
                    minHeight: 0,
                }}
            >
                {/* 左栏：帖子列表 */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        background: C.bg,
                        borderRight: isFocused ? `1px solid ${C.border}` : 'none',
                    }}
                >
                    <div style={{
                        padding: '0 16px',
                        borderBottom: `1px solid ${C.border}`,
                        height: HEADER_HEIGHT,
                        minHeight: HEADER_HEIGHT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: C.cardBg,
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>帖子列表</span>
                            <span style={{ fontSize: 12, color: C.textLight, marginLeft: 8 }}>({total})</span>
                        </div>
                        {isFocused && (
                            <button
                                onClick={exitFocus}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    border: `1px solid ${C.border}`,
                                    background: 'transparent',
                                    color: C.textSecondary,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                ← 返回列表
                            </button>
                        )}
                    </div>

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
                                        onClick={() => handleSelectPost(post)}
                                        style={{
                                            padding: '14px 18px',
                                            borderRadius: 10,
                                            border: `1px solid ${selectedPost?.id === post.id ? C.primary : C.border}`,
                                            background: C.cardBg,
                                            marginBottom: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
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
                                            color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                                {total > PAGE_SIZE && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, paddingBottom: 20 }}>
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => fetchPosts(page - 1)}
                                            style={{
                                                padding: '6px 14px', borderRadius: 8,
                                                border: `1px solid ${C.border}`, background: C.cardBg,
                                                color: page <= 1 ? C.textLight : C.textSecondary,
                                                cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12,
                                            }}
                                        >
                                            上一页
                                        </button>
                                        <span style={{ padding: '6px 12px', fontSize: 13, color: C.textSecondary }}>
                                            {page} / {Math.ceil(total / PAGE_SIZE)}
                                        </span>
                                        <button
                                            disabled={page >= Math.ceil(total / PAGE_SIZE)}
                                            onClick={() => fetchPosts(page + 1)}
                                            style={{
                                                padding: '6px 14px', borderRadius: 8,
                                                border: `1px solid ${C.border}`, background: C.cardBg,
                                                color: page >= Math.ceil(total / PAGE_SIZE) ? C.textLight : C.textSecondary,
                                                cursor: page >= Math.ceil(total / PAGE_SIZE) ? 'not-allowed' : 'pointer', fontSize: 12,
                                            }}
                                        >
                                            下一页
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* 中栏：帖子详情 */}
                {isFocused && (
                    <div
                        style={{
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden', flex: 1, minWidth: 0,
                            transition: 'opacity 0.2s ease, transform 0.25s ease',
                            animation: 'slideIn 0.25s ease',
                        }}
                    >
                        <div style={{
                            padding: '0 24px',
                            borderBottom: `1px solid ${C.border}`,
                            height: HEADER_HEIGHT,
                            minHeight: HEADER_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            background: C.cardBg,
                            flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>详情</span>
                            {user && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: C.primary,
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        marginLeft: 'auto',
                                    }}
                                >
                                    ＋ 发帖
                                </button>
                            )}
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                            {selectedPost ? (
                                <PostDetail
                                    key={selectedPost.id}
                                    post={selectedPost}
                                    onLike={handleToggleLike}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: 80, color: C.textLight }}>加载中...</div>
                            )}
                        </div>
                    </div>
                )}

                {/* 右栏：评论面板 */}
                {isFocused && (
                    <div
                        style={{
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden', width: 360, minWidth: 360,
                            background: C.bg,
                            borderLeft: `1px solid ${C.border}`,
                            transition: 'opacity 0.2s ease, transform 0.25s ease',
                            animation: 'slideIn 0.25s ease',
                        }}
                    >
                        <div style={{
                            padding: '0 16px',
                            borderBottom: `1px solid ${C.border}`,
                            height: HEADER_HEIGHT,
                            minHeight: HEADER_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            background: C.cardBg,
                            flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>评论</span>
                            <span style={{ fontSize: 12, color: C.textLight, marginLeft: 8 }}>
                                ({countAllComments(selectedPost?.comments || [])})
                            </span>
                        </div>

                        {selectedPost && (
                            <CommentPanel
                                comments={selectedPost.comments || []}
                                expandedCommentIds={expandedCommentIds}
                                showCommentInput={showCommentInput}
                                replyTarget={replyTarget}
                                commentText={commentText}
                                onToggleExpand={toggleCommentExpand}
                                onToggleLike={handleCommentLike}
                                onReply={handleReply}
                                onCommentTextChange={setCommentText}
                                onSubmitComment={handleSubmitComment}
                                onShowInput={setShowCommentInput}
                                onCancelReply={() => { setReplyTarget(null); setCommentText(''); }}
                            />
                        )}
                    </div>
                )}
            </div>

            <CreatePostModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => fetchPosts(1)}
            />

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: ${C.textLight}; }
            `}</style>
        </div>
    );
};