import { apiClient } from './client';

export interface Post {
    id: string;
    title: string;
    content: string;
    category: 'TUTORIAL' | 'QUESTION' | 'SHOWCASE' | 'DISCUSSION' | 'BUG';
    tags: string[];
    views: number;
    likes: number;
    author?: { id: string; username: string; avatar?: string };
    createdAt: string;
    updatedAt: string;
    comments?: Comment[];
}

export interface Comment {
    id: string;
    content: string;
    likes: number;
    liked?: boolean;
    author: { id: string; username: string; avatar?: string };
    createdAt: string;
    parentId?: string;
    replies?: Comment[];
    _count?: { commentLikes?: number; };
}

export const postAPI = {
    list: (page = 1, pageSize = 20, search?: string) =>
        apiClient<{ posts: Post[]; total: number }>(
            `/posts?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`
        ),
    get: (id: string) => apiClient<Post>(`/posts/${id}`),
    create: (data: { title: string; content: string; category: string; tags: string[] }) =>
        apiClient<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),
    addComment: (postId: string, content: string, parentId?: string) =>
        apiClient<Comment>(`/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content, parentId }),
        }),
    toggleLike: (postId: string, commentId: string) =>
        apiClient<{ liked: boolean }>(`/posts/${postId}/comments/${commentId}/like`, {
            method: 'PATCH',
        }),
};