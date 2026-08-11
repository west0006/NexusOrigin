// client/src/renderer/pages/Environment.tsx
// 环境与网络管理（增强版）
// - 本地运行环境状态展示
// - API Key 管理
// - 连接检测
// - 极简扁平风格

import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/icons';
import { C } from '../../styles/theme';
import { showToast } from '../../components/Toast';
import { apiClient } from '../../api/client.api';
import {useAppStore} from "@renderer/store/app";

// === Types ===
interface EnvInfo {
    pythonVersion: string;
    ollamaRunning: boolean;
    ollamaModels: string[];
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
}

interface ApiKeyEntry {
    id: string;
    provider: string;
    label: string;
    keyPreview: string;
    status: 'valid' | 'invalid' | 'unchecked';
    lastChecked: string | null;
}

// === Mock ===
const MOCK_ENV: EnvInfo = {
    pythonVersion: '3.11.4',
    ollamaRunning: true,
    ollamaModels: ['llama3.2:3b', 'qwen2.5:7b', 'nomic-embed-text:v1.5'],
    nodeVersion: '20.11.0',
    platform: 'win32',
    arch: 'x64',
    hostname: 'nexus-dev',
};

const MOCK_API_KEYS: ApiKeyEntry[] = [
    { id: 'k1', provider: 'OpenAI', label: 'GPT-4 API', keyPreview: 'sk-...f3a2', status: 'valid', lastChecked: '2026-05-30 14:23' },
    { id: 'k2', provider: 'Ollama', label: '本地 Ollama', keyPreview: '无需 Key', status: 'valid', lastChecked: null },
    { id: 'k3', provider: 'OpenAI', label: 'GPT-4o-mini 额度', keyPreview: 'sk-...b7c1', status: 'unchecked', lastChecked: null },
    { id: 'k4', provider: 'Anthropic', label: 'Claude API', keyPreview: 'sk-ant-...x9y2', status: 'invalid', lastChecked: '2026-05-28 09:15' },
];

import { USE_MOCK } from '../../config/env';

// === Styles ===
const inputBase: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: C.radiusSm,
    border: `1px solid ${C.border}`, background: C.bg,
    color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
    background: C.cardBg, borderRadius: C.radiusMd,
    border: `1px solid ${C.border}`, padding: 16, marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8,
};

const Environment: React.FC = () => {
    // === State ===
    const [envInfo, setEnvInfo] = useState<EnvInfo | null>(null);
    const [envLoading, setEnvLoading] = useState(true);
    const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>(MOCK_API_KEYS);
    const [ollamaChecking, setOllamaChecking] = useState(false);
    const [showAddKey, setShowAddKey] = useState(false);
    const [newKeyProvider, setNewKeyProvider] = useState('OpenAI');
    const [newKeyLabel, setNewKeyLabel] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');

    // === Fetch environment info ===
    useEffect(() => {
        const load = async () => {
            setEnvLoading(true);
            try {
                if (USE_MOCK) {
                    await new Promise(r => setTimeout(r, 400));
                    setEnvInfo(MOCK_ENV);
                } else {
                    const res = await apiClient<{ env: EnvInfo }>('/api/environment');
                    setEnvInfo(res.env);
                }
            } catch {
                setEnvInfo({
                    pythonVersion: '未知', ollamaRunning: false, ollamaModels: [],
                    nodeVersion: '未知', platform: '未知', arch: '未知', hostname: '未知',
                });
            } finally {
                setEnvLoading(false);
            }
        };
        void load();
    }, []);

    // === Actions ===
    const handleCheckOllama = async () => {
        setOllamaChecking(true);
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 800));
                setEnvInfo(prev => prev ? { ...prev, ollamaRunning: true, ollamaModels: ['llama3.2:3b', 'qwen2.5:7b', 'nomic-embed-text:v1.5'] } : prev);
                showToast('Ollama 服务运行正常', 'success');
            } else {
                const res = await apiClient<{ running: boolean; models: string[] }>('/api/environment/check-ollama');
                if (envInfo) {
                    setEnvInfo({ ...envInfo, ollamaRunning: res.running, ollamaModels: res.models });
                }
                showToast(res.running ? 'Ollama 运行正常' : 'Ollama 未运行', res.running ? 'success' : 'error');
            }
        } catch {
            showToast('连接检测失败', 'error');
        } finally {
            setOllamaChecking(false);
        }
    };

    const handleCheckApiKey = async (keyId: string) => {
        setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'unchecked' } : k));
        try {
            if (USE_MOCK) {
                await new Promise(r => setTimeout(r, 600));
                setApiKeys(prev => prev.map(k =>
                    k.id === keyId ? { ...k, status: 'valid', lastChecked: new Date().toLocaleString() } : k
                ));
                showToast('API Key 验证通过', 'success');
            } else {
                const res = await apiClient<{ valid: boolean }>(`/api/api-keys/${keyId}/check`);
                setApiKeys(prev => prev.map(k =>
                    k.id === keyId ? { ...k, status: res.valid ? 'valid' : 'invalid', lastChecked: new Date().toLocaleString() } : k
                ));
                showToast(res.valid ? 'API Key 有效' : 'API Key 无效', res.valid ? 'success' : 'error');
            }
        } catch {
            setApiKeys(prev => prev.map(k =>
                k.id === keyId ? { ...k, status: 'invalid', lastChecked: new Date().toLocaleString() } : k
            ));
            showToast('验证失败', 'error');
        }
    };

    const handleDeleteKey = (keyId: string) => {
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
        showToast('Key 已删除', 'success');
    };

    const handleAddKey = () => {
        if (!newKeyLabel.trim() || !newKeyValue.trim()) {
            showToast('请填写标签和 API Key', 'error');
            return;
        }
        const newKey: ApiKeyEntry = {
            id: `k-${Date.now()}`,
            provider: newKeyProvider,
            label: newKeyLabel.trim(),
            keyPreview: newKeyValue.slice(0, 6) + '...' + newKeyValue.slice(-4),
            status: 'unchecked',
            lastChecked: null,
        };
        setApiKeys(prev => [...prev, newKey]);
        setShowAddKey(false);
        setNewKeyLabel('');
        setNewKeyValue('');
        showToast('API Key 已添加', 'success');
    };

    // === Status helpers ===
    const statusBadge = (status: ApiKeyEntry['status']) => {
        const colors: Record<string, string> = {
            valid: C.success, invalid: C.error, unchecked: C.textLight,
        };
        const labels: Record<string, string> = {
            valid: '有效', invalid: '无效', unchecked: '未验证',
        };
        return (
            <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11,
                background: colors[status] + '20', color: colors[status],
                fontWeight: 500,
            }}>
                {labels[status]}
            </span>
        );
    };

    if (envLoading) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: C.textLight }}>
                加载环境信息...
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            {/* 标题 */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="environment" size={22} /> 环境与网络
                </h1>
                <p style={{ margin: '4px 0 0', color: C.textSecondary, fontSize: 13 }}>
                    管理模型提供商、API 网关和本地环境配置
                </p>
            </div>

            {/* 卡片布局 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* 1. 运行环境 */}
                <div style={cardStyle}>
                    <div style={sectionTitle}>
                        <Icon name="cpu" size={16} /> 运行环境
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ color: C.textSecondary }}>操作系统</span>
                            <span style={{ color: C.text }}>{envInfo?.platform} ({envInfo?.arch})</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ color: C.textSecondary }}>主机名</span>
                            <span style={{ color: C.text }}>{envInfo?.hostname}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ color: C.textSecondary }}>Node.js</span>
                            <span style={{ color: C.text }}>{envInfo?.nodeVersion}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ color: C.textSecondary }}>Python</span>
                            <span style={{ color: C.text }}>{envInfo?.pythonVersion}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Ollama 状态 */}
                <div style={cardStyle}>
                    <div style={sectionTitle}>
                        <Icon name="model" size={16} /> Ollama 本地模型服务
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: envInfo?.ollamaRunning ? C.success : C.error,
                        }} />
                        <span style={{ fontSize: 13, color: C.text }}>
                            {envInfo?.ollamaRunning ? '运行中' : '未运行'}
                        </span>
                        <button
                            onClick={void handleCheckOllama}
                            disabled={ollamaChecking}
                            style={{
                                padding: '4px 12px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, background: C.bg,
                                color: C.textSecondary, cursor: 'pointer', fontSize: 12,
                            }}
                        >
                            {ollamaChecking ? '检测中...' : '检测连接'}
                        </button>
                    </div>
                    {envInfo?.ollamaModels && envInfo.ollamaModels.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>已安装模型：</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {envInfo.ollamaModels.map(m => (
                                    <span key={m} style={{
                                        padding: '3px 10px', borderRadius: 12,
                                        background: C.primary + '15', color: C.primary,
                                        fontSize: 12,
                                    }}>
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {/* === 3. 框架部署 === */}
                <div style={cardStyle}>
                    <div style={sectionTitle}>
                        <Icon name="cpu" size={16} /> 框架部署
                    </div>
                    <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12, margin: '0 0 12 0' }}>
                        安装 Agent 运行框架（CrewAI / LangGraph），组件将部署到本地环境。
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => {
                                // 检查环境状态后跳转到部署页
                                if (!envInfo?.ollamaRunning) {
                                    showToast('请先确保 Ollama 服务运行中', 'warning');
                                    return;
                                }
                                useAppStore.getState().setRoute('deployment');
                            }}
                            style={{
                                padding: '6px 16px', borderRadius: C.radiusSm, border: 'none',
                                background: C.primary, color: C.textInverse, cursor: 'pointer',
                                fontSize: 13, fontWeight: 600,
                            }}
                        >
                            开始部署
                        </button>
                        <button
                            style={{
                                padding: '6px 16px', borderRadius: C.radiusSm,
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                            }}
                            onClick={() => showToast('建议先检测 Ollama 状态', )}
                        >
                            了解更多
                        </button>
                    </div>
                </div>
                {/* 3. API Key 管理 */}
                <div style={cardStyle}>
                    <div style={{ ...sectionTitle, justifyContent: 'space-between' }}>
                        <span><Icon name="key" size={16} /> API Key 管理</span>
                        <button
                            onClick={() => setShowAddKey(true)}
                            style={{
                                padding: '4px 12px', borderRadius: C.radiusSm, border: 'none',
                                background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            }}
                        >
                            + 添加 Key
                        </button>
                    </div>

                    {apiKeys.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: C.textLight, fontSize: 13 }}>
                            暂无 API Key
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {apiKeys.map(key => (
                                <div key={key.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 12px', borderRadius: C.radiusSm,
                                    background: C.bg, border: `1px solid ${C.border}`,
                                }}>
                                    <Icon name="key" size={14} style={{ color: C.textLight }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{key.label}</div>
                                        <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>
                                            {key.provider} · {key.keyPreview}
                                            {key.lastChecked && ` · 上次验证: ${key.lastChecked}`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {statusBadge(key.status)}
                                        <button
                                            onClick={() => void handleCheckApiKey(key.id)}
                                            style={{
                                                padding: '3px 8px', borderRadius: C.radiusSm,
                                                border: `1px solid ${C.border}`, background: 'transparent',
                                                color: C.textSecondary, cursor: 'pointer', fontSize: 11,
                                            }}
                                        >
                                            验证
                                        </button>
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            style={{
                                                padding: '3px 6px', borderRadius: C.radiusSm, border: 'none',
                                                background: 'transparent', color: C.textLight, cursor: 'pointer', fontSize: 11,
                                            }}
                                        >
                                            <Icon name="trash" size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 4. 连接检测 */}
                <div style={cardStyle}>
                    <div style={sectionTitle}>
                        <Icon name="network" size={16} /> 网络连接
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            { name: '本地 API 服务', url: 'http://localhost:11434', status: '可达' as const },
                            { name: 'Ollama API', url: 'http://localhost:11434', status: envInfo?.ollamaRunning ? '可达' as const : '不可达' as const },
                            { name: 'OpenAI API', url: 'https://api.openai.com', status: apiKeys.some(k => k.provider === 'OpenAI' && k.status === 'valid') ? '已配置' as const : '未配置' as const },
                        ].map((conn, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 12px', borderRadius: C.radiusSm,
                                background: C.bg, border: `1px solid ${C.border}`,
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: conn.status === '可达' || conn.status === '已配置' ? C.success : C.textLight,
                                }} />
                                <span style={{ flex: 1, fontSize: 13, color: C.text }}>{conn.name}</span>
                                <span style={{ fontSize: 11, color: C.textLight }}>{conn.url}</span>
                                <span style={{
                                    fontSize: 12,
                                    color: conn.status === '可达' || conn.status === '已配置' ? C.success : C.textLight,
                                }}>
                                    {conn.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 添加 Key 弹窗 */}
            {showAddKey && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowAddKey(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: C.cardBg, borderRadius: C.radiusMd, padding: 24,
                        width: 400, maxWidth: '90vw',
                    }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>添加 API Key</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <select
                                value={newKeyProvider}
                                onChange={e => setNewKeyProvider(e.target.value)}
                                style={inputBase}
                            >
                                <option value="OpenAI">OpenAI</option>
                                <option value="Anthropic">Anthropic</option>
                                <option value="Ollama">Ollama</option>
                                <option value="Custom">自定义</option>
                            </select>
                            <input
                                placeholder="标签（如 GPT-4 API）"
                                value={newKeyLabel}
                                onChange={e => setNewKeyLabel(e.target.value)}
                                style={inputBase}
                            />
                            <input
                                type="password"
                                placeholder="API Key"
                                value={newKeyValue}
                                onChange={e => setNewKeyValue(e.target.value)}
                                style={inputBase}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button onClick={() => setShowAddKey(false)} style={{
                                    padding: '6px 16px', borderRadius: C.radiusSm,
                                    border: `1px solid ${C.border}`, background: 'transparent',
                                    color: C.textSecondary, cursor: 'pointer', fontSize: 13,
                                }}>
                                    取消
                                </button>
                                <button onClick={handleAddKey} style={{
                                    padding: '6px 16px', borderRadius: C.radiusSm, border: 'none',
                                    background: C.primary, color: C.textInverse, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                }}>
                                    添加
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Environment;