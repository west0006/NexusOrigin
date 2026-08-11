// client/src/renderer/pages/ecosystem/Community.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { postAPI } from '../../api/post.api';
import { useUserStore } from '../../store/user.store';
import { showToast } from '../../components/Toast';
import { PostDetail } from './PostDetail';
import { CommentPanel } from './CommentPanel';
import { PostList } from './PostList';
import { CreatePostModal } from '../../components/CreatePostModal';
import { Post } from '@shared/types';
import type { Comment as AppComment } from '@shared/types';
import { C, countAllComments } from '../../utils/community';
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

    // ── Data fetching ────────────────────────────────────────

    const fetchPosts = useCallback(async (p = 1, s = searchText) => {
        setLoading(true);
        try {
            if (USE_MOCK) {
                const filtered = s
                    ? MOCK_POSTS.filter(pst =>
                        pst.title.includes(s) || pst.body.includes(s) || pst.tags?.some(t => t.includes(s)))
                    : MOCK_POSTS;
                const start = (p - 1) * PAGE_SIZE;
                await new Promise(r => setTimeout(r, 400));
                setPosts(filtered.slice(start, start + PAGE_SIZE));
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

    // ── Post actions ─────────────────────────────────────────

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
            } else {
                const detail = await postAPI.get(post.id);
                const comments = await postAPI.getComments(post.id);
                setSelectedPost({ ...detail, comments: comments as AppComment[], likedByMe: detail.likedByMe ?? false });
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

    const handleDelete = async (postId: string) => {
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setPosts(prev => prev.filter(p => p.id !== postId));
                showToast('删除成功', 'success');
            } else {
                await postAPI.delete(postId);
                showToast('删除成功', 'success');
                await fetchPosts(page);
            }
        } catch (err: any) {
            showToast(err.message || '删除失败', 'error');
        }
    };

    const handleToggleLike = useCallback(async (postId: string) => {
        if (!user) { showToast('请先登录', 'warning'); return; }
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                const flip = (p: Post) => p.id === postId
                    ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
                    : p;
                setSelectedPost(prev => prev ? flip(prev) : prev);
                setPosts(prev => prev.map(flip));
            } else {
                const result = await postAPI.likePost(postId);
                const update = (p: Post) => p.id === postId ? { ...p, likes: result.likes, likedByMe: result.liked } : p;
                setPosts(prev => prev.map(update));
                setSelectedPost(prev => prev ? update(prev) : prev);
            }
        } catch (err: any) {
            showToast(err.message || '操作失败', 'error');
        }
    }, [user]);

    // ── Comment actions ─────────────────────────────────────

    const handleSubmitComment = async () => {
        if (!selectedPost || !commentText.trim()) return;
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 300));
                setCommentText('');
                setReplyTarget(null);
                setShowCommentInput(false);
                showToast('评论成功（模拟）', 'success');
            } else {
                await postAPI.createComment(selectedPost.id, {
                    body: commentText,
                    parentId: replyTarget?.id || undefined,
                });
                setCommentText('');
                setReplyTarget(null);
                setShowCommentInput(false);
                const updatedPost = await postAPI.get(selectedPost.id);
                const comments = await postAPI.getComments(selectedPost.id);
                setSelectedPost({ ...updatedPost, comments: comments as AppComment[], likedByMe: updatedPost.likedByMe ?? false });
                setPosts(prev => prev.map(p =>
                    p.id === selectedPost.id ? { ...p, commentCount: countAllComments(comments) } : p));
                showToast('评论成功', 'success');
            }
        } catch (err: any) {
            showToast(err.message || '评论失败', 'error');
        }
    };

    const handleCommentLike = useCallback(async (commentId: string) => {
        if (!selectedPost || !user) { showToast('请先登录', 'warning'); return; }
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 200));
                setSelectedPost(prev => prev ? {
                    ...prev,
                    likedByMe: !prev.likedByMe,
                    likes: prev.likedByMe ? prev.likes - 1 : prev.likes + 1,
                } : prev);
            } else {
                const result = await postAPI.toggleCommentLike(selectedPost.id, commentId);
                const updateComments = (comments: AppComment[]): AppComment[] =>
                    comments.map(c => ({
                        ...c,
                        likes: c.id === commentId ? result.likes : c.likes,
                        liked: c.id === commentId ? result.liked : c.liked,
                        replies: c.replies ? updateComments(c.replies) : c.replies,
                    }));
                setSelectedPost(prev => prev ? { ...prev, comments: updateComments(prev.comments ?? []) } : prev);
            }
        } catch (err: any) {
            showToast(err.message || '操作失败', 'error');
        }
    }, [user, selectedPost]);

    const toggleCommentExpand = (commentId: string) => {
        setExpandedCommentIds(prev => {
            const next = new Set(prev);
            next.has(commentId) ? next.delete(commentId) : next.add(commentId);
            return next;
        });
    };

    const handleReply = (commentId: string, username?: string) => {
        setReplyTarget({ id: commentId, username });
        setShowCommentInput(true);
    };

    // ── Render ───────────────────────────────────────────────

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            overflow: 'hidden', background: C.bg,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}>
            <div style={{
                flex: 1, display: 'grid',
                gridTemplateColumns: isFocused ? '320px 1fr 380px' : '1fr',
                overflow: 'hidden', minHeight: 0,
            }}>
                {/* Left: Post list */}
                <PostList
                    posts={posts}
                    loading={loading}
                    total={total}
                    page={page}
                    pageSize={PAGE_SIZE}
                    searchText={searchText}
                    selectedPostId={selectedPost?.id ?? null}
                    isFocused={isFocused}
                    user={user}
                    onSearchTextChange={setSearchText}
                    onSearch={() => fetchPosts(1)}
                    onSelectPost={handleSelectPost}
                    onPageChange={fetchPosts}
                    onCreatePost={() => setShowCreateModal(true)}
                    onExitFocus={exitFocus}
                />

                {/* Center: Post detail */}
                {isFocused && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        flex: 1, minWidth: 0,
                    }}>
                        <div style={{
                            padding: '0 24px', borderBottom: `1px solid ${C.border}`,
                            height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT,
                            display: 'flex', alignItems: 'center',
                            background: C.cardBg, flexShrink: 0,
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>详情</span>
                            {user && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 8, border: 'none',
                                        background: C.primary, color: '#fff',
                                        fontWeight: 600, cursor: 'pointer',
                                        fontSize: 13, marginLeft: 'auto',
                                    }}
                                >＋ 发帖</button>
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

                {/* Right: Comment panel */}
                {isFocused && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        width: 360, minWidth: 360, background: C.bg,
                        borderLeft: `1px solid ${C.border}`,
                    }}>
                        <div style={{
                            padding: '0 16px', borderBottom: `1px solid ${C.border}`,
                            height: HEADER_HEIGHT, minHeight: HEADER_HEIGHT,
                            display: 'flex', alignItems: 'center',
                            background: C.cardBg, flexShrink: 0,
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
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: ${C.textLight}; }
            `}</style>
        </div>
    );
};
