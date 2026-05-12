// ── client/src/renderer/api/posts.ts
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
    author: { id: string; username: string; avatar?: string };
    createdAt: string;
    replies?: Comment[];
}

export const postAPI = {
    list: (page = 1, pageSize = 20) =>
        apiClient<{ posts: Post[]; total: number }>(`/posts?page=${page}&pageSize=${pageSize}`),
    get: (id: string) => apiClient<Post>(`/posts/${id}`),
    create: (data: { title: string; content: string; category: string; tags: string[] }) =>
        apiClient<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),
    addComment: (postId: string, content: string) =>
        apiClient<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
};