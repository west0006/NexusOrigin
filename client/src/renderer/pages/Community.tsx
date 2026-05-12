// client/src/renderer/pages/Community.tsx (完整合并版)
import React, { useEffect, useState, useCallback } from 'react';
import { postAPI, Post, Comment } from '../api/posts';
import { useUserStore } from '../store/user.store';
import { FocusPanel } from '../components/FocusPanel';
import { FocusButton } from '../components/FocusButton';
import {showToast} from "@renderer/components/Toast";

interface ReplyTarget {
    id: string;
    username?: string;
}

export const Community: React.FC = () => {
    const user = useUserStore(s => s.user);

    // ---------- 帖子列表状态 ----------
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'DISCUSSION', tags: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');

    // ---------- 帖子详情状态 ----------
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [commentText, setCommentText] = useState('');
    const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

    // ---------- 聚焦状态 ----------
    const [focusCommentId, setFocusCommentId] = useState<string | null>(null);
    const [focusContext, setFocusContext] = useState<{
        parents: Comment[];
        target: Comment | null;
        children: Comment[];
    }>({ parents: [], target: null, children: [] });

    // ===================== 数据获取 =====================

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await postAPI.list(page, 20, search);
            setPosts(data.posts);
            setTotal(data.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // ===================== 帖子操作 =====================

    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) return;
        try {
            await postAPI.create({
                ...newPost,
                tags: newPost.tags.split(',').map(t => t.trim()),
            });
            setShowForm(false);
            setNewPost({ title: '', content: '', category: 'DISCUSSION', tags: '' });
            fetchPosts();
        } catch (e) {
            showToast('发帖失败');
        }
    };

    const handlePostClick = async (postId: string) => {
        try {
            const post = await postAPI.get(postId);
            setSelectedPost(post);
            setFocusCommentId(null); // 切换帖子时关闭聚焦
        } catch (e) {
            showToast('加载帖子详情失败');
        }
    };

    // ===================== 评论操作 =====================

    const handleAddComment = async (parentId?: string) => {
        if (!selectedPost || !commentText) return;
        try {
            await postAPI.addComment(selectedPost.id, commentText, parentId);
            setCommentText('');
            setReplyTarget(null);
            const updatedPost = await postAPI.get(selectedPost.id);
            setSelectedPost(updatedPost);
        } catch (e) {
            showToast('评论失败');
        }
    };

    const handleLike = async (commentId: string) => {
        if (!selectedPost) return;
        try {
            await postAPI.toggleLike(selectedPost.id, commentId);
            const updatedPost = await postAPI.get(selectedPost.id);
            setSelectedPost(updatedPost);
        } catch (e) {
            showToast('操作失败');
        }
    };

    // ===================== 聚焦辅助函数 =====================

    const findCommentById = (comments: Comment[], id: string): Comment | null => {
        for (const c of comments) {
            if (c.id === id) return c;
            if (c.replies) {
                const found = findCommentById(c.replies, id);
                if (found) return found;
            }
        }
        return null;
    };

    const buildFocusContext = (commentId: string) => {
        if (!selectedPost?.comments) return;
        const target = findCommentById(selectedPost.comments, commentId);
        if (!target) return;

        // 构建父级链 (仅支持一级父级，如有多级递归可扩展)
        const parents: Comment[] = [];
        if (target.parentId) {
            const parent = findCommentById(selectedPost.comments, target.parentId);
            if (parent) parents.push(parent);
        }

        setFocusCommentId(commentId);
        setFocusContext({
            parents,
            target,
            children: target.replies || [],
        });
    };

    // ===================== 渲染：评论树单个节点 =====================

    const renderCommentNode = (comment: Comment, depth: number = 0): React.ReactNode => (
        <div key={comment.id} style={{ position: 'relative', marginBottom: 12 }}>
            {/* 层级连接线 */}
            {depth > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        left: 8,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        backgroundColor: 'var(--color-border)',
                    }}
                />
            )}

            <div
                style={{
                    marginLeft: depth * 20,
                    paddingLeft: 16,
                    borderLeft: depth > 0 ? 'none' : '2px solid var(--color-border)',
                    backgroundColor: comment.id === focusCommentId ? '#F3F0FF' : 'transparent',
                    boxShadow: comment.id === focusCommentId ? '0 0 0 4px rgba(108,92,231,0.1)' : 'none',
                    borderRadius: 4,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{comment.author?.username}</strong>
                    <FocusButton onClick={() => buildFocusContext(comment.id)} title="聚焦此评论" />
                </div>
                <p style={{ margin: '6px 0', fontSize: 14 }}>{comment.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--color-ink-muted)' }}>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: comment.liked ? 'var(--color-primary)' : 'var(--color-ink-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                        onClick={() => handleLike(comment.id)}
                    >
                        ♥ {comment._count?.commentLikes || 0}
                    </button>
                    <button
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-primary)',
                            fontSize: 12,
                        }}
                        onClick={() => setReplyTarget({ id: comment.id, username: comment.author?.username })}
                    >
                        回复
                    </button>
                </div>

                {/* 内联回复输入框 */}
                {replyTarget?.id === comment.id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <input
                            className="input"
                            placeholder={`回复 ${replyTarget.username}`}
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button className="button button-primary" onClick={() => handleAddComment(comment.id)}>
                            回复
                        </button>
                        <button className="button" onClick={() => setReplyTarget(null)}>
                            取消
                        </button>
                    </div>
                )}
            </div>

            {/* 子回复 */}
            {comment.replies?.map(reply => renderCommentNode(reply, depth + 1))}
        </div>
    );

    // ===================== 帖子详情视图 =====================

    if (selectedPost) {
        return (
            <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
                {/* 左侧大纲栏 */}
                <aside
                    style={{
                        width: 240,
                        padding: 16,
                        borderRight: '1px solid var(--color-border)',
                        overflow: 'auto',
                        flexShrink: 0,
                    }}
                >
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{selectedPost.title}</h3>
                    <p style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 8 }}>
                        {selectedPost.author?.username} · {new Date(selectedPost.createdAt).toLocaleDateString()}
                    </p>
                    <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>👁 {selectedPost.views}</span>
                        <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginLeft: 12 }}>💬 {selectedPost.comments?.length || 0}</span>
                    </div>
                    <button className="button" onClick={() => { setSelectedPost(null); setFocusCommentId(null); }}>
                        ← 返回列表
                    </button>
                </aside>

                {/* 中间主回复流 */}
                <div style={{ flex: 1, overflow: 'auto', padding: 24, minWidth: 360 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>讨论</h2>
                    {selectedPost.comments?.length === 0 && (
                        <p style={{ color: 'var(--color-ink-muted)', textAlign: 'center', padding: 40 }}>
                            暂无回复，成为第一个参与讨论的人
                        </p>
                    )}
                    {selectedPost.comments?.map(comment => renderCommentNode(comment))}

                    {/* 新评论输入 */}
                    {user && (
                        <div style={{ marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <textarea
                  className="input"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  style={{ width: '100%', minHeight: 80, marginBottom: 8 }}
              />
                            <button className="button button-primary" onClick={() => handleAddComment()}>
                                提交评论
                            </button>
                        </div>
                    )}
                </div>

                {/* 右侧聚焦面板 */}
                <FocusPanel
                    visible={!!focusCommentId}
                    title="聚焦视图"
                    subtitle={focusContext.target?.author?.username}
                    onClose={() => setFocusCommentId(null)}
                >
                    {focusContext.parents.map(p => (
                        <div key={p.id} style={{ opacity: 0.8, marginBottom: 12, padding: 8, background: 'var(--color-surface-1)', borderRadius: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.author?.username}</div>
                            <div style={{ fontSize: 13 }}>{p.content}</div>
                        </div>
                    ))}
                    {focusContext.target && (
                        <div style={{
                            backgroundColor: '#F3F0FF',
                            padding: 12,
                            borderRadius: 6,
                            borderLeft: '3px solid var(--color-primary)',
                            marginBottom: 16,
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{focusContext.target.author?.username}</div>
                            <div>{focusContext.target.content}</div>
                        </div>
                    )}
                    {focusContext.children.map(child => (
                        <div key={child.id} style={{ marginTop: 8, paddingLeft: 16, borderLeft: '1px solid var(--color-border)', fontSize: 14, color: '#4B5563' }}>
                            <div style={{ fontWeight: 600 }}>{child.author?.username}</div>
                            <div>{child.content}</div>
                        </div>
                    ))}
                    {!focusContext.parents.length && !focusContext.target && !focusContext.children.length && (
                        <p style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>点击评论旁的准星图标以聚焦查看上下文</p>
                    )}
                </FocusPanel>
            </div>
        );
    }

    // ===================== 帖子列表视图 =====================

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>社区</h2>
                {user ? (
                    <button className="button button-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '取消' : '发布新帖'}
                    </button>
                ) : (
                    <button className="button" onClick={() => showToast('请先登录')}>登录后发帖</button>
                )}
            </div>

            {/* 搜索框 */}
            <div style={{ marginBottom: 16 }}>
                <input
                    className="input"
                    placeholder="搜索帖子..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    style={{ width: '100%' }}
                />
            </div>

            {/* 发帖表单 */}
            {showForm && (
                <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                    <input className="input" style={{ width: '100%', marginBottom: 12 }} placeholder="标题" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} />
                    <textarea className="input" style={{ width: '100%', minHeight: 100, marginBottom: 12 }} placeholder="内容" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} />
                    <select className="input" style={{ marginBottom: 12 }} value={newPost.category} onChange={e => setNewPost({ ...newPost, category: e.target.value })}>
                        <option value="DISCUSSION">讨论</option>
                        <option value="TUTORIAL">教程</option>
                        <option value="QUESTION">问答</option>
                        <option value="SHOWCASE">成果展示</option>
                    </select>
                    <input className="input" placeholder="标签 (逗号分隔)" value={newPost.tags} onChange={e => setNewPost({ ...newPost, tags: e.target.value })} />
                    <button className="button button-primary" onClick={handleCreatePost} style={{ marginTop: 12 }}>发布</button>
                </div>
            )}

            {/* 帖子卡片列表 */}
            {loading ? <div>加载中...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {posts.map(post => (
                        <div key={post.id} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => handlePostClick(post.id)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{post.title}</h3>
                                <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.content?.slice(0, 100)}...
                            </p>
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--color-ink-muted)' }}>
                                <span>👤 {post.author?.username || '匿名'}</span>
                                <span>❤️ {post.likes}</span>
                                <span>👁 {post.views}</span>
                                <span style={{ background: 'var(--color-surface-1)', padding: '0 6px', borderRadius: 'var(--radius-sm)' }}>{post.category}</span>
                            </div>
                        </div>
                    ))}
                    {posts.length === 0 && (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                            暂无帖子
                        </div>
                    )}
                </div>
            )}

            {/* 分页 */}
            {total > 20 && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button className="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</button>
                    <span style={{ lineHeight: '32px' }}>第 {page} 页</span>
                    <button className="button" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</button>
                </div>
            )}
        </div>
    );
};