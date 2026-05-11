// ─── client/src/renderer/api/client.ts ────────────────────
const BASE_URL = 'http://localhost:3000/api/v1';

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = localStorage.getItem('accessToken');

    // 构建固定的请求头
    const customHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // 合并外部传入的 headers（假设为普通对象）
    const headers: Record<string, string> = {
        ...customHeaders,
        ...(options.headers as Record<string, string> | undefined),
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || 'Request failed');
    }

    return res.json();
}