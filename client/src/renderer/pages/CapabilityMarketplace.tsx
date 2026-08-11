// client/src/renderer/pages/CapabilityMarketplace.tsx
// 能力商店（增强版）
// - 统一极简扁平风格（C token）
// - 安装状态持久化（localStorage）
// - 集成成本估算展示
// - 环境检查面板

import React, { useEffect, useState, useCallback } from 'react';
import { C } from '../styles/theme';
import { showToast } from '../components/Toast';
import { FocusPanel } from '../components/FocusPanel';
import { Icon } from '../components/icons';
import { MOCK_CAPABILITIES } from '../data/mockCapabilities';
import { USE_MOCK } from '../config/env';

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
    estimatedCostPerCall?: number;
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

const STORAGE_KEY = 'nexus_installed_capabilities';

function getInstalledIds(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveInstalledId(id: string): void {
    const ids = getInstalledIds();
    if (!ids.includes(id)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
    }
}

const priceLabel = (p: Capability) => {
    if (p.priceType === 'FREE') return '免费';
    if (p.priceType === 'ONE_TIME') return `¥${p.price}`;
    return `¥${p.price}/月`;
};

const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: C.radiusSm, border: `1px solid ${C.border}`,
    background: C.bg, color: C.text, fontSize: 13, outline: 'none',
};

const CapabilityMarketplace: React.FC = () => {
    const [items, setItems] = useState<Capability[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [protocol, setProtocol] = useState('');

    const [installedIds, setInstalledIds] = useState<string[]>(getInstalledIds);

    // 环境检查
    const [envResult, setEnvResult] = useState<EnvAssessment | null>(null);
    const [envLoading, setEnvLoading] = useState(false);
    const [focusCapId, setFocusCapId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 350));
                let filtered = MOCK_CAPABILITIES;
                if (search) {
                    const q = search.toLowerCase();
                    filtered = filtered.filter(c =>
                        c.name.toLowerCase().includes(q) ||
                        c.description.toLowerCase().includes(q) ||
                        c.author.username.toLowerCase().includes(q)
                    );
                }
                if (protocol) {
                    filtered = filtered.filter(c => c.protocol === protocol);
                }
                setItems(filtered);
            } else {
                // 真实 API 调用路径
                const params = new URLSearchParams();
                if (search) params.set('search', search);
                if (protocol) params.set('protocol', protocol);
                const resp = await fetch(`/api/capabilities?${params.toString()}`);
                const data = await resp.json();
                setItems(data.items || []);
            }
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [search, protocol]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const handleCheckEnv = async (capability: Capability) => {
        setEnvLoading(true);
        setFocusCapId(capability.id);
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 600));
                const compatible = Math.random() > 0.3;
                setEnvResult({
                    id: capability.id,
                    name: capability.name,
                    compatible,
                    pythonVersion: compatible ? '3.11.4' : '3.9.0',
                    required: '>= 3.10',
                    missingDeps: compatible ? [] : ['pydantic>=2.0', 'httpx'],
                    permissions: ['network:outbound', 'filesystem:read'],
                    warnings: compatible ? [] : ['Python 版本低于要求，部分功能可能受限'],
                });
            } else {
                const resp = await fetch(`/api/capabilities/${capability.id}/check-env`);
                const data = await resp.json();
                setEnvResult(data);
            }
        } catch {
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

    const handleInstall = (id: string) => {
        const ids = getInstalledIds();
        if (ids.includes(id)) {
            showToast('已安装过此能力', );
            return;
        }
        saveInstalledId(id);
        setInstalledIds(getInstalledIds());
        showToast('安装成功（已保存到本地配置）', 'success');
    };

    const handleUninstall = (id: string) => {
        const ids = getInstalledIds().filter(x => x !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        setInstalledIds(ids);
        showToast('已移除', 'success');
    };

    const protocolOptions = ['', 'MCP', 'A2A', 'OpenAI', 'Custom'];

    return (
        <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
            {/* 标题 */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="skills" size={22} /> 能力商店
                </h1>
                <p style={{ margin: '4px 0 0', color: C.textSecondary, fontSize: 13 }}>
                    浏览和安装 Agent 能力扩展
                </p>
            </div>

            {/* 搜索和筛选 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <input
                        placeholder="搜索能力名称、描述、作者…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ ...inputStyle, width: '100%', paddingLeft: 32 }}
                    />
                    <span style={{ position: 'absolute', left: 10, top: 8, color: C.textLight, fontSize: 14 }}>
    <Icon name="search" size={14} />
</span>
                </div>
                <select
                    value={protocol}
                    onChange={e => setProtocol(e.target.value)}
                    style={{ ...inputStyle, minWidth: 120 }}
                >
                    {protocolOptions.map(p => (
                        <option key={p} value={p}>{p || '全部协议'}</option>
                    ))}
                </select>
            </div>

            {/* 能力列表 */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.textLight }}>加载中...</div>
            ) : items.length === 0 ? (
                <div style={{
                    background: C.cardBg, borderRadius: C.radiusMd, border: `1px solid ${C.border}`,
                    padding: 32, textAlign: 'center', color: C.textLight,
                }}>
                    暂无能力上架
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(item => {
                        const installed = installedIds.includes(item.id);
                        return (
                            <div key={item.id} style={{
                                background: C.cardBg, borderRadius: C.radiusMd,
                                border: `1px solid ${C.border}`, padding: 16,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.name}</div>
                                        <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>
                                            v{item.version} · {item.framework} · {item.protocol}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 10, fontSize: 11,
                                            background: item.priceType === 'FREE' ? C.success + '20' : C.primary + '20',
                                            color: item.priceType === 'FREE' ? C.success : C.primary,
                                            fontWeight: 500,
                                        }}>
                                            {priceLabel(item)}
                                        </span>
                                        {installed && (
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 4, fontSize: 10,
                                                background: C.success + '20', color: C.success,
                                            }}>
                                                已安装
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p style={{ fontSize: 13, color: C.textSecondary, margin: '8px 0', lineHeight: 1.5, minHeight: 36 }}>
                                    {item.description}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                    <div style={{ fontSize: 11, color: C.textLight, display: 'flex', gap: 8 }}>
                                        <span><Icon name="star" size={12} style={{ marginRight: 2 }} /> {item.rating.toFixed(1)}</span>
                                        <span><Icon name="download" size={12} style={{ marginRight: 2 }} /> {item.downloads} 次</span>
                                        {item.estimatedCostPerCall != null && (
                                            <span><Icon name="billing" size={12} style={{ marginRight: 2 }} /> ~¥{item.estimatedCostPerCall}/次</span>
                                        )}
                                        <span><Icon name="user" size={12} style={{ marginRight: 2 }} /> {item.author.username}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={() => void handleCheckEnv(item)}
                                            style={{
                                                padding: '4px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                                border: `1px solid ${C.border}`, background: 'transparent',
                                                color: C.textSecondary, cursor: 'pointer',
                                            }}
                                        >
                                            检查环境
                                        </button>
                                        {installed ? (
                                            <button
                                                onClick={() => handleUninstall(item.id)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                                    border: `1px solid ${C.error}`, background: 'transparent',
                                                    color: C.error, cursor: 'pointer',
                                                }}
                                            >
                                                移除
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleInstall(item.id)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: C.radiusSm, fontSize: 11,
                                                    border: 'none', background: C.primary,
                                                    color: C.textInverse, cursor: 'pointer', fontWeight: 500,
                                                }}
                                            >
                                                安装
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 环境检查面板 */}
            <div style={{
                position: 'fixed', top: 0, right: envResult ? 0 : '-400px',
                height: '100vh', zIndex: 1000,
                transition: 'right 300ms cubic-bezier(0.16,1,0.3,1)',
            }}>
                <FocusPanel
                    visible={!!envResult}
                    title="环境评估"
                    subtitle={envResult?.name}
                    onClose={() => { setEnvResult(null); setFocusCapId(null); }}
                >
                    {envLoading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: C.textLight }}>正在检查环境...</div>
                    ) : envResult ? (
                        <div>
                            <div style={{ marginBottom: 16 }}>
                                <strong>兼容性：</strong>
                                <span style={{
                                    color: envResult.compatible ? C.success : C.error,
                                    fontWeight: 600,
                                }}>
                                    {envResult.compatible ? ' 兼容' : ' 不兼容'}
                                </span>
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
                                <div><strong>需要 Python 版本：</strong> {envResult.required || '未知'}</div>
                                <div><strong>本地 Python 版本：</strong> {envResult.pythonVersion || '未知'}</div>
                                {envResult.missingDeps && envResult.missingDeps.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <strong>缺失依赖：</strong>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                            {envResult.missingDeps.map(d => (
                                                <span key={d} style={{
                                                    padding: '2px 6px', borderRadius: 4, fontSize: 11,
                                                    background: C.error + '15', color: C.error,
                                                }}>
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {envResult.permissions && envResult.permissions.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                        <strong>权限声明：</strong>
                                        {envResult.permissions.map(p => (
                                            <span key={p} style={{
                                                marginLeft: 8, fontSize: 12,
                                                color: p.includes('network') ? C.error : C.textSecondary,
                                            }}>
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {envResult.warnings && envResult.warnings.length > 0 && (
                                    <div style={{
                                        marginTop: 12, padding: 8, borderRadius: C.radiusSm,
                                        background: C.warning + '15',
                                    }}>
                                        {envResult.warnings.map((w, i) => (
                                            <div key={i} style={{ fontSize: 12, color: C.warning, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Icon name="warning" size={12} color={C.warning} /> {w}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </FocusPanel>
            </div>
        </div>
    );
};

export default CapabilityMarketplace;