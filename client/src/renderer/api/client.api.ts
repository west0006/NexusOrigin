
const BASE_URL = 'http://localhost:3000/api/v1';

// 刷新 token 的锁，防止并发刷新
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        return true;
    } catch {
        return false;
    }
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string,
        public details?: any,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    let res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // 401 自动刷新 token 并重试一次
    if (res.status === 401 && token) {
        if (!refreshPromise) {
            refreshPromise = refreshAccessToken();
        }
        const refreshed = await refreshPromise;
        refreshPromise = null;

        if (refreshed) {
            const newToken = localStorage.getItem('accessToken');
            headers.Authorization = `Bearer ${newToken}`;
            res = await fetch(`${BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });
        } else {
            // 刷新失败，清除登录态
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            // 触发全局登出事件，让 App 组件处理跳转
            window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }));
            throw new ApiError('登录已过期，请重新登录', 401, 'TOKEN_EXPIRED');
        }
    }

    if (!res.ok) {
        let errorBody: any;
        try {
            errorBody = await res.json();
        } catch {
            errorBody = { message: res.statusText };
        }
        throw new ApiError(
            errorBody.message || 'Request failed',
            res.status,
            errorBody.code,
            errorBody.details,
        );
    }

    return res.json();
}

// 无需认证的请求
export async function apiPublic<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new ApiError(error.message || 'Request failed', res.status);
    }

    return res.json();
}