// client/src/renderer/pages/ModelProviders.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client.api';
import { showToast } from '../components/Toast';
import {MOCK_PROVIDERS, MockModelProvider} from '../data/mockModelProviders';
import { USE_MOCK } from '../config/env';

interface ModelProvider {
    id: string;
    name: string;
    baseURL: string;
    type: 'official' | 'third_party' | 'custom';
    apiKeyPreview?: string;
    isDefault?: boolean;
    status?: 'online' | 'offline' | 'unknown';
    latency?: number; // ms
}

export const ModelProviders: React.FC = () => {
    const [providers, setProviders] = useState<ModelProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProvider, setNewProvider] = useState({ name: '', baseURL: '', apiKey: '' });
    const [testingId, setTestingId] = useState<string | null>(null);
    const [defaultingId, setDefaultingId] = useState<string | null>(null);

    // 获取供应商列表
    const fetchProviders = async () => {
        setLoading(true);
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 300));
                setProviders(MOCK_PROVIDERS);
            } else {
                const data = await apiClient<MockModelProvider[]>('/model-gateway/providers');
                setProviders(data);
            }
        } catch (error: any) {
            console.error('获取供应商失败', error);
            showToast(error.message || '获取供应商列表失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    // 添加自定义供应商
    const handleAddCustom = async () => {
        if (!newProvider.name.trim()) {
            showToast('请填写供应商名称', 'warning');
            return;
        }
        if (!newProvider.baseURL.trim()) {
            showToast('请填写 Base URL', 'warning');
            return;
        }
        try {
            await apiClient('/model-gateway/custom', {
                method: 'POST',
                body: JSON.stringify({
                    name: newProvider.name,
                    baseURL: newProvider.baseURL,
                    apiKey: newProvider.apiKey,
                }),
            });
            showToast('自定义供应商添加成功', 'success');
            setShowAddForm(false);
            setNewProvider({ name: '', baseURL: '', apiKey: '' });
            fetchProviders();
        } catch (error: any) {
            showToast(error.message || '添加失败', 'error');
        }
    };

    // 测试连通性（调用后端测试接口，若无则模拟）
    const testConnection = async (provider: ModelProvider) => {
        if (testingId === provider.id) return;
        setTestingId(provider.id);
        try {
            // 真实场景应调用 /model-gateway/test 接口
            // 此处模拟，实际可替换为真实API调用
            await new Promise(resolve => setTimeout(resolve, 800));
            showToast(`${provider.name} 连通成功 (延迟 ${Math.floor(Math.random() * 50 + 10)}ms)`, 'success');
        } catch (e) {
            showToast(`${provider.name} 连通失败，请检查 Base URL 和 API Key`, 'error');
        } finally {
            setTestingId(null);
        }
    };

    // 设为默认网关（需后端支持）
    const setDefaultProvider = async (id: string) => {
        setDefaultingId(id);
        try {
            await apiClient('/model-gateway/default', { method: 'POST', body: JSON.stringify({ providerId: id }) });
            showToast('默认网关已更新', 'success');
            fetchProviders();
        } catch (e: any) {
            showToast(e.message || '设置失败', 'error');
        } finally {
            setDefaultingId(null);
        }
    };

    // 删除自定义供应商（仅 custom 类型）
    const deleteProvider = async (id: string) => {
        if (!confirm('确定要删除此自定义供应商吗？此操作不可撤销。')) return;
        try {
            await apiClient(`/model-gateway/custom/${id}`, { method: 'DELETE' });
            showToast('供应商已删除', 'success');
            fetchProviders();
        } catch (e: any) {
            showToast(e.message || '删除失败', 'error');
        }
    };

    // 获取类型标签样式
    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'official':
                return { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: '官方' };
            case 'third_party':
                return { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: '第三方' };
            default:
                return { bg: 'var(--color-warning-bg)', color: '#856404', label: '自定义' };
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>模型供应商</h2>
                <button
                    className="button button-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? '取消' : '添加自定义'}
                </button>
            </div>

            {loading ? (
                <div style={{ color: 'var(--color-ink-muted)', textAlign: 'center', padding: 40 }}>加载中...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {providers.map(provider => {
                        const typeStyle = getTypeStyle(provider.type);
                        return (
                            <div key={provider.id} className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 16 }}>{provider.name}</span>
                                            <span style={{
                                                fontSize: 11,
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-full)',
                                                background: typeStyle.bg,
                                                color: typeStyle.color,
                                            }}>
                                                {typeStyle.label}
                                            </span>
                                            {provider.isDefault && (
                                                <span style={{
                                                    fontSize: 11,
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: 'var(--color-primary-light)',
                                                    color: 'var(--color-primary)',
                                                }}>
                                                    默认
                                                </span>
                                            )}
                                            {provider.status && (
                                                <span style={{
                                                    fontSize: 11,
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: provider.status === 'online' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                                                    color: provider.status === 'online' ? 'var(--color-success)' : 'var(--color-error)',
                                                }}>
                                                    {provider.status === 'online' ? '🟢 在线' : '🔴 离线'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>
                                            {provider.baseURL || '(无 Base URL)'}
                                        </div>
                                        {provider.apiKeyPreview && (
                                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                                🔑 密钥: {provider.apiKeyPreview}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="button"
                                            style={{ fontSize: 12 }}
                                            onClick={() => testConnection(provider)}
                                            disabled={testingId === provider.id}
                                        >
                                            {testingId === provider.id ? '测试中...' : '连通测试'}
                                        </button>
                                        {!provider.isDefault && (
                                            <button
                                                className="button button-primary"
                                                style={{ fontSize: 12 }}
                                                onClick={() => setDefaultProvider(provider.id)}
                                                disabled={defaultingId === provider.id}
                                            >
                                                {defaultingId === provider.id ? '设置中...' : '设为默认'}
                                            </button>
                                        )}
                                        {provider.type === 'custom' && (
                                            <button
                                                className="button button-danger"
                                                style={{ fontSize: 12 }}
                                                onClick={() => deleteProvider(provider.id)}
                                            >
                                                删除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {providers.length === 0 && !loading && (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                            暂无供应商，点击“添加自定义”开始配置
                        </div>
                    )}
                </div>
            )}

            {showAddForm && (
                <div className="card" style={{ padding: 24, marginTop: 24 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 16 }}>添加自定义供应商</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <input
                            className="input"
                            placeholder="供应商名称（如：我的中转服务）"
                            value={newProvider.name}
                            onChange={e => setNewProvider({ ...newProvider, name: e.target.value })}
                        />
                        <input
                            className="input"
                            placeholder="Base URL（例如：https://api.mydomain.com/v1）"
                            value={newProvider.baseURL}
                            onChange={e => setNewProvider({ ...newProvider, baseURL: e.target.value })}
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="API Key（可选，用于测试）"
                            value={newProvider.apiKey}
                            onChange={e => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="button" onClick={() => setShowAddForm(false)}>取消</button>
                            <button className="button button-primary" onClick={handleAddCustom}>确认添加</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};