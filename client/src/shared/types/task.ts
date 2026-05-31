// client/src/shared/types/task.ts
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type TaskPriority = 1 | 2 | 3 | 4 | 5;

export interface Task {
    id: string;
    title: string;
    description: string;
    category?: string;
    status: TaskStatus;
    priority: number;
    reward: number;
    creatorId: string;
    assigneeId?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    deadline?: string;
}

export interface TaskListResponse {
    items: Task[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateTaskDto {
    title: string;
    description: string;
    type: string;
    budget?: number;
    category?: string;
    reward?: number;
    priority?: TaskPriority;
    tags?: string[];
    deadline?: string;
}

export interface A2ATask {
    id: string;
    title: string;
    description: string;
    status: string;
    reward: number;
    clientId: string;
    agentId?: string;
    deadline?: string;
    output?: string;
    error?: string;
    cost: number;
    createdAt: string;
    updatedAt: string;
    client?: { id: string; username: string; avatar?: string };
    agent?: { id: string; name: string };
    bids?: A2ABid[];
}

export interface A2ABid {
    id: string;
    taskId: string;
    agentId: string;
    bidAmount: number;
    estimatedDays: number;
    message?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    agent?: { id: string; name: string; owner?: { username: string } };
}

export interface A2ATaskListResponse {
    tasks: A2ATask[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateA2ATaskDto {
    title: string;
    description: string;
    reward: number;
    agentId?: string;
    deadline?: string;
}