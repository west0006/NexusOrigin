// client/src/renderer/components/ApiKeyPanel.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client.api';
import { showToast } from './Toast';
import { UserProvider } from '@shared/types';
import { C } from '../styles/theme';

export const ApiKeyPanel: React.FC = () => {
    const [providers, setProviders] = useState<UserProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ providerName: '', apiKey: '', baseUrl: '' });

    const fetchProviders = useCallback(async () => {
        try {
            const res = await apiClient<UserProvider[]>('/model-gateway/providers');
            setProviders(res);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    const addProvider = async () => {
        try {
            await apiClient('/model-gateway/providers', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            showToast('添加成功', 'success');
            setForm({ providerName: '', apiKey: '', baseUrl: '' });
            fetchProviders();
        } catch { showToast('添加失败', 'error'); }
    };

    const deleteProvider = async (id: string) => {
        try {
            await apiClient(`/model-gateway/providers/${id}`, { method: 'DELETE' });
            showToast('已删除', 'success');
            fetchProviders();
        } catch { showToast('删除失败', 'error'); }
    };

    if (loading) return <div style={{ padding: 24, color: C.textLight }}>加载中...</div>;

    return (
        <div>
            {/* 添加表单 */}
            <div className="card" style={{
                padding: 16,
                marginBottom: 16,
                background: C.cardBg,
                borderRadius: C.radiusMd,
                border: `1px solid ${C.border}`,
            }}>
                <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>添加 API Key</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                        value={form.providerName}
                        onChange={(e) => setForm(p => ({ ...p, providerName: e.target.value }))}
                        style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}
                    >
                        <option value="">选择平台</option>
                        <option value="openai">OpenAI</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="claude">Claude</option>
                        <option value="gemini">Gemini</option>
                        <option value="moonshot">Moonshot</option>
                        <option value="custom">自定义</option>
                    </select>
                    <input
                        placeholder="API Key"
                        value={form.apiKey}
                        onChange={(e) => setForm(p => ({ ...p, apiKey: e.target.value }))}
                        style={{ flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}
                    />
                    <input
                        placeholder="Base URL (可选)"
                        value={form.baseUrl}
                        onChange={(e) => setForm(p => ({ ...p, baseUrl: e.target.value }))}
                        style={{ flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13 }}
                    />
                    <button className="button button-primary" onClick={addProvider}>添加</button>
                </div>
            </div>

            {/* 列表 */}
            <div className="card" style={{ padding: 16, background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}` }}>
                <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>已配置的 API Key</h4>
                {providers.length === 0 ? (
                    <p style={{ color: C.textLight, textAlign: 'center', padding: 16 }}>暂无配置</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                        <tr style={{ borderBottom: `2px solid ${C.border}`, color: C.textSecondary }}>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>平台</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>API Key</th>
                            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Base URL</th>
                            <th style={{ textAlign: 'right', padding: '6px 4px' }}>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {providers.map(p => (
                            <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                <td style={{ padding: '6px 4px', fontWeight: 600 }}>{p.providerName}</td>
                                <td style={{ padding: '6px 4px', fontFamily: 'monospace' }}>
                                    {p.apiKeyPreview?.slice(0, 8) || p.id.slice(0, 8)}
                                </td>
                                <td style={{ padding: '6px 4px', color: C.textSecondary, fontSize: 12 }}>
                                    {p.baseUrl || '-'}
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                    <button onClick={() => deleteProvider(p.id)} style={{
                                        padding: '2px 10px', borderRadius: 4, border: `1px solid ${C.error}`,
                                        background: 'transparent', color: C.error, cursor: 'pointer', fontSize: 12,
                                    }}>删除</button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
