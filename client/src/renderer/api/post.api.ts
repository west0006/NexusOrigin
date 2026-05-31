import { apiClient, apiPublic } from './client.api';
import type { Post, PostListResponse, CreatePostDto, UpdatePostDto } from '@shared/types';
import type { Comment, CreateCommentDto } from '@shared/types';

export const postAPI = {
    list: (params?: { page?: number; pageSize?: number; category?: string; status?: string; search?: string }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.pageSize) query.set('pageSize', String(params.pageSize));
        if (params?.category) query.set('category', params.category);
        if (params?.status) query.set('status', params.status);
        if (params?.search) query.set('search', params.search);
        return apiPublic<PostListResponse>(`/posts?${query.toString()}`);
    },

    get: (id: string) =>
        apiPublic<Post>(`/posts/${id}`),

    create: (data: CreatePostDto) =>
        apiClient<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: UpdatePostDto) =>
        apiClient<Post>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    delete: (id: string) =>
        apiClient<{ success: boolean }>(`/posts/${id}`, { method: 'DELETE' }),

    getComments: (postId: string) =>
        apiPublic<Comment[]>(`/posts/${postId}/comments`),

    createComment: (postId: string, data: CreateCommentDto) =>
        apiClient<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

    deleteComment: (postId: string, commentId: string) =>
        apiClient<{ success: boolean }>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),

    // 评论点赞
    toggleCommentLike: (postId: string, commentId: string) =>
        apiClient<{ liked: boolean; likes: number }>(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),

    // 帖子点赞
    likePost: (postId: string) =>
        apiClient<{ liked: boolean; likes: number }>(`/posts/${postId}/like`, { method: 'POST' }),
};