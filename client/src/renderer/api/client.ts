// client/src/renderer/api/client.ts
const BASE_URL = 'http://localhost:3000/api/v1';

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // 合并外部 headers（注意不要覆盖 Authorization）
    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        if (res.status === 401) {
            // Token 失效，清除本地数据（但不跳转，交给调用方处理）
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            throw new Error('登录已过期，请重新登录');
        }
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Request failed');
    }

    return res.json();
}