// client/src/shared/types/comment.ts
export interface Comment {
    id: string;
    body: string;
    likes: number;
    liked?: boolean;
    author: { id: string; username: string; avatar?: string };
    createdAt: string;
    parentId?: string;
    replies?: Comment[];
}

export interface CreateCommentDto {
    body: string;
    parentId?: string;
}