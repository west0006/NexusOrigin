// client/src/renderer/pages/CapabilityMarketplace.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useUserStore } from '../store/user.store';
import { FocusPanel } from '../components/FocusPanel';
import {showToast} from "@renderer/components/Toast";

interface Capability {
    id: string;
    name: string;
    description: string;
    version: string;
    price: number;
    priceType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
    protocol: string;
    framework: string;
    downloads: number;
    rating: number;
    author: { id: string; username: string };
    manifest?: any;
}

interface EnvAssessment {
    id: string;
    name: string;
    compatible: boolean;
    pythonVersion?: string;
    required?: string;
    missingDeps?: string[];
    permissions?: string[];
    warnings?: string[];
}

export const CapabilityMarketplace: React.FC = () => {
    const user = useUserStore(s => s.user);
    const [items, setItems] = useState<Capability[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [protocol, setProtocol] = useState<string>('');

    // 聚焦状态
    const [envResult, setEnvResult] = useState<EnvAssessment | null>(null);
    const [envLoading, setEnvLoading] = useState(false);
    const [focusCapId, setFocusCapId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (protocol) params.set('protocol', protocol);
        try {
            const data = await apiClient<{ items: Capability[]; total: number }>(
                `/capabilities?${params.toString()}`
            );
            setItems(data.items);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search, protocol]);

    const handleCheckEnv = async (capability: Capability) => {
        setEnvLoading(true);
        setFocusCapId(capability.id);
        try {
            const data = await apiClient<EnvAssessment>(`/capabilities/${capability.id}/check-env`);
            setEnvResult(data);
        } catch (e) {
            setEnvResult({
                id: capability.id,
                name: capability.name,
                compatible: false,
                pythonVersion: '未知',
                required: '未知',
                missingDeps: [],
                permissions: [],
                warnings: ['无法获取环境信息'],
            });
        } finally {
            setEnvLoading(false);
        }
    };

    const handleInstall = async (id: string) => {
        if (!user) return showToast('请先登录');
        try {
            await apiClient(`/capabilities/${id}/install`, { method: 'POST' });
            showToast('安装成功');
            fetchData();
        } catch (e) {
            showToast('安装失败');
        }
    };

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>能力市场</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    className="input"
                    style={{ width: 300 }}
                    placeholder="搜索能力..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select
                    className="input"
                    value={protocol}
                    onChange={e => setProtocol(e.target.value)}
                >
                    <option value="">全部</option>
                    <option value="mcp-tool">MCP 工具</option>
                    <option value="a2a-service">A2A 代理</option>
                    <option value="openclaw-native">OpenClaw 原生</option>
                </select>
            </div>

            {loading ? (
                <div>加载中...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {items.map(item => (
                        <div key={item.id} className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{item.name}</h3>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, background: 'var(--color-surface-1)', padding: '2px 6px', borderRadius: 4 }}>
                    {item.protocol}
                  </span>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            background: 'var(--color-primary-light)',
                                            color: 'var(--color-primary)',
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontWeight: 600,
                                        }}
                                    >
                    {item.priceType === 'FREE' ? '免费' : `$${item.price}`}
                  </span>
                                </div>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 12, minHeight: 40 }}>
                                {item.description}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>
                  ⭐ {item.rating.toFixed(1)} · {item.downloads}次
                </span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        className="button"
                                        style={{ fontSize: 12, padding: '2px 8px' }}
                                        onClick={() => handleCheckEnv(item)}
                                    >
                                        🔍 检查环境
                                    </button>
                                    <button
                                        className="button button-primary"
                                        onClick={() => handleInstall(item.id)}
                                        style={{ fontSize: 12 }}
                                    >
                                        安装
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
                            暂无能力上架
                        </div>
                    )}
                </div>
            )}

            {/* 聚焦面板：环境评估 */}
            <FocusPanel
                visible={!!envResult}
                title="环境评估"
                subtitle={envResult?.name}
                onClose={() => { setEnvResult(null); setFocusCapId(null); }}
            >
                {envLoading ? (
                    <div style={{ textAlign: 'center', padding: 20 }}>正在检查环境...</div>
                ) : envResult ? (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <strong>兼容性：</strong>
                            <span style={{
                                color: envResult.compatible ? 'var(--color-success)' : 'var(--color-error)',
                                fontWeight: 600,
                            }}>
                {envResult.compatible ? ' 兼容' : ' 不兼容'}
              </span>
                        </div>
                        <div><strong>需要 Python 版本：</strong> {envResult.required || '未知'}</div>
                        <div><strong>本地 Python 版本：</strong> {envResult.pythonVersion || '未知'}</div>
                        {envResult.missingDeps && envResult.missingDeps.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <strong>缺失依赖：</strong> {envResult.missingDeps.join(', ')}
                            </div>
                        )}
                        {envResult.permissions && envResult.permissions.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <strong>权限声明：</strong>
                                {envResult.permissions.map(p => (
                                    <span key={p} style={{ marginLeft: 8, color: p.includes('network') ? 'var(--color-error)' : 'inherit' }}>
                    {p}
                  </span>
                                ))}
                            </div>
                        )}
                        {envResult.warnings && envResult.warnings.length > 0 && (
                            <div style={{ marginTop: 12, padding: 8, background: 'var(--color-warning-bg)', borderRadius: 4 }}>
                                {envResult.warnings.map((w, i) => (
                                    <div key={i}>⚠️ {w}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </FocusPanel>
        </div>
    );
};