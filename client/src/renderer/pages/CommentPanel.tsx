// client/src/renderer/pages/CommentPanel.tsx
import React, { useEffect, useRef } from 'react';
import type { Comment as AppComment } from '@shared/types';
import { escapeHtml, C, COMMENT_MAX_LENGTH } from '../utils/community';

// 递归统计评论总数（用于显示回复数量）
function countAllComments(comments: AppComment[]): number {
    let count = 0;
    for (const c of comments) {
        count += 1;
        if (c.replies && c.replies.length) {
            count += countAllComments(c.replies);
        }
    }
    return count;
}

interface CommentPanelProps {
    comments: AppComment[];
    expandedCommentIds: Set<string>;
    showCommentInput: boolean;
    replyTarget: { id: string; username?: string } | null;
    commentText: string;
    onToggleExpand: (commentId: string) => void;
    onToggleLike: (commentId: string) => void;
    onReply: (id: string, username?: string) => void;
    onCommentTextChange: (text: string) => void;
    onSubmitComment: () => void;
    onShowInput: (show: boolean) => void;
    onCancelReply: () => void;
}

const XIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export const CommentPanel: React.FC<CommentPanelProps> = ({
                                                              comments,
                                                              expandedCommentIds,
                                                              showCommentInput,
                                                              replyTarget,
                                                              commentText,
                                                              onToggleExpand,
                                                              onToggleLike,
                                                              onReply,
                                                              onCommentTextChange,
                                                              onSubmitComment,
                                                              onShowInput,
                                                              onCancelReply,
                                                          }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (showCommentInput && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [showCommentInput]);

    // 在整棵评论树中根据 parentId 查找父评论的作者名
    const findParentAuthorName = (commentsList: AppComment[], targetId: string): string | null => {
        for (const c of commentsList) {
            if (c.id === targetId) return c.author?.username || null;
            if (c.replies) {
                const found = findParentAuthorName(c.replies, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    // 扁平化一个父评论下的所有后代评论
    interface FlatReply {
        comment: AppComment;
        replyToName: string | null;
    }
    const flattenReplies = (parentComment: AppComment): FlatReply[] => {
        const result: FlatReply[] = [];
        const traverse = (comment: AppComment, parentId: string) => {
            const parentName = findParentAuthorName(comments, parentId);
            result.push({ comment, replyToName: parentName });
            if (comment.replies && comment.replies.length) {
                for (const child of comment.replies) {
                    traverse(child, comment.id);
                }
            }
        };
        if (parentComment.replies) {
            for (const reply of parentComment.replies) {
                traverse(reply, parentComment.id);
            }
        }
        return result;
    };

    const renderComment = (comment: AppComment) => {
        const isExpanded = expandedCommentIds.has(comment.id);
        const hasReplies = !!(comment.replies && comment.replies.length);
        const replyCount = hasReplies ? countAllComments(comment.replies!) : 0;
        const flatReplies = hasReplies ? flattenReplies(comment) : [];

        const handleCardClick = () => {
            if (hasReplies) {
                onToggleExpand(comment.id);
            }
        };

        return (
            <div key={comment.id} style={{ marginBottom: 12 }}>
                <div
                    onClick={handleCardClick}
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        background: C.cardBg,
                        border: `1px solid ${C.border}`,
                        borderLeft: `1px solid ${C.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <img
                            src={comment.author?.avatar || 'data:image/svg+xml,' + encodeURIComponent(
                                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`
                            )}
                            alt=""
                            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>
                            {comment.author?.username || '匿名'}
                        </span>
                        <span style={{ fontSize: 11, color: C.textLight }}>
                            {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: C.text, marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                        {escapeHtml(comment.body)}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textLight, alignItems: 'center' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleLike(comment.id); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: comment.liked ? C.primary : C.textLight,
                                fontSize: 12, padding: 0,
                            }}
                        >
                            {comment.liked ? '❤' : '♡'} {comment.likes ?? 0}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onReply(comment.id, comment.author?.username); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: C.info, fontSize: 12, padding: 0,
                            }}
                        >
                            回复
                        </button>
                        {hasReplies && (
                            <span style={{ fontSize: 11, color: C.textLight }}>
                                {isExpanded ? '收起' : `${replyCount} 条回复 ▸`}
                            </span>
                        )}
                    </div>
                </div>

                {isExpanded && flatReplies.length > 0 && (
                    <div style={{ marginTop: 8, marginLeft: 20, paddingLeft: 12, borderLeft: `2px solid ${C.border}` }}>
                        {flatReplies.map(({ comment: reply, replyToName }) => (
                            <div
                                key={reply.id}
                                style={{
                                    padding: '8px 10px',
                                    marginBottom: 6,
                                    borderRadius: 6,
                                    background: 'transparent',
                                    border: 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                    <img
                                        src={reply.author?.avatar || 'data:image/svg+xml,' + encodeURIComponent(
                                            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>`
                                        )}
                                        alt=""
                                        style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                                        {reply.author?.username || '匿名'}
                                    </span>
                                    {replyToName && (
                                        <span style={{ fontSize: 11, color: C.textLight }}>
                                            @{replyToName}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 13, lineHeight: 1.5, color: C.text, marginBottom: 2, marginLeft: 22, whiteSpace: 'pre-wrap' }}>
                                    {escapeHtml(reply.body)}
                                </div>
                                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.textLight, alignItems: 'center', marginLeft: 22 }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleLike(reply.id); }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: reply.liked ? C.primary : C.textLight,
                                            fontSize: 11, padding: 0,
                                        }}
                                    >
                                        {reply.liked ? '❤' : '♡'} {reply.likes ?? 0}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReply(reply.id, reply.author?.username); }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: C.info, fontSize: 11, padding: 0,
                                        }}
                                    >
                                        回复
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {comments && comments.length > 0 ? (
                    comments.map((c) => renderComment(c))
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: C.textLight, fontSize: 14 }}>
                        暂无评论
                    </div>
                )}
            </div>

            <div>
                {showCommentInput ? (
                    <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.cardBg }}>
                        {replyTarget && (
                            <div style={{
                                fontSize: 12, color: C.primary, marginBottom: 6,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span>回复 @{replyTarget.username || '评论'}</span>
                                <button onClick={onCancelReply}
                                        style={{
                                            background: 'none', border: 'none', color: C.textLight,
                                            cursor: 'pointer', fontSize: 14, padding: 0,
                                        }}>
                                    <XIcon />
                                </button>
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            placeholder="写下你的评论..."
                            value={commentText}
                            onChange={(e) => onCommentTextChange(e.target.value)}
                            rows={3}
                            maxLength={COMMENT_MAX_LENGTH}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 8,
                                border: `1px solid ${C.border}`, background: C.bg,
                                color: C.text, fontSize: 13, outline: 'none',
                                resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <span style={{ fontSize: 11, color: C.textLight }}>
                                {commentText.length}/{COMMENT_MAX_LENGTH}
                            </span>
                            <button onClick={() => { onShowInput(false); onCancelReply(); }}
                                    style={{
                                        padding: '6px 14px', borderRadius: 8,
                                        border: `1px solid ${C.border}`, background: 'transparent',
                                        color: C.textLight, cursor: 'pointer', fontSize: 12,
                                    }}>
                                取消
                            </button>
                            <button onClick={onSubmitComment}
                                    style={{
                                        padding: '6px 18px', borderRadius: 8, border: 'none',
                                        background: C.primary, color: '#fff', fontWeight: 600,
                                        cursor: 'pointer', fontSize: 12,
                                    }}>
                                发送
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.cardBg }}>
                        <button onClick={() => onShowInput(true)}
                                style={{
                                    width: '100%', padding: '10px 16px', borderRadius: 8,
                                    border: `1px dashed ${C.border}`,
                                    background: C.bg, color: C.textLight,
                                    cursor: 'pointer', fontSize: 13, textAlign: 'left',
                                }}>
                            写下你的评论...
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};