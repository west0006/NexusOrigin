// client/src/shared/types/post.ts
import type { Comment } from './comment';
export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface Post {
    id: string;
    title: string;
    body: string;
    category: string;
    tags: string[];
    status: string;
    likes: number;
    likedByMe?: boolean;
    comments?: Comment[];
    views: number;
    commentCount: number;
    author: { id: string; username: string; avatar?: string };
    _count: { comments: number; postLikes: number };
    createdAt: string;
    updatedAt: string;
}

export interface PostListResponse {
    items: Post[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreatePostDto {
    title: string;
    body: string;
    category: string;
    tags?: string[];
}

export interface UpdatePostDto {
    title?: string;
    body?: string;
    category?: string;
    tags?: string[];
    status?: PostStatus;
}