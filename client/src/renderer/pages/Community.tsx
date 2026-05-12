// ── client/src/renderer/pages/Community.tsx (完整版)
import React, { useEffect, useState, useCallback } from 'react';
import { postAPI, Post } from '../api/posts';
import { useUserStore } from '../store/user.store';

export const Community: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'DISCUSSION', tags: '' });
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [commentText, setCommentText] = useState('');

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await postAPI.list(page, 20);
            setPosts(data.posts);
            setTotal(data.total);
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) return;
        try {
            await postAPI.create({ ...newPost, tags: newPost.tags.split(',').map(t=>t.trim()) });
            setShowForm(false);
            setNewPost({ title: '', content: '', category: 'DISCUSSION', tags: '' });
            fetchPosts();
        } catch (e: any) {
            if (e.message === '登录已过期，请重新登录') {
                alert('您的登录已过期，请重新登录');
                // 可选：手动调用 logout 并跳转认证页
                useUserStore.getState().logout();
                window.location.href = '/'; // 或 setRoute('auth')
            } else {
                alert('发帖失败：' + e.message);
            }
        }
    };

    const handlePostClick = async (postId: string) => {
        try {
            const post = await postAPI.get(postId);
            setSelectedPost(post);
        } catch (e: any) {
            if (e.message === '登录已过期，请重新登录') {
                alert('您的登录已过期，请重新登录');
                // 可选：手动调用 logout 并跳转认证页
                useUserStore.getState().logout();
                window.location.href = '/'; // 或 setRoute('auth')
            } else {
                alert('发帖失败：' + e.message);
            }
        }
    };

    const handleAddComment = async () => {
        if (!selectedPost || !commentText) return;
        try {
            await postAPI.addComment(selectedPost.id, commentText);
            setCommentText('');
            // 重新拉取详情以显示新评论
            const updatedPost = await postAPI.get(selectedPost.id);
            setSelectedPost(updatedPost);
        } catch(e) { alert('评论失败'); }
    };

    // 帖子详情视图
    if (selectedPost) {
        return (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <button className="button" onClick={() => setSelectedPost(null)} style={{ marginBottom: 16 }}>← 返回列表</button>
                <div className="card" style={{ padding: 24 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 }}>{selectedPost.title}</h1>
                    <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginBottom: 16 }}>
                        作者: {selectedPost.author?.username || '匿名'} · {new Date(selectedPost.createdAt).toLocaleDateString()} · 阅读 {selectedPost.views}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', marginBottom: 24 }}>{selectedPost.content}</div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                        <h3 style={{ marginBottom: 12 }}>评论 ({selectedPost.comments?.length || 0})</h3>
                        {selectedPost.comments?.map(c => (
                            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.author?.username || '匿名'}</div>
                                <div style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{c.content}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>{new Date(c.createdAt).toLocaleString()}</div>
                            </div>
                        ))}
                        {user && (
                            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                                <input className="input" style={{ flex: 1 }}
                                       placeholder="写下你的评论..."
                                       value={commentText}
                                       onChange={e => setCommentText(e.target.value)} />
                                <button className="button button-primary" onClick={handleAddComment}>评论</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 帖子列表视图
    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>社区</h2>
                {user && (
                    <button className="button button-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '取消' : '发布新帖'}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="card" style={{ padding: 16, marginBottom: 24 }}>
                    <input className="input" style={{ width: '100%', marginBottom: 12 }} placeholder="标题" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
                    <textarea className="input" style={{ width: '100%', minHeight: 100, marginBottom: 12 }} placeholder="内容" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} />
                    <select className="input" style={{ marginBottom: 12 }} value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                        <option value="DISCUSSION">讨论</option>
                        <option value="TUTORIAL">教程</option>
                        <option value="QUESTION">问答</option>
                        <option value="SHOWCASE">成果展示</option>
                    </select>
                    <input className="input" placeholder="标签 (逗号分隔)" value={newPost.tags} onChange={e => setNewPost({...newPost, tags: e.target.value})} />
                    <button className="button button-primary" onClick={handleCreatePost} style={{ marginTop: 12 }}>发布</button>
                </div>
            )}

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
                    {posts.length === 0 && <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>暂无帖子</div>}
                </div>
            )}

            {total > 20 && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button className="button" disabled={page===1} onClick={() => setPage(p => p-1)}>上一页</button>
                    <span style={{ lineHeight: '32px' }}>第 {page} 页</span>
                    <button className="button" disabled={page*20 >= total} onClick={() => setPage(p => p+1)}>下一页</button>
                </div>
            )}
        </div>
    );
};