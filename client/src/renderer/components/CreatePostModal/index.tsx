// client/src/renderer/components/CreatePostModal/index.tsx
import React, { useState } from 'react';
import { postAPI } from '../../api/post.api';
import { useUserStore } from '../../store/user.store';
import { showToast } from '../Toast';
import { C, CATEGORIES, POST_TITLE_MAX_LENGTH, POST_CONTENT_MAX_LENGTH } from '../../utils/community';


interface CreatePostModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ visible, onClose, onSuccess }) => {
    const user = useUserStore((s) => s.user);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('DISCUSSION');
    const [tags, setTags] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!visible) return null;

    const handleSubmit = async () => {
        if (!user) { showToast('请先登录', 'warning'); return; }
        if (!title.trim()) { showToast('请输入标题', 'warning'); return; }
        if (!content.trim()) { showToast('请输入内容', 'warning'); return; }

        setSubmitting(true);
        try {
            const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            await postAPI.create({
                title: title.trim(),
                body: content.trim(),
                category,
                tags: tagList,
            });
            showToast('发帖成功 🎉', 'success');
            setTitle('');
            setContent('');
            setCategory('DISCUSSION');
            setTags('');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || '发帖失败', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
                zIndex: 1000,
                animation: 'fadeIn 0.15s ease',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: C.cardBg, borderRadius: 16,
                    padding: 28, width: 560, maxWidth: '90vw',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    animation: 'scaleIn 0.15s ease',
                }}
            >
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 }}>
                    发布帖子
                </div>

                {/* 标题 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4, display: 'block' }}>
                        标题
                    </label>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="输入帖子标题"
                        maxLength={200}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            border: `1px solid ${C.border}`, background: C.bg,
                            color: C.text, fontSize: 14, outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* 分类 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4, display: 'block' }}>
                        分类
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setCategory(cat.value)}
                                style={{
                                    padding: '4px 16px', borderRadius: 20,
                                    border: `1px solid ${category === cat.value ? C.primary : C.border}`,
                                    background: category === cat.value ? `${C.primary}10` : 'transparent',
                                    color: category === cat.value ? C.primary : C.textSecondary,
                                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 内容 */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4, display: 'block' }}>
                        内容
                    </label>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="分享你的想法..."
                        rows={8}
                        maxLength={10000}
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            border: `1px solid ${C.border}`, background: C.bg,
                            color: C.text, fontSize: 14, outline: 'none', resize: 'vertical',
                            fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                        }}
                    />
                    <div style={{ textAlign: 'right', fontSize: 11, color: C.textLight, marginTop: 2 }}>
                        {content.length}/10000
                    </div>
                </div>

                {/* 标签 */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 13, color: C.textSecondary, marginBottom: 4, display: 'block' }}>
                        标签（逗号分隔）
                    </label>
                    <input
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="例如：agent, api, 教程"
                        style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            border: `1px solid ${C.border}`, background: C.bg,
                            color: C.text, fontSize: 14, outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={onClose} style={{
                        padding: '8px 20px', borderRadius: 8,
                        border: `1px solid ${C.border}`, background: 'transparent',
                        color: C.text, cursor: 'pointer', fontSize: 14,
                    }}>
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        style={{
                            padding: '8px 20px', borderRadius: 8,
                            border: 'none', background: C.primary,
                            color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: 14, fontWeight: 600, opacity: submitting ? 0.7 : 1,
                        }}
                    >
                        {submitting ? '发布中...' : '发布'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};